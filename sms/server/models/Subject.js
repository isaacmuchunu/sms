const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
      maxlength: [100, 'Subject name cannot exceed 100 characters'],
    },
    code: {
      type: String,
      required: [true, 'Subject code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    type: {
      type: String,
      enum: ['core', 'elective', 'co_curricular'],
      default: 'core',
    },
    credits: {
      type: Number,
      default: 1,
      min: [0.5, 'Credits must be at least 0.5'],
      max: [10, 'Credits cannot exceed 10'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    passingMarks: {
      type: Number,
      default: 35,
      min: [0, 'Passing marks cannot be negative'],
      max: [100, 'Passing marks cannot exceed 100'],
    },
    maxMarks: {
      type: Number,
      default: 100,
      min: [1, 'Maximum marks must be at least 1'],
      max: [1000, 'Maximum marks cannot exceed 1000'],
    },
    applicableClasses: [
      {
        class: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Class',
          required: true,
        },
        hasPractical: {
          type: Boolean,
          default: false,
        },
      },
    ],
    status: {
      type: String,
      enum: ['active', 'inactive'],
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
subjectSchema.index({ code: 1 }, { unique: true });
subjectSchema.index({ name: 1 });
subjectSchema.index({ type: 1 });
subjectSchema.index({ status: 1 });
subjectSchema.index({ name: 'text', code: 'text', description: 'text' });

module.exports = mongoose.model('Subject', subjectSchema);
