const Student = require('../models/Student');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const FeePayment = require('../models/FeePayment');
const FeeStructure = require('../models/FeeStructure');
const Mark = require('../models/Mark');
const Exam = require('../models/Exam');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// @desc    Get all students with filters and pagination
// @route   GET /api/v1/students
// @access  Admin, Teacher
exports.getStudents = catchAsync(async (req, res) => {
  const {
    class: classId,
    section,
    status,
    search,
    page = 1,
    limit = 10,
    sort = '-createdAt',
  } = req.query;

  const query = {};

  // Filter by class
  if (classId) query.currentClass = classId;

  // Filter by section
  if (section) query.section = section;

  // Filter by status
  if (status) query.status = status;

  // Search by name, admissionNo, rollNo, fatherName
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { admissionNo: { $regex: search, $options: 'i' } },
      { rollNo: { $regex: search, $options: 'i' } },
      { fatherName: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [students, total] = await Promise.all([
    Student.find(query)
      .populate('currentClass', 'name section')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Student.countDocuments(query),
  ]);

  const meta = {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit)),
  };

  return ApiResponse.success(res, { students, meta }, 'Students retrieved successfully');
});

// @desc    Get single student with details
// @route   GET /api/v1/students/:id
// @access  Admin, Teacher
exports.getStudent = catchAsync(async (req, res) => {
  const student = await Student.findById(req.params.id)
    .populate('currentClass', 'name section classTeacher')
    .lean();

  if (!student) {
    throw new ApiError('Student not found', 404);
  }

  // Get attendance summary
  const attendanceSummary = await Attendance.aggregate([
    { $match: { student: student._id } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const attendanceStats = {
    present: attendanceSummary.find((a) => a._id === 'present')?.count || 0,
    absent: attendanceSummary.find((a) => a._id === 'absent')?.count || 0,
    late: attendanceSummary.find((a) => a._id === 'late')?.count || 0,
    halfDay: attendanceSummary.find((a) => a._id === 'halfDay')?.count || 0,
    total: attendanceSummary.reduce((sum, a) => sum + a.count, 0),
  };

  // Get fee summary
  const feePayments = await FeePayment.find({ student: student._id }).lean();
  const feeSummary = {
    totalPaid: feePayments
      .filter((f) => f.status === 'paid')
      .reduce((sum, f) => sum + f.amount, 0),
    totalPending: feePayments
      .filter((f) => f.status === 'pending')
      .reduce((sum, f) => sum + f.amount, 0),
  };

  return ApiResponse.success(
    res,
    { student, attendanceSummary: attendanceStats, feeSummary },
    'Student retrieved successfully'
  );
});

// @desc    Create new student
// @route   POST /api/v1/students
// @access  Admin
exports.createStudent = catchAsync(async (req, res) => {
  const { admissionNo, currentClass, ...studentData } = req.body;

  // Validate admission number unique
  const existingStudent = await Student.findOne({ admissionNo });
  if (existingStudent) {
    throw new ApiError('Student with this admission number already exists', 400);
  }

  // Create student
  const student = await Student.create({
    admissionNo,
    currentClass,
    ...studentData,
  });

  // Increment class studentsCount
  if (currentClass) {
    await Class.findByIdAndUpdate(currentClass, { $inc: { studentsCount: 1 } });
  }

  const populatedStudent = await Student.findById(student._id)
    .populate('currentClass', 'name section')
    .lean();

  return ApiResponse.success(res, { student: populatedStudent }, 'Student created successfully', 201);
});

// @desc    Update student
// @route   PUT /api/v1/students/:id
// @access  Admin
exports.updateStudent = catchAsync(async (req, res) => {
  const { currentClass: newClassId, ...updateData } = req.body;

  const student = await Student.findById(req.params.id);
  if (!student) {
    throw new ApiError('Student not found', 404);
  }

  const oldClassId = student.currentClass;

  // Handle class change
  if (newClassId && oldClassId && oldClassId.toString() !== newClassId) {
    // Decrement old class count
    await Class.findByIdAndUpdate(oldClassId, { $inc: { studentsCount: -1 } });
    // Increment new class count
    await Class.findByIdAndUpdate(newClassId, { $inc: { studentsCount: 1 } });
  }

  // Update student
  const updatedStudent = await Student.findByIdAndUpdate(
    req.params.id,
    { ...updateData, currentClass: newClassId || oldClassId },
    { new: true, runValidators: true }
  ).populate('currentClass', 'name section');

  return ApiResponse.success(res, { student: updatedStudent }, 'Student updated successfully');
});

// @desc    Delete student (soft delete)
// @route   DELETE /api/v1/students/:id
// @access  Admin
exports.deleteStudent = catchAsync(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) {
    throw new ApiError('Student not found', 404);
  }

  // Soft delete - set status to inactive
  student.status = 'inactive';
  await student.save();

  // Decrement class count
  if (student.currentClass) {
    await Class.findByIdAndUpdate(student.currentClass, { $inc: { studentsCount: -1 } });
  }

  return ApiResponse.success(res, null, 'Student deleted successfully');
});

// @desc    Search students
// @route   GET /api/v1/students/search
// @access  Admin, Teacher
exports.searchStudents = catchAsync(async (req, res) => {
  const { q, page = 1, limit = 10 } = req.query;

  if (!q || q.trim().length < 2) {
    throw new ApiError('Search query must be at least 2 characters', 400);
  }

  const searchQuery = {
    $or: [
      { firstName: { $regex: q, $options: 'i' } },
      { lastName: { $regex: q, $options: 'i' } },
      { admissionNo: { $regex: q, $options: 'i' } },
      { rollNo: { $regex: q, $options: 'i' } },
      { fatherName: { $regex: q, $options: 'i' } },
    ],
  };

  const skip = (Number(page) - 1) * Number(limit);

  const [students, total] = await Promise.all([
    Student.find(searchQuery)
      .populate('currentClass', 'name section')
      .sort('firstName')
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Student.countDocuments(searchQuery),
  ]);

  const meta = {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit)),
  };

  return ApiResponse.success(res, { students, meta }, 'Search results retrieved');
});

// @desc    Get students by class
// @route   GET /api/v1/students/class/:classId
// @access  Admin, Teacher
exports.getStudentsByClass = catchAsync(async (req, res) => {
  const { classId } = req.params;
  const { page = 1, limit = 50, sort = 'rollNo' } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  const [students, total] = await Promise.all([
    Student.find({ currentClass: classId, status: 'active' })
      .populate('currentClass', 'name section')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Student.countDocuments({ currentClass: classId, status: 'active' }),
  ]);

  const meta = {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit)),
  };

  return ApiResponse.success(res, { students, meta }, 'Students retrieved by class');
});

// @desc    Get student attendance
// @route   GET /api/v1/students/:id/attendance
// @access  Admin, Teacher
exports.getStudentAttendance = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate, page = 1, limit = 30 } = req.query;

  const query = { student: id };
  if (startDate && endDate) {
    query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [records, total] = await Promise.all([
    Attendance.find(query)
      .populate('class', 'name section')
      .sort('-date')
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Attendance.countDocuments(query),
  ]);

  const meta = {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit)),
  };

  return ApiResponse.success(res, { attendance: records, meta }, 'Attendance records retrieved');
});

// @desc    Get student fee payments
// @route   GET /api/v1/students/:id/fees
// @access  Admin, Teacher
exports.getStudentFees = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, page = 1, limit = 20 } = req.query;

  const query = { student: id };
  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [payments, total] = await Promise.all([
    FeePayment.find(query)
      .sort('-paymentDate')
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    FeePayment.countDocuments(query),
  ]);

  const meta = {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit)),
  };

  return ApiResponse.success(res, { payments, meta }, 'Fee payments retrieved');
});

// @desc    Get student exam results
// @route   GET /api/v1/students/:id/results
// @access  Admin, Teacher
exports.getStudentResults = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { exam, page = 1, limit = 20 } = req.query;

  const query = { student: id };
  if (exam) query.exam = exam;

  const skip = (Number(page) - 1) * Number(limit);

  const [marks, total] = await Promise.all([
    Mark.find(query)
      .populate('exam', 'name type examDate')
      .populate('subject', 'name code')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Mark.countDocuments(query),
  ]);

  const meta = {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit)),
  };

  return ApiResponse.success(res, { marks, meta }, 'Student results retrieved');
});

// @desc    Bulk import students
// @route   POST /api/v1/students/bulk-import
// @access  Admin
exports.bulkImport = catchAsync(async (req, res) => {
  const { students } = req.body;

  if (!Array.isArray(students) || students.length === 0) {
    throw new ApiError('Please provide an array of students', 400);
  }

  const results = {
    success: [],
    errors: [],
    inserted: 0,
    failed: 0,
  };

  // Validate each student
  for (let i = 0; i < students.length; i++) {
    const studentData = students[i];

    try {
      // Check required fields
      if (!studentData.admissionNo || !studentData.firstName || !studentData.lastName) {
        throw new Error('Missing required fields: admissionNo, firstName, lastName');
      }

      // Check duplicate admissionNo in existing database
      const existing = await Student.findOne({ admissionNo: studentData.admissionNo });
      if (existing) {
        throw new Error(`Student with admissionNo ${studentData.admissionNo} already exists`);
      }

      // Check duplicate in batch
      const duplicateInBatch = students.findIndex(
        (s, idx) => idx < i && s.admissionNo === studentData.admissionNo
      );
      if (duplicateInBatch !== -1) {
        throw new Error(`Duplicate admissionNo in batch at row ${duplicateInBatch + 1}`);
      }

      results.success.push(studentData);
    } catch (error) {
      results.errors.push({ index: i, admissionNo: studentData.admissionNo, error: error.message });
      results.failed++;
    }
  }

  // Insert valid students
  if (results.success.length > 0) {
    const insertedStudents = await Student.insertMany(results.success, { ordered: false });
    results.inserted = insertedStudents.length;

    // Update class counts
    const classCounts = {};
    results.success.forEach((s) => {
      if (s.currentClass) {
        classCounts[s.currentClass] = (classCounts[s.currentClass] || 0) + 1;
      }
    });

    for (const [classId, count] of Object.entries(classCounts)) {
      await Class.findByIdAndUpdate(classId, { $inc: { studentsCount: count } });
    }
  }

  return ApiResponse.success(
    res,
    { results },
    `Bulk import completed: ${results.inserted} inserted, ${results.failed} failed`,
    results.failed > 0 ? 207 : 201
  );
});
