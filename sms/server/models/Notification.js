const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
    },
    type: {
      type: String,
      enum: ['announcement', 'fee_reminder', 'attendance_alert', 'exam_result', 'general'],
      default: 'general',
    },
    recipients: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        read: {
          type: Boolean,
          default: false,
        },
        readAt: {
          type: Date,
          default: null,
        },
      },
    ],
    targetRoles: [
      {
        type: String,
        enum: ['all', 'admin', 'teacher', 'student', 'parent'],
      },
    ],
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sent by is required'],
    },
    attachments: [
      {
        type: String,
        trim: true,
      },
    ],
    scheduledDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
notificationSchema.index({ type: 1 });
notificationSchema.index({ 'recipients.user': 1 });
notificationSchema.index({ 'recipients.read': 1 });
notificationSchema.index({ sentBy: 1 });
notificationSchema.index({ scheduledDate: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ targetRoles: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
