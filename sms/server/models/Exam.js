const mongoose = require('mongoose');

// ── Exam Schema ──────────────────────────────────────────────
const examSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Exam name is required'],
      trim: true,
      maxlength: [200, 'Exam name cannot exceed 200 characters'],
    },
    type: {
      type: String,
      enum: ['unit_test', 'mid_term', 'final', 'practical', 'oral'],
      required: [true, 'Exam type is required'],
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      trim: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class reference is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      validate: {
        validator: function (value) {
          return value >= this.startDate;
        },
        message: 'End date must be on or after start date',
      },
    },
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed', 'published'],
      default: 'upcoming',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by is required'],
    },
    subjects: [
      {
        subject: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Subject',
          required: true,
        },
        examDate: {
          type: Date,
        },
        startTime: {
          type: String,
          match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please use HH:MM format'],
        },
        endTime: {
          type: String,
          match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please use HH:MM format'],
        },
        maxMarks: {
          type: Number,
          default: 100,
          min: [1, 'Max marks must be at least 1'],
        },
      },
    ],
    maxMarks: {
      type: Number,
      default: 100,
      min: [1, 'Max marks must be at least 1'],
    },
    passPercentage: {
      type: Number,
      default: 33,
      min: [0, 'Pass percentage cannot be negative'],
      max: [100, 'Pass percentage cannot exceed 100'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
examSchema.index({ class: 1, academicYear: 1 });
examSchema.index({ type: 1 });
examSchema.index({ status: 1 });
examSchema.index({ startDate: 1 });

const Exam = mongoose.model('Exam', examSchema);

// ── Mark Schema ──────────────────────────────────────────────
const markSchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: [true, 'Exam reference is required'],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject reference is required'],
    },
    marksObtained: {
      type: Number,
      required: [true, 'Marks obtained is required'],
      min: [0, 'Marks cannot be negative'],
    },
    maxMarks: {
      type: Number,
      required: [true, 'Max marks is required'],
      min: [1, 'Max marks must be at least 1'],
    },
    percentage: {
      type: Number,
      min: [0, 'Percentage cannot be negative'],
      max: [100, 'Percentage cannot exceed 100'],
    },
    grade: {
      type: String,
      trim: true,
      uppercase: true,
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [500, 'Remarks cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'verified', 'published'],
      default: 'draft',
    },
    result: {
      type: String,
      enum: ['pass', 'fail'],
      default: 'fail',
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
    },
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Entered by is required'],
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: exam + student + subject
markSchema.index({ exam: 1, student: 1, subject: 1 }, { unique: true });
markSchema.index({ exam: 1 });
markSchema.index({ student: 1 });
markSchema.index({ subject: 1 });
markSchema.index({ status: 1 });
markSchema.index({ grade: 1 });

// Pre-save hook: auto-calculate grade based on marks
markSchema.pre('save', function (next) {
  if (this.isModified('marksObtained')) {
    const marks = this.marksObtained;
    if (marks >= 91) this.grade = 'A+';
    else if (marks >= 81) this.grade = 'A';
    else if (marks >= 71) this.grade = 'B+';
    else if (marks >= 61) this.grade = 'B';
    else if (marks >= 51) this.grade = 'C';
    else if (marks >= 41) this.grade = 'D';
    else if (marks >= 35) this.grade = 'E';
    else this.grade = 'F';
  }
  next();
});

const Mark = mongoose.model('Mark', markSchema);

module.exports = Exam;
module.exports.Exam = Exam;
module.exports.Mark = Mark;
