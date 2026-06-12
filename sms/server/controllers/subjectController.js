const Subject = require('../models/Subject');
const Class = require('../models/Class');
const Exam = require('../models/Exam');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// @desc    Get all subjects with filters
// @route   GET /api/v1/subjects
// @access  Admin, Teacher
exports.getSubjects = catchAsync(async (req, res) => {
  const {
    type,
    search,
    page = 1,
    limit = 20,
    sort = 'name',
  } = req.query;

  const query = {};

  // Filter by type
  if (type) query.type = type;

  // Search by name or code
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [subjects, total] = await Promise.all([
    Subject.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Subject.countDocuments(query),
  ]);

  const meta = {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit)),
  };

  return ApiResponse.success(res, { subjects, meta }, 'Subjects retrieved successfully');
});

// @desc    Get single subject with applicable classes
// @route   GET /api/v1/subjects/:id
// @access  Admin, Teacher
exports.getSubject = catchAsync(async (req, res) => {
  const subject = await Subject.findById(req.params.id).lean();

  if (!subject) {
    throw new ApiError('Subject not found', 404);
  }

  // Find classes that have this subject allocated
  const applicableClasses = await Class.find({
    'subjects.subject': subject._id,
  })
    .select('name section')
    .lean();

  return ApiResponse.success(
    res,
    { subject, applicableClasses },
    'Subject retrieved successfully'
  );
});

// @desc    Create new subject
// @route   POST /api/v1/subjects
// @access  Admin
exports.createSubject = catchAsync(async (req, res) => {
  const {
    name,
    code,
    type,
    description,
    maxMarks,
    passMarks,
    passingMarks,
    isOptional,
    credits,
  } = req.body;

  // Check if subject code already exists
  const existing = await Subject.findOne({ code });
  if (existing) {
    throw new ApiError('Subject with this code already exists', 400);
  }

  const subject = await Subject.create({
    name,
    code,
    type: type || 'core',
    description,
    maxMarks,
    passingMarks: passingMarks ?? passMarks,
    isOptional: isOptional || false,
    credits,
  });

  return ApiResponse.success(res, { subject }, 'Subject created successfully', 201);
});

// @desc    Update subject
// @route   PUT /api/v1/subjects/:id
// @access  Admin
exports.updateSubject = catchAsync(async (req, res) => {
  const {
    name,
    code,
    type,
    description,
    maxMarks,
    passMarks,
    passingMarks,
    isOptional,
    credits,
    status,
  } = req.body;

  const subject = await Subject.findById(req.params.id);
  if (!subject) {
    throw new ApiError('Subject not found', 404);
  }

  const updateData = {};
  if (name) updateData.name = name;
  if (code) updateData.code = code;
  if (type) updateData.type = type;
  if (description !== undefined) updateData.description = description;
  if (maxMarks) updateData.maxMarks = maxMarks;
  if (passMarks || passingMarks) updateData.passingMarks = passingMarks ?? passMarks;
  if (isOptional !== undefined) updateData.isOptional = isOptional;
  if (credits) updateData.credits = credits;
  if (status) updateData.status = status;

  const updatedSubject = await Subject.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );

  return ApiResponse.success(res, { subject: updatedSubject }, 'Subject updated successfully');
});

// @desc    Delete subject (soft delete - check if used)
// @route   DELETE /api/v1/subjects/:id
// @access  Admin
exports.deleteSubject = catchAsync(async (req, res) => {
  const subject = await Subject.findById(req.params.id);
  if (!subject) {
    throw new ApiError('Subject not found', 404);
  }

  // Check if subject is used in any class
  const classesUsingSubject = await Class.countDocuments({
    'subjects.subject': subject._id,
  });

  if (classesUsingSubject > 0) {
    throw new ApiError(
      `Cannot delete subject. It is allocated to ${classesUsingSubject} class(es).`,
      400
    );
  }

  // Check if subject is used in any exam
  const examsUsingSubject = await Exam.countDocuments({
    'subjects.subject': subject._id,
  });

  if (examsUsingSubject > 0) {
    throw new ApiError(
      `Cannot delete subject. It is used in ${examsUsingSubject} exam(s).`,
      400
    );
  }

  // Soft delete
  subject.status = 'inactive';
  await subject.save();

  return ApiResponse.success(res, null, 'Subject deleted successfully');
});

// @desc    Allocate subject to a class with teacher and periods
// @route   POST /api/v1/subjects/:id/allocate
// @access  Admin
exports.allocateToClass = catchAsync(async (req, res) => {
  const { classId, teacherId, periodsPerWeek } = req.body;
  const subjectId = req.params.id;

  const [subject, classData] = await Promise.all([
    Subject.findById(subjectId),
    Class.findById(classId),
  ]);

  if (!subject) {
    throw new ApiError('Subject not found', 404);
  }

  if (!classData) {
    throw new ApiError('Class not found', 404);
  }

  // Check if subject is already allocated to this class
  const existingAllocation = classData.subjects.find(
    (s) => s.subject?.toString() === subjectId
  );

  if (existingAllocation) {
    // Update existing allocation
    existingAllocation.teacher = teacherId || existingAllocation.teacher;
    existingAllocation.periodsPerWeek = periodsPerWeek || existingAllocation.periodsPerWeek;
  } else {
    // Add new allocation
    classData.subjects.push({
      subject: subjectId,
      teacher: teacherId,
      periodsPerWeek: periodsPerWeek || 0,
    });
  }

  await classData.save();

  const updatedClass = await Class.findById(classId)
    .populate('subjects.subject', 'name code')
    .populate('subjects.teacher', 'firstName lastName');

  return ApiResponse.success(
    res,
    { class: updatedClass },
    'Subject allocated to class successfully'
  );
});
