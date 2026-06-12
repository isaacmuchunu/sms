const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// @desc    Get all teachers with filters and pagination
// @route   GET /api/v1/teachers
// @access  Admin, Teacher
exports.getTeachers = catchAsync(async (req, res) => {
  const {
    department,
    status,
    search,
    page = 1,
    limit = 10,
    sort = '-createdAt',
  } = req.query;

  const query = {};

  // Filter by department
  if (department) query.department = department;

  // Filter by status
  if (status) query.status = status;

  // Search by name, employeeId
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [teachers, total] = await Promise.all([
    Teacher.find(query)
      .populate('user', 'name email phone')
      .populate('subjects.subject', 'name code')
      .populate('subjects.class', 'name section')
      .populate('assignedClasses', 'name section')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Teacher.countDocuments(query),
  ]);

  const meta = {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit)),
  };

  return ApiResponse.success(res, { teachers, meta }, 'Teachers retrieved successfully');
});

// @desc    Get single teacher with details
// @route   GET /api/v1/teachers/:id
// @access  Admin, Teacher
exports.getTeacher = catchAsync(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id)
    .populate('user', 'name email phone')
    .populate('subjects.subject', 'name code type')
    .populate('subjects.class', 'name section')
    .populate('assignedClasses', 'name section studentsCount')
    .lean();

  if (!teacher) {
    throw new ApiError('Teacher not found', 404);
  }

  return ApiResponse.success(res, { teacher }, 'Teacher retrieved successfully');
});

// @desc    Create teacher profile
// @route   POST /api/v1/teachers
// @access  Admin
exports.createTeacher = catchAsync(async (req, res) => {
  const {
    user: userId,
    employeeId,
    firstName,
    lastName,
    department,
    designation,
    qualification,
    joiningDate,
    specialization,
    subjects = [],
    assignedClasses = [],
    phone,
    address,
    emergencyContact,
  } = req.body;

  // Check if user exists
  if (userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError('Associated user not found', 404);
    }
  }

  // Check employeeId unique
  const existing = await Teacher.findOne({ employeeId });
  if (existing) {
    throw new ApiError('Teacher with this employee ID already exists', 400);
  }

  const teacher = await Teacher.create({
    user: userId,
    employeeId,
    firstName,
    lastName,
    department,
    designation,
    qualification,
    joiningDate,
    specialization,
    subjects,
    assignedClasses,
    phone,
    address,
    emergencyContact,
  });

  const populatedTeacher = await Teacher.findById(teacher._id)
    .populate('user', 'name email phone')
    .populate('subjects.subject', 'name code')
    .populate('subjects.class', 'name section')
    .populate('assignedClasses', 'name section');

  return ApiResponse.success(
    res,
    { teacher: populatedTeacher },
    'Teacher created successfully',
    201
  );
});

// @desc    Update teacher profile
// @route   PUT /api/v1/teachers/:id
// @access  Admin
exports.updateTeacher = catchAsync(async (req, res) => {
  const {
    department,
    designation,
    qualification,
    specialization,
    subjects,
    assignedClasses,
    phone,
    address,
    status,
    emergencyContact,
  } = req.body;

  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) {
    throw new ApiError('Teacher not found', 404);
  }

  const updateData = {};
  if (department) updateData.department = department;
  if (designation) updateData.designation = designation;
  if (qualification) updateData.qualification = qualification;
  if (specialization) updateData.specialization = specialization;
  if (subjects) updateData.subjects = subjects;
  if (assignedClasses) updateData.assignedClasses = assignedClasses;
  if (phone) updateData.phone = phone;
  if (address) updateData.address = address;
  if (status) updateData.status = status;
  if (emergencyContact) updateData.emergencyContact = emergencyContact;

  const updatedTeacher = await Teacher.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  )
    .populate('user', 'name email phone')
    .populate('subjects.subject', 'name code')
    .populate('subjects.class', 'name section')
    .populate('assignedClasses', 'name section');

  return ApiResponse.success(res, { teacher: updatedTeacher }, 'Teacher updated successfully');
});

// @desc    Delete teacher (soft delete)
// @route   DELETE /api/v1/teachers/:id
// @access  Admin
exports.deleteTeacher = catchAsync(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) {
    throw new ApiError('Teacher not found', 404);
  }

  teacher.status = 'inactive';
  await teacher.save();

  return ApiResponse.success(res, null, 'Teacher deleted successfully');
});

// @desc    Assign subject to teacher
// @route   POST /api/v1/teachers/:id/assign-subject
// @access  Admin
exports.assignSubject = catchAsync(async (req, res) => {
  const { subjectId, classId, periodsPerWeek } = req.body;

  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) {
    throw new ApiError('Teacher not found', 404);
  }

  // Check if assignment already exists
  const existingAssignment = teacher.subjects.find(
    (s) => s.subject?.toString() === subjectId && s.class?.toString() === classId
  );
  if (existingAssignment) {
    throw new ApiError('Subject is already assigned to this teacher for the given class', 400);
  }

  // Add assignment
  teacher.subjects.push({
    subject: subjectId,
    class: classId,
    periodsPerWeek: periodsPerWeek || 0,
  });

  await teacher.save();

  const updatedTeacher = await Teacher.findById(teacher._id)
    .populate('subjects.subject', 'name code')
    .populate('subjects.class', 'name section');

  return ApiResponse.success(res, { teacher: updatedTeacher }, 'Subject assigned successfully');
});

// @desc    Remove subject assignment from teacher
// @route   DELETE /api/v1/teachers/:id/remove-subject
// @access  Admin
exports.removeSubject = catchAsync(async (req, res) => {
  const { subjectId, classId } = req.body;

  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) {
    throw new ApiError('Teacher not found', 404);
  }

  // Remove assignment
  teacher.subjects = teacher.subjects.filter(
    (s) => !(s.subject?.toString() === subjectId && s.class?.toString() === classId)
  );

  await teacher.save();

  const updatedTeacher = await Teacher.findById(teacher._id)
    .populate('subjects.subject', 'name code')
    .populate('subjects.class', 'name section');

  return ApiResponse.success(res, { teacher: updatedTeacher }, 'Subject removed successfully');
});

// @desc    Get teacher workload
// @route   GET /api/v1/teachers/:id/workload
// @access  Admin, Teacher
exports.getWorkload = catchAsync(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id)
    .populate('subjects.subject', 'name code')
    .populate('subjects.class', 'name section')
    .lean();

  if (!teacher) {
    throw new ApiError('Teacher not found', 404);
  }

  // Calculate periods per week from assignments
  const workload = {
    totalPeriodsPerWeek: 0,
    assignments: [],
  };

  if (teacher.subjects && teacher.subjects.length > 0) {
    teacher.subjects.forEach((assignment) => {
      const periods = assignment.periodsPerWeek || 0;
      workload.totalPeriodsPerWeek += periods;
      workload.assignments.push({
        subject: assignment.subject,
        class: assignment.class,
        periodsPerWeek: periods,
      });
    });
  }

  // Add class teacher workload (if assigned as class teacher)
  const classTeacherAssignments = await Class.find({
    classTeacher: teacher._id,
  }).select('name section');

  workload.classTeacherOf = classTeacherAssignments;
  workload.totalClassesAsClassTeacher = classTeacherAssignments.length;

  return ApiResponse.success(res, { workload }, 'Workload retrieved successfully');
});
