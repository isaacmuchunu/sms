const express = require('express');
const router = express.Router();
const libraryController = require('../controllers/libraryController');
const { authenticate, authorize, requireModule } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
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
} = require('../validators/library');

const librarianOrAdmin = authorize('admin', 'librarian');
const readRoles = authorize('admin', 'librarian', 'teacher', 'student');

const setBookIdFromParams = (req, res, next) => {
  req.body.bookId = req.params.id;
  next();
};

router.use(authenticate, requireModule('library'));

// ── Books ──────────────────────────────────────────────────
router
  .route('/books')
  .get(validate(bookQuery, 'query'), libraryController.getBooks)
  .post(librarianOrAdmin, validate(createBook), libraryController.createBook);

router
  .route('/books/:id')
  .get(validate(objectIdParam, 'params'), libraryController.getBook)
  .put(librarianOrAdmin, validate(objectIdParam, 'params'), validate(updateBook), libraryController.updateBook)
  .delete(librarianOrAdmin, validate(objectIdParam, 'params'), libraryController.deleteBook);

// ── Book Copies ────────────────────────────────────────────
router.get(
  '/books/:id/copies',
  validate(objectIdParam, 'params'),
  validate(copyQuery, 'query'),
  libraryController.getBookCopies
);
router.post(
  '/books/:id/copies',
  librarianOrAdmin,
  validate(objectIdParam, 'params'),
  validate(createCopy),
  libraryController.addBookCopy
);

router
  .route('/copies/:id')
  .get(validate(objectIdParam, 'params'), libraryController.getCopy)
  .put(librarianOrAdmin, validate(objectIdParam, 'params'), validate(updateCopy), libraryController.updateCopy)
  .delete(librarianOrAdmin, validate(objectIdParam, 'params'), libraryController.deleteCopy);

// ── Issues / Transactions ──────────────────────────────────
router
  .route('/issues')
  .get(validate(issueQuery, 'query'), readRoles, libraryController.getIssues)
  .post(librarianOrAdmin, validate(createIssue), libraryController.createIssue);

// Legacy issue by book id
router.post(
  '/books/:id/issue',
  librarianOrAdmin,
  validate(objectIdParam, 'params'),
  setBookIdFromParams,
  validate(createIssue),
  libraryController.createIssue
);

router.post(
  '/issues/:id/return',
  librarianOrAdmin,
  validate(objectIdParam, 'params'),
  validate(returnIssue),
  libraryController.returnIssue
);
router.post(
  '/issues/:id/renew',
  librarianOrAdmin,
  validate(objectIdParam, 'params'),
  validate(renewIssue),
  libraryController.renewIssue
);

// Backward-compatible transaction aliases
router.get('/transactions', validate(issueQuery, 'query'), readRoles, libraryController.getIssues);
router.post(
  '/transactions/:id/return',
  librarianOrAdmin,
  validate(objectIdParam, 'params'),
  validate(returnIssue),
  libraryController.returnIssue
);

// ── Overdue ────────────────────────────────────────────────
router.get('/overdue', librarianOrAdmin, libraryController.getOverdue);
router.get('/student/:studentId/issues', authorize('parent', 'admin', 'teacher', 'librarian'), libraryController.getStudentIssues);

// ── Reservations ───────────────────────────────────────────
router
  .route('/reservations')
  .get(validate(reservationQuery, 'query'), readRoles, libraryController.getReservations)
  .post(librarianOrAdmin, validate(createReservation), libraryController.createReservation);

router.delete(
  '/reservations/:id',
  librarianOrAdmin,
  validate(objectIdParam, 'params'),
  libraryController.cancelReservation
);

// ── Fines ──────────────────────────────────────────────────
router.get('/fines', validate(fineQuery, 'query'), readRoles, libraryController.getFines);
router.post(
  '/fines/:id/pay',
  librarianOrAdmin,
  validate(objectIdParam, 'params'),
  validate(payFine),
  libraryController.payFine
);

// ── Reports ────────────────────────────────────────────────
router.get('/reports/summary', librarianOrAdmin, libraryController.getSummary);

module.exports = router;
