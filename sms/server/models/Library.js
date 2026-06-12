const mongoose = require('mongoose');

// ── Book Schema ──────────────────────────────────────────────
const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Book title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    author: {
      type: String,
      required: [true, 'Author is required'],
      trim: true,
      maxlength: [200, 'Author name cannot exceed 200 characters'],
    },
    isbn: {
      type: String,
      required: [true, 'ISBN is required'],
      unique: true,
      trim: true,
    },
    publisher: {
      type: String,
      trim: true,
      maxlength: [200, 'Publisher name cannot exceed 200 characters'],
    },
    category: {
      type: String,
      trim: true,
      maxlength: [100, 'Category cannot exceed 100 characters'],
    },
    publicationYear: {
      type: Number,
      min: [1000, 'Publication year must be valid'],
      max: [new Date().getFullYear(), 'Publication year cannot be in the future'],
    },
    language: {
      type: String,
      trim: true,
      maxlength: [50, 'Language cannot exceed 50 characters'],
    },
    pages: {
      type: Number,
      min: [1, 'Pages must be at least 1'],
    },
    price: {
      type: Number,
      min: [0, 'Price cannot be negative'],
    },
    edition: {
      type: String,
      trim: true,
    },
    shelfLocation: {
      type: String,
      trim: true,
      maxlength: [50, 'Shelf location cannot exceed 50 characters'],
    },
    totalCopies: {
      type: Number,
      required: [true, 'Total copies is required'],
      min: [1, 'Total copies must be at least 1'],
    },
    availableCopies: {
      type: Number,
      default: function () {
        return this.totalCopies;
      },
      min: [0, 'Available copies cannot be negative'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    addedDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['available', 'issued', 'damaged', 'lost', 'inactive'],
      default: 'available',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
bookSchema.index({ isbn: 1 }, { unique: true });
bookSchema.index({ title: 'text', author: 'text', category: 'text' });
bookSchema.index({ category: 1 });
bookSchema.index({ status: 1 });

// Virtual: issuedCopies
bookSchema.virtual('issuedCopies').get(function () {
  return this.totalCopies - (this.availableCopies || 0);
});

const Book = mongoose.model('Book', bookSchema);

// ── BookTransaction Schema ──────────────────────────────────────────────
const bookTransactionSchema = new mongoose.Schema(
  {
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: [true, 'Book reference is required'],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
    },
    issueDate: {
      type: Date,
      required: [true, 'Issue date is required'],
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    returnDate: {
      type: Date,
      default: null,
    },
    fineAmount: {
      type: Number,
      default: 0,
      min: [0, 'Fine amount cannot be negative'],
    },
    fine: {
      type: Number,
      default: 0,
      min: [0, 'Fine cannot be negative'],
    },
    status: {
      type: String,
      enum: ['issued', 'returned', 'overdue'],
      default: 'issued',
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Issued by is required'],
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [500, 'Remarks cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
bookTransactionSchema.index({ book: 1 });
bookTransactionSchema.index({ student: 1 });
bookTransactionSchema.index({ status: 1 });
bookTransactionSchema.index({ dueDate: 1 });
bookTransactionSchema.index({ issueDate: -1 });

const BookTransaction = mongoose.model('BookTransaction', bookTransactionSchema);

module.exports = { Book, BookTransaction };
