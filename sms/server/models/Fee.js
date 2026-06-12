const mongoose = require('mongoose');

// ── FeeHead Schema ──────────────────────────────────────────────
const feeHeadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Fee head name is required'],
      trim: true,
      maxlength: [100, 'Fee head name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    frequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'half_yearly', 'yearly', 'one_time'],
      required: [true, 'Frequency is required'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

feeHeadSchema.index({ name: 1 }, { unique: true });
feeHeadSchema.index({ frequency: 1 });
feeHeadSchema.index({ status: 1 });

const FeeHead = mongoose.model('FeeHead', feeHeadSchema);

// ── FeeStructure Schema ──────────────────────────────────────────────
const feeStructureSchema = new mongoose.Schema(
  {
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class reference is required'],
    },
    feeHead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeeHead',
      required: [true, 'Fee head reference is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      trim: true,
    },
    dueDay: {
      type: Number,
      default: 10,
      min: [1, 'Due day must be between 1 and 31'],
      max: [31, 'Due day must be between 1 and 31'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: class + feeHead + academicYear
feeStructureSchema.index({ class: 1, feeHead: 1, academicYear: 1 }, { unique: true });
feeStructureSchema.index({ class: 1 });
feeStructureSchema.index({ academicYear: 1 });
feeStructureSchema.index({ feeHead: 1 });

const FeeStructure = mongoose.model('FeeStructure', feeStructureSchema);

// ── FeePayment Schema ──────────────────────────────────────────────
const feePaymentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
    },
    feeStructure: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeeStructure',
      required: [true, 'Fee structure reference is required'],
    },
    amountPaid: {
      type: Number,
      required: [true, 'Amount paid is required'],
      min: [0, 'Amount paid cannot be negative'],
    },
    paymentMode: {
      type: String,
      enum: ['cash', 'cheque', 'online', 'bank_transfer'],
      required: [true, 'Payment mode is required'],
    },
    transactionId: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: ['paid', 'partial', 'pending', 'overdue'],
      default: 'pending',
    },
    paidDate: {
      type: Date,
      default: null,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    receiptNo: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
    },
    fine: {
      type: Number,
      default: 0,
      min: [0, 'Fine cannot be negative'],
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [500, 'Remarks cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
feePaymentSchema.index({ receiptNo: 1 }, { unique: true, sparse: true });
feePaymentSchema.index({ student: 1 });
feePaymentSchema.index({ status: 1 });
feePaymentSchema.index({ dueDate: 1 });
feePaymentSchema.index({ paidDate: 1 });

// Pre-save hook: auto-generate receipt number
feePaymentSchema.pre('save', async function (next) {
  if (this.isNew && !this.receiptNo) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.receiptNo = `RCP-${timestamp}-${random}`;
  }
  next();
});

const FeePayment = mongoose.model('FeePayment', feePaymentSchema);

module.exports = { FeeHead, FeeStructure, FeePayment };
