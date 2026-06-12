const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s-]{10,15}$/, 'Please enter a valid phone number'],
    },
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters'],
    },
    specialization: {
      type: String,
      trim: true,
      maxlength: [200, 'Specialization cannot exceed 200 characters'],
    },
    emergencyContact: {
      type: String,
      trim: true,
    },
    qualifications: [
      {
        degree: {
          type: String,
          required: [true, 'Degree is required'],
          trim: true,
        },
        institution: {
          type: String,
          required: [true, 'Institution is required'],
          trim: true,
        },
        year: {
          type: Number,
          required: [true, 'Passing year is required'],
          min: [1950, 'Year must be after 1950'],
          max: [new Date().getFullYear(), 'Year cannot be in the future'],
        },
        percentage: {
          type: Number,
          min: [0, 'Percentage cannot be negative'],
          max: [100, 'Percentage cannot exceed 100'],
        },
      },
    ],
    experience: [
      {
        school: {
          type: String,
          required: [true, 'School/Institution name is required'],
          trim: true,
        },
        designation: {
          type: String,
          required: [true, 'Designation is required'],
          trim: true,
        },
        from: {
          type: Date,
          required: [true, 'Start date is required'],
        },
        to: {
          type: Date,
          default: null,
        },
      },
    ],
    subjects: [
      {
        subject: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Subject',
          required: true,
        },
        class: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Class',
        },
        periodsPerWeek: {
          type: Number,
          default: 0,
          min: [0, 'Periods per week cannot be negative'],
          max: [40, 'Periods per week cannot exceed 40'],
        },
        classes: [
          {
            class: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'Class',
              required: true,
            },
            section: {
              type: String,
              trim: true,
              uppercase: true,
            },
          },
        ],
      },
    ],
    assignedClasses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
      },
    ],
    joiningDate: {
      type: Date,
      required: [true, 'Joining date is required'],
    },
    designation: {
      type: String,
      enum: [
        'principal',
        'vice_principal',
        'hod',
        'senior_teacher',
        'teacher',
        'lab_assistant',
      ],
      default: 'teacher',
    },
    department: {
      type: String,
      enum: [
        'science',
        'mathematics',
        'english',
        'social_studies',
        'languages',
        'arts',
        'physical_education',
        'computer',
      ],
      required: [true, 'Department is required'],
    },
    salary: {
      base: {
        type: Number,
        required: [true, 'Base salary is required'],
        min: [0, 'Base salary cannot be negative'],
      },
      da: {
        type: Number,
        default: 0,
        min: [0, 'DA cannot be negative'],
      },
      hra: {
        type: Number,
        default: 0,
        min: [0, 'HRA cannot be negative'],
      },
      ta: {
        type: Number,
        default: 0,
        min: [0, 'TA cannot be negative'],
      },
      total: {
        type: Number,
        default: 0,
      },
    },
    contractType: {
      type: String,
      enum: ['permanent', 'contractual', 'guest'],
      default: 'permanent',
    },
    status: {
      type: String,
      enum: ['active', 'on_leave', 'resigned', 'retired', 'inactive'],
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
teacherSchema.index({ employeeId: 1 }, { unique: true });
teacherSchema.index({ user: 1 });
teacherSchema.index({ department: 1 });
teacherSchema.index({ designation: 1 });
teacherSchema.index({ status: 1 });

// Pre-save hook: calculate total salary
teacherSchema.pre('save', function (next) {
  if (this.isModified('salary')) {
    this.salary.total =
      (this.salary.base || 0) +
      (this.salary.da || 0) +
      (this.salary.hra || 0) +
      (this.salary.ta || 0);
  }
  next();
});

// Virtual: years of experience
// Note: Using function name to avoid duplicate index name issues
teacherSchema.virtual('yearsOfExperience').get(function () {
  if (!this.joiningDate) return 0;
  const diff = Date.now() - this.joiningDate.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
});

teacherSchema.virtual('name').get(function () {
  const fullName = `${this.firstName || ''} ${this.lastName || ''}`.trim();
  return fullName || undefined;
});

module.exports = mongoose.model('Teacher', teacherSchema);
