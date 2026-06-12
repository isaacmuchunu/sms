const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const User = require('../models/User');
const crypto = require('crypto');
const mongoose = require('mongoose');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

const normalizeToken = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const departmentMap = {
  social_science: 'social_studies',
  social_studies: 'social_studies',
  physical_education: 'physical_education',
  computer: 'computer',
  science: 'science',
  mathematics: 'mathematics',
  english: 'english',
  hindi: 'languages',
  languages: 'languages',
  arts: 'arts',
};

const designationMap = {
  principal: 'principal',
  vice_principal: 'vice_principal',
  head_of_department: 'hod',
  hod: 'hod',
  senior_teacher: 'senior_teacher',
  teacher: 'teacher',
  assistant_teacher: 'teacher',
  librarian: 'teacher',
  lab_assistant: 'lab_assistant',
};

const normalizeDepartment = (value) => departmentMap[normalizeToken(value)] || normalizeToken(value);
const normalizeDesignation = (value) => designationMap[normalizeToken(value)] || normalizeToken(value) || 'teacher';

const splitName = (name, firstName, lastName) => {
  if (firstName || lastName) {
    return { firstName, lastName };
  }

  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts.shift() || '',
    lastName: parts.join(' ') || '',
  };
};

const toObjectIds = (values = []) =>
  values.filter((value) => mongoose.Types.ObjectId.isValid(value));

const toQualificationDocs = (qualifications, qualification) => {
  const items = Array.isArray(qualifications)
    ? qualifications
    : qualification
      ? [qualification]
      : [];

  return items
    .filter(Boolean)
    .map((item) => {
      if (typeof item === 'object') {
        return item;
      }
      return {
        degree: item,
        institution: 'Not specified',
        year: new Date().getFullYear(),
      };
    });
};

const toSubjectAssignments = (subjects = []) =>
  subjects
    .map((item) => {
      if (typeof item === 'string') {
        return mongoose.Types.ObjectId.isValid(item) ? { subject: item } : null;
      }
      return item;
    })
    .filter((item) => item?.subject && mongoose.Types.ObjectId.isValid(item.subject));

const toSalary = (body) => ({
  base: Number(body.baseSalary ?? body.salary?.base ?? 0),
  da: Number(body.da ?? body.salary?.da ?? 0),
  hra: Number(body.hra ?? body.salary?.hra ?? 0),
  ta: Number(body.ta ?? body.salary?.ta ?? 0),
});

const publicTeacher = (teacher) => ({
  ...teacher,
  name: teacher.name || [teacher.firstName, teacher.lastName].filter(Boolean).join(' ') || teacher.user?.name,
  email: teacher.user?.email,
  phone: teacher.phone || teacher.user?.phone,
  subjects: Array.isArray(teacher.subjects)
    ? teacher.subjects.map((assignment) => assignment.subject?.name || assignment.subject?.code).filter(Boolean)
    : [],
});

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
      .lean({ virtuals: true }),
    Teacher.countDocuments(query),
  ]);

  const meta = {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit)),
  };

  return ApiResponse.success(res, { teachers: teachers.map(publicTeacher), meta }, 'Teachers retrieved successfully');
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
    .lean({ virtuals: true });

  if (!teacher) {
    throw new ApiError('Teacher not found', 404);
  }

  return ApiResponse.success(res, { teacher: publicTeacher(teacher) }, 'Teacher retrieved successfully');
});

// @desc    Create teacher profile
// @route   POST /api/v1/teachers
// @access  Admin
exports.createTeacher = catchAsync(async (req, res) => {
  const {
    user: userId,
    name,
    email,
    employeeId,
    firstName,
    lastName,
    department,
    designation,
    qualifications,
    qualification,
    joiningDate,
    specialization,
    subjects = [],
    assignedClasses = [],
    baseSalary,
    da,
    hra,
    ta,
    salary,
    phone,
    address,
    emergencyContact,
  } = req.body;

  const names = splitName(name, firstName, lastName);

  // Check if user exists
  let linkedUserId = userId;
  let temporaryPassword = null;
  if (userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError('Associated user not found', 404);
    }
  } else {
    if (!email || !name) {
      throw new ApiError('Teacher name and email are required when no user is provided', 400);
    }

    let linkedUser = await User.findOne({ email });
    if (!linkedUser) {
      temporaryPassword = `T-${crypto.randomBytes(12).toString('hex')}a1`;
      linkedUser = await User.create({
        name,
        email,
        password: temporaryPassword,
        role: 'teacher',
        phone,
        address,
        status: 'active',
      });
    }
    linkedUserId = linkedUser._id;
  }

  // Check employeeId unique
  const existing = await Teacher.findOne({ employeeId });
  if (existing) {
    throw new ApiError('Teacher with this employee ID already exists', 400);
  }

  const teacher = await Teacher.create({
    user: linkedUserId,
    employeeId,
    firstName: names.firstName,
    lastName: names.lastName,
    department: normalizeDepartment(department),
    designation: normalizeDesignation(designation),
    qualifications: toQualificationDocs(qualifications, qualification),
    joiningDate: joiningDate || new Date(),
    specialization,
    subjects: toSubjectAssignments(subjects),
    assignedClasses: toObjectIds(assignedClasses),
    salary: salary || toSalary({ baseSalary, da, hra, ta }),
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
    { teacher: publicTeacher(populatedTeacher.toObject({ virtuals: true })), temporaryPassword },
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
    qualifications,
    qualification,
    specialization,
    subjects,
    assignedClasses,
    phone,
    address,
    status,
    emergencyContact,
    baseSalary,
    da,
    hra,
    ta,
    salary,
  } = req.body;

  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) {
    throw new ApiError('Teacher not found', 404);
  }

  const updateData = {};
  if (department) updateData.department = normalizeDepartment(department);
  if (designation) updateData.designation = normalizeDesignation(designation);
  if (qualification || qualifications) updateData.qualifications = toQualificationDocs(qualifications, qualification);
  if (specialization) updateData.specialization = specialization;
  if (subjects) updateData.subjects = toSubjectAssignments(subjects);
  if (assignedClasses) updateData.assignedClasses = toObjectIds(assignedClasses);
  if (baseSalary || da || hra || ta || salary) updateData.salary = salary || toSalary({ baseSalary, da, hra, ta, salary: teacher.salary });
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

  return ApiResponse.success(
    res,
    { teacher: publicTeacher(updatedTeacher.toObject({ virtuals: true })) },
    'Teacher updated successfully'
  );
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
