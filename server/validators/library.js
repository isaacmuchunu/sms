const Joi = require('joi');
const { objectId, status } = require('./common');

const bookStatusValues = ['active', 'inactive', 'lost'];
const copyStatusValues = ['available', 'issued', 'reserved', 'lost', 'damaged', 'withdrawn'];
const copyConditionValues = ['new', 'good', 'fair', 'poor', 'damaged'];
const issueStatusValues = ['issued', 'returned', 'lost', 'overdue'];
const reservationStatusValues = ['pending', 'hold', 'fulfilled', 'cancelled', 'expired'];

// ── Book Validators ────────────────────────────────────────

const createBook = Joi.object({
  title: Joi.string().trim().max(200).required(),
  isbn: Joi.string().trim().max(50).required(),
  author: Joi.string().trim().max(200).required(),
  publisher: Joi.string().trim().max(200).allow(''),
  category: Joi.string().trim().max(100).allow(''),
  subject: objectId().allow(null),
  edition: Joi.string().trim().max(50).allow(''),
  publishYear: Joi.number().integer().min(1000).max(new Date().getFullYear()),
  pages: Joi.number().integer().min(1),
  language: Joi.string().trim().max(50).allow(''),
  description: Joi.string().trim().max(2000).allow(''),
  coverImage: Joi.string().trim().max(500).allow(''),
  shelfLocation: Joi.string().trim().max(50).allow(''),
  totalCopies: Joi.number().integer().min(1).default(1),
  availableCopies: Joi.number().integer().min(0),
  status: status(bookStatusValues).default('active'),
});

const updateBook = Joi.object({
  title: Joi.string().trim().max(200),
  isbn: Joi.string().trim().max(50),
  author: Joi.string().trim().max(200),
  publisher: Joi.string().trim().max(200).allow(''),
  category: Joi.string().trim().max(100).allow(''),
  subject: objectId().allow(null),
  edition: Joi.string().trim().max(50).allow(''),
  publishYear: Joi.number().integer().min(1000).max(new Date().getFullYear()),
  pages: Joi.number().integer().min(1),
  language: Joi.string().trim().max(50).allow(''),
  description: Joi.string().trim().max(2000).allow(''),
  coverImage: Joi.string().trim().max(500).allow(''),
  shelfLocation: Joi.string().trim().max(50).allow(''),
  status: status(bookStatusValues),
}).min(1);

const bookSortValues = ['createdAt', '-createdAt', 'title', '-title', 'author', '-author', 'isbn', '-isbn', 'publisher', '-publisher', 'category', '-category', 'status', '-status'];

const bookQuery = Joi.object({
  search: Joi.string().trim().max(100).allow(''),
  category: Joi.string().trim().allow(''),
  status: status(bookStatusValues),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  sort: Joi.string().trim().max(50).valid(...bookSortValues).default('-createdAt'),
});

// ── Book Copy Validators ───────────────────────────────────

const createCopy = Joi.object({
  accessionNo: Joi.string().trim().max(50).required(),
  status: status(copyStatusValues).default('available'),
  condition: status(copyConditionValues).default('good'),
  purchaseDate: Joi.date().iso(),
  cost: Joi.number().min(0).default(0),
  location: Joi.string().trim().max(100).allow(''),
  count: Joi.number().integer().min(1).max(50).default(1),
});

const updateCopy = Joi.object({
  accessionNo: Joi.string().trim().max(50),
  status: status(copyStatusValues),
  condition: status(copyConditionValues),
  purchaseDate: Joi.date().iso().allow(null),
  cost: Joi.number().min(0),
  location: Joi.string().trim().max(100).allow(''),
}).min(1);

const copySortValues = ['createdAt', '-createdAt', 'accessionNo', '-accessionNo', 'status', '-status', 'condition', '-condition'];

const copyQuery = Joi.object({
  status: status(copyStatusValues),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  sort: Joi.string().trim().max(50).valid(...copySortValues).default('accessionNo'),
});

// ── Issue / Transaction Validators ─────────────────────────

const createIssue = Joi.object({
  bookCopyId: objectId(),
  bookId: objectId(),
  studentId: objectId().required(),
  issueDate: Joi.date().iso().default(new Date().toISOString()),
  dueDate: Joi.date().iso(),
  remarks: Joi.string().trim().max(500).allow(''),
})
  .or('bookCopyId', 'bookId')
  .messages({ 'object.missing': 'Either bookCopyId or bookId is required' });

const returnIssue = Joi.object({
  returnDate: Joi.date().iso().default(new Date().toISOString()),
  fineAmount: Joi.number().min(0),
  remarks: Joi.string().trim().max(500).allow(''),
});

const renewIssue = Joi.object({
  dueDate: Joi.date().iso().required(),
  remarks: Joi.string().trim().max(500).allow(''),
});

const issueSortValues = ['createdAt', '-createdAt', 'issueDate', '-issueDate', 'dueDate', '-dueDate', 'returnDate', '-returnDate', 'status', '-status', 'fineAmount', '-fineAmount'];

const issueQuery = Joi.object({
  book: objectId(),
  student: objectId(),
  status: Joi.alternatives().try(
    status(issueStatusValues),
    Joi.array().items(status(issueStatusValues))
  ),
  overdue: Joi.boolean(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  sort: Joi.string().trim().max(50).valid(...issueSortValues).default('-issueDate'),
});

// ── Reservation Validators ─────────────────────────────────

const createReservation = Joi.object({
  bookId: objectId().required(),
  studentId: objectId().required(),
  remarks: Joi.string().trim().max(500).allow(''),
});

const reservationSortValues = ['createdAt', '-createdAt', 'queuePosition', '-queuePosition', 'reservedAt', '-reservedAt', 'status', '-status'];

const reservationQuery = Joi.object({
  book: objectId(),
  student: objectId(),
  status: status(reservationStatusValues),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  sort: Joi.string().trim().max(50).valid(...reservationSortValues).default('queuePosition'),
});

// ── Fine Validators ────────────────────────────────────────

const payFine = Joi.object({
  amount: Joi.number().min(0.01).required(),
  remarks: Joi.string().trim().max(500).allow(''),
});

const fineSortValues = ['createdAt', '-createdAt', 'fineAmount', '-fineAmount', 'finePaid', '-finePaid', 'status', '-status'];

const fineQuery = Joi.object({
  student: objectId(),
  status: Joi.string().valid('pending', 'paid').default('pending'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  sort: Joi.string().trim().max(50).valid(...fineSortValues).default('-createdAt'),
});

// ── Common ─────────────────────────────────────────────────

const objectIdParam = Joi.object({
  id: objectId().required(),
});

module.exports = {
  createBook,
  updateBook,
  bookQuery,
  createCopy,
  updateCopy,
  copyQuery,
  createIssue,
  returnIssue,
  renewIssue,
  issueQuery,
  createReservation,
  reservationQuery,
  payFine,
  fineQuery,
  objectIdParam,
};
