const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class reference is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'half_day', 'excused'],
      required: [true, 'Attendance status is required'],
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [500, 'Remarks cannot exceed 500 characters'],
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher reference is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: student + date + subject
// This ensures a student can only have one attendance record per subject per day
// If subject is null (daily attendance), the sparse index handles it
attendanceSchema.index({ student: 1, date: 1, subject: 1 }, { unique: true, sparse: true });
attendanceSchema.index({ student: 1, date: 1 });
attendanceSchema.index({ class: 1, date: 1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ date: -1 });
attendanceSchema.index({ markedBy: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
