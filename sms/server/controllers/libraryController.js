const Book = require('../models/Book');
const BookTransaction = require('../models/BookTransaction');
const Student = require('../models/Student');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// ── Books ──────────────────────────────────────────────────

// @desc    Get all books with filters and pagination
// @route   GET /api/v1/library/books
// @access  Admin, Librarian
exports.getBooks = catchAsync(async (req, res) => {
  const {
    category,
    status,
    search,
    page = 1,
    limit = 20,
    sort = 'title',
  } = req.query;

  const query = {};

  if (category) query.category = category;
  if (status) query.status = status;

  // Search by title, author, ISBN
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { author: { $regex: search, $options: 'i' } },
      { isbn: { $regex: search, $options: 'i' } },
      { publisher: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [books, total] = await Promise.all([
    Book.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Book.countDocuments(query),
  ]);

  const meta = {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit)),
  };

  return ApiResponse.success(res, { books, meta }, 'Books retrieved successfully');
});

// @desc    Add new book
// @route   POST /api/v1/library/books
// @access  Admin, Librarian
exports.addBook = catchAsync(async (req, res) => {
  const {
    title,
    author,
    isbn,
    publisher,
    publicationYear,
    category,
    totalCopies,
    availableCopies,
    shelfLocation,
    description,
    language,
    pages,
    price,
  } = req.body;

  // Check if ISBN already exists
  if (isbn) {
    const existing = await Book.findOne({ isbn });
    if (existing) {
      throw new ApiError('Book with this ISBN already exists', 400);
    }
  }

  const book = await Book.create({
    title,
    author,
    isbn,
    publisher,
    publicationYear,
    category,
    totalCopies: totalCopies || 1,
    availableCopies: availableCopies !== undefined ? availableCopies : totalCopies || 1,
    shelfLocation,
    description,
    language,
    pages,
    price,
  });

  return ApiResponse.success(res, { book }, 'Book added successfully', 201);
});

// @desc    Update book details
// @route   PUT /api/v1/library/books/:id
// @access  Admin, Librarian
exports.updateBook = catchAsync(async (req, res) => {
  const {
    title,
    author,
    isbn,
    publisher,
    publicationYear,
    category,
    totalCopies,
    shelfLocation,
    description,
    language,
    pages,
    price,
    status,
  } = req.body;

  const book = await Book.findById(req.params.id);
  if (!book) {
    throw new ApiError('Book not found', 404);
  }

  const updateData = {};
  if (title) updateData.title = title;
  if (author) updateData.author = author;
  if (isbn) updateData.isbn = isbn;
  if (publisher) updateData.publisher = publisher;
  if (publicationYear) updateData.publicationYear = publicationYear;
  if (category) updateData.category = category;
  if (totalCopies) updateData.totalCopies = totalCopies;
  if (shelfLocation) updateData.shelfLocation = shelfLocation;
  if (description !== undefined) updateData.description = description;
  if (language) updateData.language = language;
  if (pages) updateData.pages = pages;
  if (price) updateData.price = price;
  if (status) updateData.status = status;

  const updatedBook = await Book.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );

  return ApiResponse.success(res, { book: updatedBook }, 'Book updated successfully');
});

// @desc    Delete book (soft delete if no active transactions)
// @route   DELETE /api/v1/library/books/:id
// @access  Admin, Librarian
exports.deleteBook = catchAsync(async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) {
    throw new ApiError('Book not found', 404);
  }

  // Check for active transactions
  const activeTransactions = await BookTransaction.countDocuments({
    book: book._id,
    status: 'issued',
  });

  if (activeTransactions > 0) {
    throw new ApiError(
      `Cannot delete book. ${activeTransactions} active transaction(s) exist.`,
      400
    );
  }

  book.status = 'inactive';
  await book.save();

  return ApiResponse.success(res, null, 'Book deleted successfully');
});

// ── Book Transactions ──────────────────────────────────────

// @desc    Issue book to student
// @route   POST /api/v1/library/books/:id/issue
// @access  Librarian
exports.issueBook = catchAsync(async (req, res) => {
  const { studentId, issueDate, dueDate, remarks } = req.body;

  const book = await Book.findById(req.params.id);
  if (!book) {
    throw new ApiError('Book not found', 404);
  }

  // Check availability
  if (book.availableCopies <= 0) {
    throw new ApiError('Book is not available for issue', 400);
  }

  // Check if student already has this book issued
  const existingIssue = await BookTransaction.findOne({
    book: book._id,
    student: studentId,
    status: 'issued',
  });

  if (existingIssue) {
    throw new ApiError('Student already has this book issued', 400);
  }

  // Create transaction
  const transaction = await BookTransaction.create({
    book: book._id,
    student: studentId,
    issueDate: issueDate || new Date(),
    dueDate: dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days default
    status: 'issued',
    remarks,
    issuedBy: req.user.id,
  });

  // Decrement available copies
  book.availableCopies -= 1;
  await book.save();

  const populatedTransaction = await BookTransaction.findById(transaction._id)
    .populate('book', 'title author isbn')
    .populate('student', 'firstName lastName admissionNo');

  return ApiResponse.success(
    res,
    { transaction: populatedTransaction },
    'Book issued successfully',
    201
  );
});

// @desc    Return book
// @route   POST /api/v1/library/transactions/:id/return
// @access  Librarian
exports.returnBook = catchAsync(async (req, res) => {
  const { returnDate, remarks } = req.body;

  const transaction = await BookTransaction.findById(req.params.id);
  if (!transaction) {
    throw new ApiError('Transaction not found', 404);
  }

  if (transaction.status === 'returned') {
    throw new ApiError('Book is already returned', 400);
  }

  const actualReturnDate = returnDate ? new Date(returnDate) : new Date();
  const dueDate = new Date(transaction.dueDate);

  // Calculate fine if overdue
  let fine = 0;
  const finePerDay = 5; // Default fine per day
  if (actualReturnDate > dueDate) {
    const overdueDays = Math.ceil(
      (actualReturnDate - dueDate) / (1000 * 60 * 60 * 24)
    );
    fine = overdueDays * finePerDay;
  }

  // Update transaction
  transaction.returnDate = actualReturnDate;
  transaction.status = 'returned';
  transaction.fine = fine;
  transaction.remarks = remarks || transaction.remarks;
  transaction.receivedBy = req.user.id;

  await transaction.save();

  // Increment available copies
  await Book.findByIdAndUpdate(transaction.book, { $inc: { availableCopies: 1 } });

  const populatedTransaction = await BookTransaction.findById(transaction._id)
    .populate('book', 'title author isbn')
    .populate('student', 'firstName lastName admissionNo');

  return ApiResponse.success(
    res,
    { transaction: populatedTransaction },
    fine > 0 ? `Book returned with fine of ${fine}` : 'Book returned successfully'
  );
});

// @desc    Get all transactions with filters
// @route   GET /api/v1/library/transactions
// @access  Admin, Librarian
exports.getTransactions = catchAsync(async (req, res) => {
  const {
    book,
    student,
    status,
    page = 1,
    limit = 20,
  } = req.query;

  const query = {};

  if (book) query.book = book;
  if (student) query.student = student;
  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [transactions, total] = await Promise.all([
    BookTransaction.find(query)
      .populate('book', 'title author isbn')
      .populate('student', 'firstName lastName admissionNo')
      .sort('-issueDate')
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    BookTransaction.countDocuments(query),
  ]);

  const meta = {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit)),
  };

  return ApiResponse.success(res, { transactions, meta }, 'Transactions retrieved');
});

// @desc    Get overdue books
// @route   GET /api/v1/library/overdue
// @access  Admin, Librarian
exports.getOverdue = catchAsync(async (req, res) => {
  const now = new Date();

  const overdueTransactions = await BookTransaction.find({
    dueDate: { $lt: now },
    status: 'issued',
  })
    .populate('book', 'title author isbn')
    .populate('student', 'firstName lastName admissionNo currentClass')
    .sort('dueDate')
    .lean();

  // Calculate overdue days and fine
  const overdue = overdueTransactions.map((t) => {
    const overdueDays = Math.ceil((now - new Date(t.dueDate)) / (1000 * 60 * 60 * 24));
    const finePerDay = 5;
    return {
      ...t,
      overdueDays,
      estimatedFine: overdueDays * finePerDay,
    };
  });

  return ApiResponse.success(
    res,
    { overdue, count: overdue.length },
    'Overdue books retrieved'
  );
});
