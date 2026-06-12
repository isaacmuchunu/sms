const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    admissionNo: {
      type: String,
      required: [true, 'Admission number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    rollNo: {
      type: String,
      trim: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    dob: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: [true, 'Gender is required'],
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    religion: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: ['general', 'sc', 'st', 'obc'],
      default: 'general',
    },
    photo: {
      type: String,
      default: '',
    },
    currentClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Current class is required'],
    },
    currentSection: {
      type: String,
      trim: true,
      uppercase: true,
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      trim: true,
    },
    // Father's Information
    fatherName: {
      type: String,
      trim: true,
      maxlength: [100, 'Father name cannot exceed 100 characters'],
    },
    fatherPhone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s-]{10,15}$/, 'Please enter a valid phone number'],
    },
    fatherOccupation: {
      type: String,
      trim: true,
    },
    // Mother's Information
    motherName: {
      type: String,
      trim: true,
      maxlength: [100, 'Mother name cannot exceed 100 characters'],
    },
    motherPhone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s-]{10,15}$/, 'Please enter a valid phone number'],
    },
    motherOccupation: {
      type: String,
      trim: true,
    },
    // Guardian's Information
    guardianName: {
      type: String,
      trim: true,
      maxlength: [100, 'Guardian name cannot exceed 100 characters'],
    },
    guardianPhone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s-]{10,15}$/, 'Please enter a valid phone number'],
    },
    guardianRelation: {
      type: String,
      trim: true,
    },
    guardianOccupation: {
      type: String,
      trim: true,
    },
    // Address
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters'],
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    pincode: {
      type: String,
      trim: true,
      match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode'],
    },
    // Previous School Information
    previousSchool: {
      type: String,
      trim: true,
    },
    previousClassPercentage: {
      type: Number,
      min: [0, 'Percentage cannot be negative'],
      max: [100, 'Percentage cannot exceed 100'],
    },
    // Hostel
    hostelRoom: {
      type: String,
      trim: true,
    },
    // Transport
    transportRoute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transport',
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'passed_out', 'transferred'],
      default: 'active',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
studentSchema.index({ admissionNo: 1 }, { unique: true });
studentSchema.index({ rollNo: 1 });
studentSchema.index({ currentClass: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ academicYear: 1 });
studentSchema.index({ firstName: 'text', lastName: 'text', admissionNo: 'text' });

// Virtual: fullName
studentSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual: age
studentSchema.virtual('age').get(function () {
  if (!this.dob) return null;
  const diff = Date.now() - this.dob.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
});

module.exports = mongoose.model('Student', studentSchema);
