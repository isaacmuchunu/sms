const mongoose = require('mongoose');

const timetableEntrySchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      required: true,
    },
    period: {
      type: Number,
      required: true,
      min: [1, 'Period must be at least 1'],
      max: [10, 'Period cannot exceed 10'],
    },
    startTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please use HH:MM format'],
    },
    endTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please use HH:MM format'],
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },
  },
  { _id: true }
);

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Class name is required'],
      trim: true,
      maxlength: [50, 'Class name cannot exceed 50 characters'],
    },
    section: {
      type: String,
      required: [true, 'Section is required'],
      trim: true,
      uppercase: true,
      maxlength: [10, 'Section cannot exceed 10 characters'],
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      trim: true,
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      max: [100, 'Capacity cannot exceed 100'],
    },
    classTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      default: null,
    },
    roomNumber: {
      type: String,
      trim: true,
    },
    subjects: [
      {
        subject: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Subject',
          required: true,
        },
        teacher: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Teacher',
          default: null,
        },
        periodsPerWeek: {
          type: Number,
          default: 5,
          min: [1, 'Periods per week must be at least 1'],
          max: [40, 'Periods per week cannot exceed 40'],
        },
      },
    ],
    studentsCount: {
      type: Number,
      default: 0,
      min: [0, 'Students count cannot be negative'],
    },
    timetable: [timetableEntrySchema],
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound unique index: name + section + academicYear
classSchema.index({ name: 1, section: 1, academicYear: 1 }, { unique: true });
classSchema.index({ classTeacher: 1 });
classSchema.index({ academicYear: 1 });
classSchema.index({ status: 1 });

// Virtual: fullClassName
classSchema.virtual('fullClassName').get(function () {
  return `${this.name} - Section ${this.section}`;
});

// Virtual: availableSeats
classSchema.virtual('availableSeats').get(function () {
  return this.capacity - (this.studentsCount || 0);
});

module.exports = mongoose.model('Class', classSchema);
