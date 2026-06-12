const express = require('express');
const router = express.Router();
const libraryController = require('../controllers/libraryController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes are protected
router.use(authenticate);

// ── Books ──────────────────────────────────────────────────
router
  .route('/books')
  .get(libraryController.getBooks)
  .post(authorize('admin', 'librarian'), libraryController.addBook);

router
  .route('/books/:id')
  .put(authorize('admin', 'librarian'), libraryController.updateBook)
  .delete(authorize('admin', 'librarian'), libraryController.deleteBook);

// Issue book
router.post('/books/:id/issue', authorize('admin', 'librarian'), libraryController.issueBook);

// ── Transactions ───────────────────────────────────────────
router.get('/transactions', authorize('admin', 'librarian'), libraryController.getTransactions);

// Return book
router.post(
  '/transactions/:id/return',
  authorize('admin', 'librarian'),
  libraryController.returnBook
);

// ── Overdue ────────────────────────────────────────────────
router.get('/overdue', authorize('admin', 'librarian'), libraryController.getOverdue);

module.exports = router;
