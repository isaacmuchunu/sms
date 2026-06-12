const FeeHead = require('../models/FeeHead');
const FeeStructure = require('../models/FeeStructure');
const FeePayment = require('../models/FeePayment');
const Student = require('../models/Student');
const Class = require('../models/Class');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// ── Fee Heads ──────────────────────────────────────────────

// @desc    Get all fee heads
// @route   GET /api/v1/fees/heads
// @access  Admin
exports.getFeeHeads = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const query = {};
  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [feeHeads, total] = await Promise.all([
    FeeHead.find(query).sort('name').skip(skip).limit(Number(limit)).lean(),
    FeeHead.countDocuments(query),
  ]);

  const meta = {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit)),
  };

  return ApiResponse.success(res, { feeHeads, meta }, 'Fee heads retrieved');
});

// @desc    Create fee head
// @route   POST /api/v1/fees/heads
// @access  Admin
exports.createFeeHead = catchAsync(async (req, res) => {
  const { name, description, category, isRefundable, status } = req.body;

  const feeHead = await FeeHead.create({
    name,
    description,
    category: category || 'tuition',
    isRefundable: isRefundable || false,
    status: status || 'active',
  });

  return ApiResponse.success(res, { feeHead }, 'Fee head created', 201);
});

// @desc    Update fee head
// @route   PUT /api/v1/fees/heads/:id
// @access  Admin
exports.updateFeeHead = catchAsync(async (req, res) => {
  const { name, description, category, isRefundable, status } = req.body;

  const feeHead = await FeeHead.findById(req.params.id);
  if (!feeHead) {
    throw new ApiError('Fee head not found', 404);
  }

  const updateData = {};
  if (name) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (category) updateData.category = category;
  if (isRefundable !== undefined) updateData.isRefundable = isRefundable;
  if (status) updateData.status = status;

  const updatedFeeHead = await FeeHead.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );

  return ApiResponse.success(res, { feeHead: updatedFeeHead }, 'Fee head updated');
});

// ── Fee Structure ──────────────────────────────────────────

// @desc    Get fee structure for a class + academic year
// @route   GET /api/v1/fees/structure
// @access  Admin
exports.getFeeStructure = catchAsync(async (req, res) => {
  const { classId, academicYear } = req.query;

  if (!classId || !academicYear) {
    throw new ApiError('Class ID and academic year are required', 400);
  }

  const feeStructure = await FeeStructure.findOne({ class: classId, academicYear })
    .populate('class', 'name section')
    .populate('feeHeads.feeHead', 'name description category')
    .lean();

  if (!feeStructure) {
    return ApiResponse.success(res, { feeStructure: null, feeHeads: [] }, 'No fee structure found');
  }

  return ApiResponse.success(res, { feeStructure }, 'Fee structure retrieved');
});

// @desc    Set fee structure
// @route   POST /api/v1/fees/structure
// @access  Admin
exports.setFeeStructure = catchAsync(async (req, res) => {
  const classId = req.body.classId || req.body.class;
  const academicYear = req.body.academicYear || new Date().getFullYear().toString();
  const feeHeads = req.body.feeHeads || req.body.fees;
  const { totalAmount } = req.body;

  if (!classId || !academicYear || !Array.isArray(feeHeads)) {
    throw new ApiError('Class, academic year, and fee heads array are required', 400);
  }

  // Find existing or create new
  let feeStructure = await FeeStructure.findOne({ class: classId, academicYear });

  const structureData = {
    class: classId,
    academicYear,
    feeHeads: feeHeads.map((fh) => ({
      feeHead: fh.feeHeadId,
      amount: fh.amount,
      frequency: fh.frequency || 'yearly',
      dueDate: fh.dueDate,
    })),
    totalAmount: totalAmount || feeHeads.reduce((sum, fh) => sum + (fh.amount || 0), 0),
  };

  if (feeStructure) {
    feeStructure = await FeeStructure.findByIdAndUpdate(
      feeStructure._id,
      structureData,
      { new: true, runValidators: true }
    );
  } else {
    feeStructure = await FeeStructure.create(structureData);
  }

  const populatedStructure = await FeeStructure.findById(feeStructure._id)
    .populate('class', 'name section')
    .populate('feeHeads.feeHead', 'name description category');

  return ApiResponse.success(
    res,
    { feeStructure: populatedStructure },
    feeStructure ? 'Fee structure updated' : 'Fee structure created',
    feeStructure ? 200 : 201
  );
});

// ── Fee Payments ───────────────────────────────────────────

// Generate receipt number: REC-YYYY-XXXXX format
const generateReceiptNo = async () => {
  const year = new Date().getFullYear();
  const prefix = `REC-${year}-`;

  // Get last payment for this year
  const lastPayment = await FeePayment.findOne({
    receiptNo: { $regex: `^${prefix}` },
  })
    .sort({ receiptNo: -1 })
    .select('receiptNo')
    .lean();

  let sequence = 1;
  if (lastPayment) {
    const lastSequence = parseInt(lastPayment.receiptNo.split('-')[2], 10);
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(5, '0')}`;
};

// @desc    Record fee payment
// @route   POST /api/v1/fees/payments/record
// @access  Admin
exports.recordPayment = catchAsync(async (req, res) => {
  const {
    student,
    feeHead,
    amount,
    paymentMode,
    paymentDate,
    academicYear,
    remarks,
    transactionId,
    discount = 0,
    fine = 0,
  } = req.body;

  const normalizedPaymentMode = String(paymentMode || '').toLowerCase().replace(/\s+/g, '_');

  if (!student || !amount || !normalizedPaymentMode) {
    throw new ApiError('Student, amount, and payment mode are required', 400);
  }

  const receiptNo = await generateReceiptNo();

  const payment = await FeePayment.create({
    student,
    feeHead,
    amount,
    discount,
    fine,
    netAmount: amount + fine - discount,
    paymentMode: normalizedPaymentMode,
    paymentDate: paymentDate || new Date(),
    academicYear,
    receiptNo,
    remarks,
    transactionId,
    collectedBy: req.user.id,
    status: 'paid',
  });

  const populatedPayment = await FeePayment.findById(payment._id)
    .populate('student', 'firstName lastName admissionNo')
    .populate('feeHead', 'name category');

  return ApiResponse.success(
    res,
    { payment: populatedPayment },
    'Payment recorded successfully',
    201
  );
});

// @desc    Get payments with filters
// @route   GET /api/v1/fees/payments
// @access  Admin
exports.getPayments = catchAsync(async (req, res) => {
  const {
    student,
    status,
    paymentMode,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = req.query;

  const query = {};

  if (student) query.student = student;
  if (status) query.status = status;
  if (paymentMode) query.paymentMode = paymentMode;
  if (startDate && endDate) {
    query.paymentDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [payments, total] = await Promise.all([
    FeePayment.find(query)
      .populate('student', 'firstName lastName admissionNo')
      .populate('feeHead', 'name category')
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

  return ApiResponse.success(res, { payments, meta }, 'Payments retrieved');
});

// @desc    Get student fee ledger
// @route   GET /api/v1/fees/student/:studentId/ledger
// @access  Admin
exports.getStudentLedger = catchAsync(async (req, res) => {
  const { studentId } = req.params;
  const { academicYear } = req.query;

  // Get student details
  const student = await Student.findById(studentId)
    .select('firstName lastName admissionNo currentClass')
    .populate('currentClass', 'name section')
    .lean();

  if (!student) {
    throw new ApiError('Student not found', 404);
  }

  // Get fee structure for student's class
  const feeStructure = await FeeStructure.findOne({
    class: student.currentClass?._id,
    academicYear: academicYear || new Date().getFullYear().toString(),
  })
    .populate('feeHeads.feeHead', 'name category')
    .lean();

  // Get all payments for student
  const paymentQuery = { student: studentId };
  if (academicYear) paymentQuery.academicYear = academicYear;

  const payments = await FeePayment.find(paymentQuery)
    .populate('feeHead', 'name category')
    .sort('-paymentDate')
    .lean();

  // Build ledger entries
  const ledger = [];

  if (feeStructure) {
    feeStructure.feeHeads.forEach((fh) => {
      const relatedPayments = payments.filter(
        (p) => p.feeHead?._id?.toString() === fh.feeHead?._id?.toString()
      );
      const paidAmount = relatedPayments.reduce((sum, p) => sum + p.amount, 0);
      const discountAmount = relatedPayments.reduce((sum, p) => sum + (p.discount || 0), 0);
      const fineAmount = relatedPayments.reduce((sum, p) => sum + (p.fine || 0), 0);

      ledger.push({
        feeHead: fh.feeHead,
        amount: fh.amount,
        paid: paidAmount,
        discount: discountAmount,
        fine: fineAmount,
        balance: fh.amount - paidAmount - discountAmount + fineAmount,
        status: paidAmount + discountAmount >= fh.amount ? 'paid' : paidAmount > 0 ? 'partial' : 'pending',
        dueDate: fh.dueDate,
        payments: relatedPayments,
      });
    });
  }

  const totalPayable = ledger.reduce((sum, e) => sum + e.amount, 0);
  const totalPaid = ledger.reduce((sum, e) => sum + e.paid, 0);
  const totalDiscount = ledger.reduce((sum, e) => sum + e.discount, 0);
  const totalFine = ledger.reduce((sum, e) => sum + e.fine, 0);
  const totalBalance = ledger.reduce((sum, e) => sum + e.balance, 0);

  return ApiResponse.success(
    res,
    {
      student,
      ledger,
      summary: { totalPayable, totalPaid, totalDiscount, totalFine, totalBalance },
    },
    'Student fee ledger retrieved'
  );
});

// @desc    Get outstanding fees grouped by class
// @route   GET /api/v1/fees/outstanding
// @access  Admin
exports.getOutstanding = catchAsync(async (req, res) => {
  const { academicYear } = req.query;

  const year = academicYear || new Date().getFullYear().toString();

  // Aggregate outstanding by class
  const outstandingByClass = await FeePayment.aggregate([
    {
      $match: {
        academicYear: year,
        status: { $in: ['pending', 'partial'] },
      },
    },
    {
      $lookup: {
        from: 'students',
        localField: 'student',
        foreignField: '_id',
        as: 'studentData',
      },
    },
    { $unwind: '$studentData' },
    {
      $group: {
        _id: '$studentData.currentClass',
        totalOutstanding: { $sum: '$netAmount' },
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'classes',
        localField: '_id',
        foreignField: '_id',
        as: 'classInfo',
      },
    },
    { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        class: '$classInfo',
        totalOutstanding: 1,
        count: 1,
      },
    },
  ]);

  const totalOutstanding = outstandingByClass.reduce(
    (sum, c) => sum + c.totalOutstanding,
    0
  );

  return ApiResponse.success(
    res,
    { outstandingByClass, totalOutstanding },
    'Outstanding fees retrieved'
  );
});

// @desc    Get daily collection
// @route   GET /api/v1/fees/daily-collection
// @access  Admin
exports.getDailyCollection = catchAsync(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [totalCollection, paymentCount, payments] = await Promise.all([
    FeePayment.aggregate([
      {
        $match: {
          paymentDate: { $gte: today, $lt: tomorrow },
          status: 'paid',
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    FeePayment.countDocuments({
      paymentDate: { $gte: today, $lt: tomorrow },
      status: 'paid',
    }),
    FeePayment.find({
      paymentDate: { $gte: today, $lt: tomorrow },
      status: 'paid',
    })
      .populate('student', 'firstName lastName admissionNo')
      .sort('-paymentDate')
      .limit(20)
      .lean(),
  ]);

  const total = totalCollection.length > 0 ? totalCollection[0].total : 0;

  return ApiResponse.success(
    res,
    { date: today, total, paymentCount, payments },
    'Daily collection retrieved'
  );
});

// @desc    Get monthly collection for a year
// @route   GET /api/v1/fees/monthly-collection
// @access  Admin
exports.getMonthlyCollection = catchAsync(async (req, res) => {
  const { year } = req.query;
  const targetYear = year || new Date().getFullYear();

  const startDate = new Date(targetYear, 0, 1);
  const endDate = new Date(targetYear, 11, 31, 23, 59, 59);

  const monthlyData = await FeePayment.aggregate([
    {
      $match: {
        paymentDate: { $gte: startDate, $lte: endDate },
        status: 'paid',
      },
    },
    {
      $group: {
        _id: { $month: '$paymentDate' },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Fill in all months (0 for months with no data)
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const monthlyCollection = months.map((month, index) => {
    const data = monthlyData.find((d) => d._id === index + 1);
    return {
      month,
      monthNumber: index + 1,
      total: data?.total || 0,
      count: data?.count || 0,
    };
  });

  const yearlyTotal = monthlyCollection.reduce((sum, m) => sum + m.total, 0);

  return ApiResponse.success(
    res,
    { year: targetYear, monthlyCollection, yearlyTotal },
    'Monthly collection retrieved'
  );
});
