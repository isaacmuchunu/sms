const mongoose = require('mongoose');

// ── Room Schema ──────────────────────────────────────────────
const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      trim: true,
      uppercase: true,
    },
    block: {
      type: String,
      required: [true, 'Block is required'],
      trim: true,
      uppercase: true,
    },
    floor: {
      type: Number,
      required: [true, 'Floor is required'],
      min: [0, 'Floor must be at least 0'],
    },
    type: {
      type: String,
      enum: ['single', 'double', 'triple', 'dormitory', 'standard'],
      required: [true, 'Room type is required'],
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
    },
    occupants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
      },
    ],
    monthlyRent: {
      type: Number,
      default: 0,
      min: [0, 'Rent cannot be negative'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    facilities: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ['available', 'partially_occupied', 'occupied', 'full', 'maintenance'],
      default: 'available',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound unique index: roomNo + block
roomSchema.index({ roomNumber: 1, block: 1 }, { unique: true });
roomSchema.index({ block: 1 });
roomSchema.index({ status: 1 });
roomSchema.index({ type: 1 });

// Virtual: currentOccupancy
roomSchema.virtual('currentOccupancy').get(function () {
  return this.occupants ? this.occupants.length : 0;
});

// Virtual: vacancy
roomSchema.virtual('vacancy').get(function () {
  return this.capacity - (this.occupants ? this.occupants.length : 0);
});

const Room = mongoose.model('Room', roomSchema);

// ── VisitorLog Schema ──────────────────────────────────────────────
const visitorLogSchema = new mongoose.Schema(
  {
    visitorName: {
      type: String,
      required: [true, 'Visitor name is required'],
      trim: true,
      maxlength: [100, 'Visitor name cannot exceed 100 characters'],
    },
    visitorPhone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s-]{10,15}$/, 'Please enter a valid phone number'],
    },
    relation: {
      type: String,
      trim: true,
      maxlength: [50, 'Relation cannot exceed 50 characters'],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null,
    },
    visitDate: {
      type: Date,
      default: Date.now,
    },
    entryTime: {
      type: Date,
      required: [true, 'Entry time is required'],
      default: Date.now,
    },
    exitTime: {
      type: Date,
      default: null,
    },
    purpose: {
      type: String,
      required: [true, 'Purpose is required'],
      trim: true,
      maxlength: [500, 'Purpose cannot exceed 500 characters'],
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    checkedOutBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    idProofType: {
      type: String,
      trim: true,
      maxlength: [50, 'ID proof type cannot exceed 50 characters'],
    },
    idProofNumber: {
      type: String,
      trim: true,
      maxlength: [100, 'ID proof number cannot exceed 100 characters'],
    },
    status: {
      type: String,
      enum: ['checked_in', 'checked_out'],
      default: 'checked_in',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
visitorLogSchema.index({ student: 1 });
visitorLogSchema.index({ status: 1 });
visitorLogSchema.index({ entryTime: -1 });
visitorLogSchema.index({ approvedBy: 1 });
visitorLogSchema.index({ visitDate: -1 });

const VisitorLog = mongoose.model('VisitorLog', visitorLogSchema);

module.exports = { Room, VisitorLog };
