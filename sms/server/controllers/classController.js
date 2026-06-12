const Class = require('../models/Class');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// @desc    Get all classes with pagination
// @route   GET /api/v1/classes
// @access  Admin, Teacher
exports.getClasses = catchAsync(async (req, res) => {
  const {
    search,
    page = 1,
    limit = 20,
    sort = 'name section',
  } = req.query;

  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { section: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [classes, total] = await Promise.all([
    Class.find(query)
      .populate('classTeacher', 'firstName lastName employeeId')
      .populate('subjects.subject', 'name code')
      .populate('subjects.teacher', 'firstName lastName')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Class.countDocuments(query),
  ]);

  const meta = {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit)),
  };

  return ApiResponse.success(res, { classes, meta }, 'Classes retrieved successfully');
});

// @desc    Get single class with details
// @route   GET /api/v1/classes/:id
// @access  Admin, Teacher
exports.getClass = catchAsync(async (req, res) => {
  const classData = await Class.findById(req.params.id)
    .populate('classTeacher', 'firstName lastName employeeId')
    .populate('subjects.subject', 'name code type')
    .populate('subjects.teacher', 'firstName lastName')
    .lean();

  if (!classData) {
    throw new ApiError('Class not found', 404);
  }

  // Get students in class
  const students = await Student.find({ currentClass: classData._id, status: 'active' })
    .select('firstName lastName rollNo admissionNo gender')
    .sort('rollNo')
    .lean();

  // Get timetable entries
  const timetable = classData.timetable || [];

  return ApiResponse.success(
    res,
    { class: classData, students, timetable },
    'Class retrieved successfully'
  );
});

// @desc    Create new class-section
// @route   POST /api/v1/classes
// @access  Admin
exports.createClass = catchAsync(async (req, res) => {
  const {
    name,
    section,
    classTeacher,
    capacity,
    subjects = [],
    timetable = [],
    roomNumber,
    academicYear,
  } = req.body;

  // Check if class-section already exists
  const existing = await Class.findOne({ name, section, academicYear });
  if (existing) {
    throw new ApiError(`Class ${name} Section ${section} already exists for ${academicYear}`, 400);
  }

  const newClass = await Class.create({
    name,
    section,
    classTeacher,
    capacity: capacity || 50,
    subjects,
    timetable,
    roomNumber,
    academicYear,
  });

  const populatedClass = await Class.findById(newClass._id)
    .populate('classTeacher', 'firstName lastName employeeId')
    .populate('subjects.subject', 'name code');

  return ApiResponse.success(
    res,
    { class: populatedClass },
    'Class created successfully',
    201
  );
});

// @desc    Update class
// @route   PUT /api/v1/classes/:id
// @access  Admin
exports.updateClass = catchAsync(async (req, res) => {
  const {
    classTeacher,
    capacity,
    subjects,
    timetable,
    roomNumber,
    status,
  } = req.body;

  const classData = await Class.findById(req.params.id);
  if (!classData) {
    throw new ApiError('Class not found', 404);
  }

  const updateData = {};
  if (classTeacher) updateData.classTeacher = classTeacher;
  if (capacity) updateData.capacity = capacity;
  if (subjects) updateData.subjects = subjects;
  if (timetable) updateData.timetable = timetable;
  if (roomNumber) updateData.roomNumber = roomNumber;
  if (status) updateData.status = status;

  const updatedClass = await Class.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  )
    .populate('classTeacher', 'firstName lastName employeeId')
    .populate('subjects.subject', 'name code')
    .populate('subjects.teacher', 'firstName lastName');

  return ApiResponse.success(res, { class: updatedClass }, 'Class updated successfully');
});

// @desc    Delete class (archive if students exist)
// @route   DELETE /api/v1/classes/:id
// @access  Admin
exports.deleteClass = catchAsync(async (req, res) => {
  const classData = await Class.findById(req.params.id);
  if (!classData) {
    throw new ApiError('Class not found', 404);
  }

  // Check if students exist in class
  const studentCount = await Student.countDocuments({
    currentClass: classData._id,
    status: 'active',
  });

  if (studentCount > 0) {
    // Archive the class instead of hard delete
    classData.status = 'archived';
    await classData.save();
    return ApiResponse.success(
      res,
      null,
      `Class archived successfully (had ${studentCount} active students)`
    );
  }

  // Hard delete if no students
  await Class.findByIdAndDelete(req.params.id);

  return ApiResponse.success(res, null, 'Class deleted successfully');
});

// @desc    Add student to class
// @route   POST /api/v1/classes/:id/add-student
// @access  Admin
exports.addStudent = catchAsync(async (req, res) => {
  const { studentId } = req.body;

  const classData = await Class.findById(req.params.id);
  if (!classData) {
    throw new ApiError('Class not found', 404);
  }

  // Check capacity
  if (classData.studentsCount >= classData.capacity) {
    throw new ApiError('Class has reached its capacity', 400);
  }

  // Update student's class
  const student = await Student.findByIdAndUpdate(
    studentId,
    { currentClass: classData._id },
    { new: true }
  );

  if (!student) {
    throw new ApiError('Student not found', 404);
  }

  // Increment class count
  classData.studentsCount += 1;
  await classData.save();

  const updatedClass = await Class.findById(classData._id)
    .populate('classTeacher', 'firstName lastName employeeId');

  return ApiResponse.success(res, { class: updatedClass, student }, 'Student added to class');
});

// @desc    Remove student from class
// @route   POST /api/v1/classes/:id/remove-student
// @access  Admin
exports.removeStudent = catchAsync(async (req, res) => {
  const { studentId } = req.body;

  const classData = await Class.findById(req.params.id);
  if (!classData) {
    throw new ApiError('Class not found', 404);
  }

  // Update student - remove from class
  const student = await Student.findByIdAndUpdate(
    studentId,
    { currentClass: null },
    { new: true }
  );

  if (!student) {
    throw new ApiError('Student not found', 404);
  }

  // Decrement class count
  if (classData.studentsCount > 0) {
    classData.studentsCount -= 1;
    await classData.save();
  }

  const updatedClass = await Class.findById(classData._id)
    .populate('classTeacher', 'firstName lastName employeeId');

  return ApiResponse.success(
    res,
    { class: updatedClass, student },
    'Student removed from class'
  );
});

// @desc    Get class timetable
// @route   GET /api/v1/classes/:id/timetable
// @access  Admin, Teacher
exports.getTimetable = catchAsync(async (req, res) => {
  const classData = await Class.findById(req.params.id)
    .select('timetable name section')
    .populate('timetable.subject', 'name code')
    .populate('timetable.teacher', 'firstName lastName')
    .lean();

  if (!classData) {
    throw new ApiError('Class not found', 404);
  }

  return ApiResponse.success(
    res,
    { timetable: classData.timetable || [], className: classData.name, section: classData.section },
    'Timetable retrieved successfully'
  );
});

// @desc    Update class timetable
// @route   PUT /api/v1/classes/:id/timetable
// @access  Admin
exports.updateTimetable = catchAsync(async (req, res) => {
  const { timetable } = req.body;

  if (!Array.isArray(timetable)) {
    throw new ApiError('Timetable must be an array', 400);
  }

  const classData = await Class.findById(req.params.id);
  if (!classData) {
    throw new ApiError('Class not found', 404);
  }

  classData.timetable = timetable;
  await classData.save();

  const updatedClass = await Class.findById(classData._id)
    .select('timetable name section')
    .populate('timetable.subject', 'name code')
    .populate('timetable.teacher', 'firstName lastName');

  return ApiResponse.success(
    res,
    { timetable: updatedClass.timetable },
    'Timetable updated successfully'
  );
});
