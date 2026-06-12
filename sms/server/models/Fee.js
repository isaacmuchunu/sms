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
      default: 'one_time',
    },
    category: {
      type: String,
      enum: ['tuition', 'transport', 'hostel', 'library', 'exam', 'activity', 'other'],
      default: 'tuition',
    },
    isRefundable: {
      type: Boolean,
      default: false,
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
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      trim: true,
    },
    feeHeads: [
      {
        feeHead: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'FeeHead',
          required: true,
        },
        amount: {
          type: Number,
          required: true,
          min: [0, 'Amount cannot be negative'],
        },
        frequency: {
          type: String,
          enum: ['monthly', 'quarterly', 'half_yearly', 'yearly', 'one_time'],
          default: 'yearly',
        },
        dueDate: {
          type: Date,
        },
      },
    ],
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, 'Total amount cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: class + academicYear
feeStructureSchema.index({ class: 1, academicYear: 1 }, { unique: true });
feeStructureSchema.index({ class: 1 });
feeStructureSchema.index({ academicYear: 1 });

feeStructureSchema.pre('validate', function (next) {
  this.totalAmount = (this.feeHeads || []).reduce((sum, item) => sum + (item.amount || 0), 0);
  next();
});

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
      default: null,
    },
    feeHead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeeHead',
      default: null,
    },
    amount: {
      type: Number,
      min: [0, 'Amount cannot be negative'],
    },
    amountPaid: {
      type: Number,
      default: undefined,
      min: [0, 'Amount paid cannot be negative'],
    },
    netAmount: {
      type: Number,
      min: [0, 'Net amount cannot be negative'],
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
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    academicYear: {
      type: String,
      trim: true,
    },
    dueDate: {
      type: Date,
      default: Date.now,
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
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

feePaymentSchema.pre('validate', function (next) {
  const gross = this.amount ?? this.amountPaid ?? 0;
  this.amount = gross;
  this.amountPaid = this.amountPaid ?? gross;
  this.netAmount = this.netAmount ?? Math.max(gross + (this.fine || 0) - (this.discount || 0), 0);
  if (this.status === 'paid' && !this.paidDate) {
    this.paidDate = this.paymentDate || new Date();
  }
  next();
});

// Indexes
feePaymentSchema.index({ receiptNo: 1 }, { unique: true, sparse: true });
feePaymentSchema.index({ student: 1 });
feePaymentSchema.index({ status: 1 });
feePaymentSchema.index({ dueDate: 1 });
feePaymentSchema.index({ paidDate: 1 });
feePaymentSchema.index({ paymentDate: -1 });
feePaymentSchema.index({ academicYear: 1 });

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
