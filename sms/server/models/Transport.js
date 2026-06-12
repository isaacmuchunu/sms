const mongoose = require('mongoose');

// ── Vehicle Schema ──────────────────────────────────────────────
const vehicleSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    type: {
      type: String,
      enum: ['bus', 'van', 'car'],
      required: [true, 'Vehicle type is required'],
    },
    model: {
      type: String,
      trim: true,
      maxlength: [100, 'Model cannot exceed 100 characters'],
    },
    manufacturer: {
      type: String,
      trim: true,
      maxlength: [100, 'Manufacturer cannot exceed 100 characters'],
    },
    yearOfManufacture: {
      type: Number,
      min: [1950, 'Manufacture year must be valid'],
      max: [new Date().getFullYear(), 'Manufacture year cannot be in the future'],
    },
    color: {
      type: String,
      trim: true,
      maxlength: [50, 'Color cannot exceed 50 characters'],
    },
    insuranceExpiry: {
      type: Date,
    },
    fitnessExpiry: {
      type: Date,
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      max: [100, 'Capacity cannot exceed 100'],
    },
    driverName: {
      type: String,
      trim: true,
      maxlength: [100, 'Driver name cannot exceed 100 characters'],
    },
    driverPhone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s-]{10,15}$/, 'Please enter a valid phone number'],
    },
    status: {
      type: String,
      enum: ['active', 'maintenance', 'retired'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
vehicleSchema.index({ registrationNumber: 1 }, { unique: true });
vehicleSchema.index({ type: 1 });
vehicleSchema.index({ status: 1 });

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

// ── Route Schema ──────────────────────────────────────────────
const routeSchema = new mongoose.Schema(
  {
    routeName: {
      type: String,
      required: [true, 'Route name is required'],
      trim: true,
      maxlength: [100, 'Route name cannot exceed 100 characters'],
    },
    routeCode: {
      type: String,
      required: [true, 'Route code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    stops: [
      {
        name: {
          type: String,
          required: [true, 'Stop name is required'],
          trim: true,
        },
        sequence: {
          type: Number,
          required: [true, 'Sequence is required'],
          min: [1, 'Sequence must be at least 1'],
        },
        distanceKm: {
          type: Number,
          default: 0,
          min: [0, 'Distance cannot be negative'],
        },
        arrivalTime: {
          type: String,
          match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please use HH:MM format'],
        },
      },
    ],
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
      },
    ],
    startPoint: {
      type: String,
      trim: true,
    },
    endPoint: {
      type: String,
      trim: true,
    },
    totalDistance: {
      type: Number,
      default: 0,
      min: [0, 'Distance cannot be negative'],
    },
    estimatedTime: {
      type: String,
      trim: true,
    },
    fare: {
      type: Number,
      default: 0,
      min: [0, 'Fee cannot be negative'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
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

// Indexes
routeSchema.index({ routeCode: 1 }, { unique: true });
routeSchema.index({ vehicle: 1 });
routeSchema.index({ status: 1 });

const Route = mongoose.model('Route', routeSchema);

module.exports = { Vehicle, Route };
