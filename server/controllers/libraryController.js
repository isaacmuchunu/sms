const db = require('../db');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { scopeBySchool, getSchoolFilter } = require('../middleware/auth');

// Default circulation settings (can be moved to LibrarySettings model)
const SETTINGS = {
  maxBooksStudent: 3,
  maxBooksTeacher: 5,
  issueDaysStudent: 14,
  issueDaysTeacher: 30,
  finePerDay: 5,
  graceDays: 2,
  maxFinePerBook: 500,
  fineBlockThreshold: 100,
  holdHours: 48,
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const calculateFine = (dueDate, returnDate) => {
  const msPerDay = 24 * 60 * 60 * 1000;
  const overdueDays = Math.max(
    0,
    Math.ceil((new Date(returnDate) - new Date(dueDate)) / msPerDay)
  );
  const fineDays = Math.max(0, overdueDays - SETTINGS.graceDays);
  return Math.min(fineDays * SETTINGS.finePerDay, SETTINGS.maxFinePerBook);
};

// ── key / casing helpers ───────────────────────────────────

const { buildOrderBy } = require('../utils/sort');

const toCamel = (str) => str.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
const toSnake = (str) => str.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);

const camelize = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(camelize);
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[toCamel(k)] = v;
  return out;
};

const snakeify = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[toSnake(k)] = v;
  }
  return out;
};

const BOOK_SORT_ALLOWLIST = {
  createdAt: '"created_at"',
  title: '"title"',
  author: '"author"',
  isbn: '"isbn"',
  publisher: '"publisher"',
  category: '"category"',
  status: '"status"',
};

const COPY_SORT_ALLOWLIST = {
  createdAt: '"created_at"',
  accessionNo: '"accession_no"',
  status: '"status"',
  condition: '"condition"',
};

const ISSUE_SORT_ALLOWLIST = {
  createdAt: 'bi.created_at',
  issueDate: 'bi.issue_date',
  dueDate: 'bi.due_date',
  returnDate: 'bi.return_date',
  status: 'bi.status',
  fineAmount: 'bi.fine_amount',
};

const RESERVATION_SORT_ALLOWLIST = {
  createdAt: 'br.created_at',
  queuePosition: 'br.queue_position',
  reservedAt: 'br.reserved_at',
  status: 'br.status',
};

const FINE_SORT_ALLOWLIST = {
  createdAt: 'bi.created_at',
  fineAmount: 'bi.fine_amount',
  finePaid: 'bi.fine_paid',
  status: 'bi.status',
};

const resolveUserId = (user) => user?._id || user?.id;

const generateAccessionNo = async (bookId, index = 0, schoolId) => {
  const year = new Date().getFullYear();
  const count = await db.count('book_copies', { book_id: bookId, ...getSchoolFilter({ user: { school_id: schoolId, role: 'admin' } }) });
  return `ACC-${year}-${String(count + index + 1).padStart(5, '0')}`;
};

const resolveStudentIdForUser = async (user) => {
  if (user.role === 'student') {
    const student = await db.findOne('students', { user_id: resolveUserId(user), ...getSchoolFilter({ user }) });
    return student?.id || null;
  }
  return null;
};

// ── populated response mappers ─────────────────────────────

const issueSelect = `
  bi.*,
  b.title AS book_title, b.isbn AS book_isbn, b.author AS book_author,
  bc.accession_no AS book_copy_accession_no,
  s.first_name AS student_first_name, s.last_name AS student_last_name, s.admission_no AS student_admission_no,
  u1.name AS issued_by_name, u1.email AS issued_by_email,
  u2.name AS returned_by_name, u2.email AS returned_by_email
`;

const issueJoins = `
  FROM book_issues bi
  LEFT JOIN books b ON bi.book_id = b.id
  LEFT JOIN book_copies bc ON bi.book_copy_id = bc.id
  LEFT JOIN students s ON bi.student_id = s.id
  LEFT JOIN users u1 ON bi.issued_by_id = u1.id
  LEFT JOIN users u2 ON bi.returned_by_id = u2.id
`;

const mapIssueRow = (row) => {
  const issue = camelize(row);
  issue.book = row.book_title
    ? camelize({ title: row.book_title, isbn: row.book_isbn, author: row.book_author })
    : undefined;
  issue.bookCopy = row.book_copy_accession_no
    ? camelize({ accession_no: row.book_copy_accession_no })
    : undefined;
  issue.student = row.student_first_name
    ? camelize({
        first_name: row.student_first_name,
        last_name: row.student_last_name,
        admission_no: row.student_admission_no,
      })
    : undefined;
  issue.issuedBy = row.issued_by_name
    ? camelize({ name: row.issued_by_name, email: row.issued_by_email })
    : undefined;
  issue.returnedBy = row.returned_by_name
    ? camelize({ name: row.returned_by_name, email: row.returned_by_email })
    : undefined;

  [
    'bookTitle', 'bookIsbn', 'bookAuthor',
    'bookCopyAccessionNo',
    'studentFirstName', 'studentLastName', 'studentAdmissionNo',
    'issuedByName', 'issuedByEmail',
    'returnedByName', 'returnedByEmail',
  ].forEach((k) => delete issue[k]);

  return issue;
};

const reservationSelect = `
  br.*,
  b.title AS book_title, b.isbn AS book_isbn, b.author AS book_author,
  s.first_name AS student_first_name, s.last_name AS student_last_name, s.admission_no AS student_admission_no
`;

const reservationJoins = `
  FROM book_reservations br
  LEFT JOIN books b ON br.book_id = b.id
  LEFT JOIN students s ON br.student_id = s.id
`;

const mapReservationRow = (row) => {
  const reservation = camelize(row);
  reservation.book = row.book_title
    ? camelize({ title: row.book_title, isbn: row.book_isbn, author: row.book_author })
    : undefined;
  reservation.student = row.student_first_name
    ? camelize({
        first_name: row.student_first_name,
        last_name: row.student_last_name,
        admission_no: row.student_admission_no,
      })
    : undefined;

  [
    'bookTitle', 'bookIsbn', 'bookAuthor',
    'studentFirstName', 'studentLastName', 'studentAdmissionNo',
  ].forEach((k) => delete reservation[k]);

  return reservation;
};

const mapBookCopyRow = (row) => {
  const copy = camelize(row);
  copy.book = row.book_title
    ? camelize({ title: row.book_title, isbn: row.book_isbn, author: row.book_author })
    : undefined;
  ['bookTitle', 'bookIsbn', 'bookAuthor'].forEach((k) => delete copy[k]);
  return copy;
};

// ── Books ──────────────────────────────────────────────────

exports.getBooks = catchAsync(async (req, res) => {
  const { search, category, status, page, limit, skip, sort } = req.query;

  const conditions = [];
  const values = [];

  conditions.push(`school_id = $${values.length + 1}`);
  values.push(req.user.role === 'super_admin' && req.query.schoolId ? req.query.schoolId : req.user.school_id);

  if (category) {
    conditions.push(`category = $${values.length + 1}`);
    values.push(category);
  }
  if (status) {
    conditions.push(`status = $${values.length + 1}`);
    values.push(status);
  }
  if (search) {
    const term = `%${search}%`;
    conditions.push(`(
      title ILIKE $${values.length + 1}
      OR author ILIKE $${values.length + 2}
      OR isbn ILIKE $${values.length + 3}
      OR publisher ILIKE $${values.length + 4}
    )`);
    values.push(term, term, term, term);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = buildOrderBy(sort, undefined, BOOK_SORT_ALLOWLIST, '"created_at" DESC');
  const limitNum = parseInt(limit, 10) || 10;
  const skipNum = parseInt(skip, 10) || 0;

  const [booksRows, countRows] = await Promise.all([
    db.raw(
      `SELECT * FROM books ${where} ORDER BY ${orderBy} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limitNum, skipNum]
    ),
    db.raw(`SELECT COUNT(*)::int AS count FROM books ${where}`, [...values]),
  ]);

  const books = booksRows.map(camelize);
  const total = countRows[0]?.count || 0;

  return ApiResponse.success(
    res,
    { books, meta: getPaginationMeta(page, limit, total) },
    'Books retrieved successfully'
  );
});

exports.getBook = catchAsync(async (req, res) => {
  const bookRow = await db.findOne('books', { id: req.params.id, ...getSchoolFilter(req) });
  if (!bookRow) throw new ApiError('Book not found', 404);

  const copiesRows = await db.findMany('book_copies', {
    where: { book_id: req.params.id, ...getSchoolFilter(req) },
    orderBy: 'accession_no ASC',
  });

  const book = camelize(bookRow);
  book.copies = copiesRows.map(camelize);

  return ApiResponse.success(
    res,
    { book },
    'Book retrieved successfully'
  );
});

exports.createBook = catchAsync(async (req, res) => {
  const { totalCopies = 1, availableCopies, ...bookData } = req.body;

  if (bookData.isbn) {
    const existingIsbn = await db.findOne('books', { isbn: bookData.isbn, ...getSchoolFilter(req) });
    if (existingIsbn) throw new ApiError('Book with this ISBN already exists', 409);
  }

  const bookPayload = snakeify(bookData);
  bookPayload.total_copies = Number(totalCopies);
  bookPayload.available_copies =
    availableCopies !== undefined ? Number(availableCopies) : Number(totalCopies);
  bookPayload.school_id = req.user.school_id;

  const bookRow = await db.insert('books', bookPayload);

  for (let i = 0; i < Number(totalCopies); i++) {
    await db.insert('book_copies', {
      book_id: bookRow.id,
      accession_no: await generateAccessionNo(bookRow.id, i, req.user.school_id),
      status: 'available',
      condition: 'good',
      school_id: req.user.school_id,
    });
  }

  const copiesRows = await db.findMany('book_copies', {
    where: { book_id: bookRow.id, ...getSchoolFilter(req) },
    orderBy: 'accession_no ASC',
  });

  const book = camelize(bookRow);
  book.copies = copiesRows.map(camelize);

  return ApiResponse.success(
    res,
    { book },
    'Book added successfully',
    201
  );
});

exports.updateBook = catchAsync(async (req, res) => {
  const bookRow = await db.findOne('books', { id: req.params.id, ...getSchoolFilter(req) });
  if (!bookRow) throw new ApiError('Book not found', 404);

  if (req.body.isbn && req.body.isbn !== bookRow.isbn) {
    const existing = await db.findOne('books', { isbn: req.body.isbn, ...getSchoolFilter(req) });
    if (existing) throw new ApiError('Book with this ISBN already exists', 409);
  }

  const data = snakeify(req.body);
  delete data.id;

  const [updatedBook] = await db.update('books', data, { id: req.params.id });

  return ApiResponse.success(
    res,
    { book: camelize(updatedBook) },
    'Book updated successfully'
  );
});

exports.deleteBook = catchAsync(async (req, res) => {
  const bookRow = await db.findOne('books', { id: req.params.id, ...getSchoolFilter(req) });
  if (!bookRow) throw new ApiError('Book not found', 404);

  const activeIssuesCount = await db.raw(
    `SELECT COUNT(*)::int AS count FROM book_issues bi
     JOIN books b ON bi.book_id = b.id
     WHERE bi.book_id = $1 AND bi.status IN ('issued', 'overdue') AND b.school_id = $2`,
    [req.params.id, req.user.school_id]
  );
  const activeIssues = activeIssuesCount[0]?.count || 0;

  if (activeIssues > 0) {
    throw new ApiError(
      `Cannot delete book. ${activeIssues} active issue(s) exist.`,
      400
    );
  }

  await db.update('books', { status: 'inactive' }, { id: req.params.id });

  return ApiResponse.success(res, null, 'Book deleted successfully');
});

// ── Book Copies ────────────────────────────────────────────

exports.getBookCopies = catchAsync(async (req, res) => {
  const { status, page, limit, skip, sort } = req.query;
  const { id } = req.params;

  const bookRow = await db.findOne('books', { id, ...getSchoolFilter(req) });
  if (!bookRow) throw new ApiError('Book not found', 404);

  const where = { book_id: id };
  if (status) where.status = status;

  const [copiesRows, total] = await Promise.all([
    db.findMany('book_copies', {
      where,
      orderBy: buildOrderBy(sort, undefined, COPY_SORT_ALLOWLIST, '"created_at" DESC'),
      limit: parseInt(limit, 10) || 10,
      offset: parseInt(skip, 10) || 0,
    }),
    db.count('book_copies', where),
  ]);

  const copies = copiesRows.map(camelize);

  return ApiResponse.success(
    res,
    { copies, meta: getPaginationMeta(page, limit, total) },
    'Book copies retrieved successfully'
  );
});

exports.addBookCopy = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { accessionNo, count = 1, ...copyData } = req.body;

  const bookRow = await db.findOne('books', { id, ...getSchoolFilter(req) });
  if (!bookRow) throw new ApiError('Book not found', 404);

  const copyPayload = snakeify(copyData);
  const createdIds = [];

  for (let i = 0; i < Number(count); i++) {
    const generatedNo = accessionNo
      ? Number(count) === 1
        ? accessionNo
        : `${accessionNo}-${i + 1}`
      : await generateAccessionNo(bookRow.id, i, req.user.school_id);

    const copy = await db.insert('book_copies', {
      book_id: bookRow.id,
      accession_no: generatedNo,
      ...copyPayload,
      school_id: req.user.school_id,
    });
    createdIds.push(copy.id);
  }

  const incrementAvailable =
    copyPayload.status === 'available' || !copyPayload.status ? Number(count) : 0;
  await db.raw(
    'UPDATE books SET total_copies = total_copies + $1, available_copies = available_copies + $2 WHERE id = $3',
    [Number(count), incrementAvailable, bookRow.id]
  );

  const copiesRows = await db.raw(
    `SELECT * FROM book_copies WHERE id = ANY($1::uuid[]) ORDER BY created_at DESC`,
    [createdIds]
  );

  return ApiResponse.success(
    res,
    { copies: copiesRows.map(camelize) },
    `${count} book copy(s) added successfully`,
    201
  );
});

exports.getCopy = catchAsync(async (req, res) => {
  const { clause, params } = scopeBySchool(req, 0);
  const rows = await db.raw(
    `SELECT bc.*, b.title AS book_title, b.isbn AS book_isbn, b.author AS book_author
     FROM book_copies bc
     LEFT JOIN books b ON bc.book_id = b.id
     WHERE ${clause.replace('school_id', 'bc.school_id')} AND bc.id = $${params.length + 1}`,
    [...params, req.params.id]
  );
  const copy = rows[0];
  if (!copy) throw new ApiError('Book copy not found', 404);

  return ApiResponse.success(
    res,
    { copy: mapBookCopyRow(copy) },
    'Book copy retrieved successfully'
  );
});

exports.updateCopy = catchAsync(async (req, res) => {
  const copyRow = await db.findOne('book_copies', { id: req.params.id, ...getSchoolFilter(req) });
  if (!copyRow) throw new ApiError('Book copy not found', 404);

  if (req.body.accessionNo && req.body.accessionNo !== copyRow.accession_no) {
    const existing = await db.raw(
      `SELECT * FROM book_copies WHERE accession_no = $1 AND id <> $2 AND school_id = $3 LIMIT 1`,
      [req.body.accessionNo, req.params.id, req.user.school_id]
    );
    if (existing[0]) throw new ApiError('Accession number already exists', 409);
  }

  const oldStatus = copyRow.status;
  const data = snakeify(req.body);
  delete data.id;

  const [updatedCopy] = await db.update('book_copies', data, { id: req.params.id });
  const newStatus = updatedCopy.status;

  const terminalStatuses = ['lost', 'damaged', 'withdrawn'];
  let incAvailable = 0;
  let incTotal = 0;

  if (oldStatus === 'available' && newStatus !== 'available' && !['issued', 'reserved'].includes(newStatus)) {
    incAvailable = -1;
  } else if (oldStatus !== 'available' && newStatus === 'available' && !['issued', 'reserved'].includes(oldStatus)) {
    incAvailable = 1;
  }

  if (!terminalStatuses.includes(oldStatus) && terminalStatuses.includes(newStatus)) {
    incTotal = -1;
  } else if (terminalStatuses.includes(oldStatus) && !terminalStatuses.includes(newStatus)) {
    incTotal = 1;
  }

  if (incAvailable !== 0 || incTotal !== 0) {
    await db.raw(
      'UPDATE books SET available_copies = available_copies + $1, total_copies = total_copies + $2 WHERE id = $3',
      [incAvailable, incTotal, copyRow.book_id]
    );
  }

  return ApiResponse.success(
    res,
    { copy: camelize(updatedCopy) },
    'Book copy updated successfully'
  );
});

exports.deleteCopy = catchAsync(async (req, res) => {
  const copyRow = await db.findOne('book_copies', { id: req.params.id, ...getSchoolFilter(req) });
  if (!copyRow) throw new ApiError('Book copy not found', 404);

  if (copyRow.status === 'issued' || copyRow.status === 'reserved') {
    throw new ApiError('Cannot delete a copy that is issued or reserved', 400);
  }

  const terminalStatuses = ['lost', 'damaged', 'withdrawn'];
  const decrementTotal = terminalStatuses.includes(copyRow.status) ? 0 : 1;
  const decrementAvailable = copyRow.status === 'available' ? 1 : 0;

  await db.raw(
    'UPDATE books SET total_copies = total_copies - $1, available_copies = available_copies - $2 WHERE id = $3',
    [decrementTotal, decrementAvailable, copyRow.book_id]
  );

  await db.delete('book_copies', { id: req.params.id });

  return ApiResponse.success(res, null, 'Book copy deleted successfully');
});

// ── Issues / Transactions ──────────────────────────────────

exports.getIssues = catchAsync(async (req, res) => {
  const { book, student, status: statusFilter, overdue, page, limit, skip, sort } = req.query;
  const studentIdForUser = await resolveStudentIdForUser(req.user);

  const conditions = ['bi.school_id = $1'];
  const values = [req.user.role === 'super_admin' && req.query.schoolId ? req.query.schoolId : req.user.school_id];

  if (studentIdForUser) {
    conditions.push(`bi.student_id = $${values.length + 1}`);
    values.push(studentIdForUser);
  } else if (student) {
    conditions.push(`bi.student_id = $${values.length + 1}`);
    values.push(student);
  }

  if (book) {
    conditions.push(`bi.book_id = $${values.length + 1}`);
    values.push(book);
  }

  if (statusFilter) {
    if (Array.isArray(statusFilter)) {
      const placeholders = statusFilter.map((_, i) => `$${values.length + i + 1}`).join(', ');
      conditions.push(`bi.status IN (${placeholders})`);
      values.push(...statusFilter);
    } else {
      conditions.push(`bi.status = $${values.length + 1}`);
      values.push(statusFilter);
    }
  }

  if (overdue === true || overdue === 'true') {
    conditions.push(`bi.due_date < NOW() AND bi.status IN ('issued', 'overdue')`);
  }

  const where = conditions.join(' AND ');
  const orderBy = buildOrderBy(sort, undefined, ISSUE_SORT_ALLOWLIST, 'bi.created_at DESC');
  const limitNum = parseInt(limit, 10) || 10;
  const skipNum = parseInt(skip, 10) || 0;

  const [issuesRows, countRows] = await Promise.all([
    db.raw(
      `SELECT ${issueSelect} ${issueJoins} WHERE ${where} ORDER BY ${orderBy} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limitNum, skipNum]
    ),
    db.raw(`SELECT COUNT(*)::int AS count FROM book_issues bi WHERE ${where}`, [...values]),
  ]);

  const issues = issuesRows.map(mapIssueRow);
  const total = countRows[0]?.count || 0;

  return ApiResponse.success(
    res,
    { issues, meta: getPaginationMeta(page, limit, total) },
    'Issues retrieved successfully'
  );
});

exports.getStudentIssues = catchAsync(async (req, res) => {
  const { studentId } = req.params;

  if (req.user.role === 'parent') {
    const guardian = await db.findOne('guardians', { user_id: resolveUserId(req.user), ...getSchoolFilter(req) });
    if (!guardian) throw new ApiError('Guardian profile not found', 404);

    const student = await db.findOne('students', { id: studentId, ...getSchoolFilter(req) });
    if (!student) throw new ApiError('Student not found', 404);

    const relation = await db.findOne('student_guardians', {
      student_id: studentId,
      guardian_id: guardian.id,
    });
    if (!relation) {
      throw new ApiError('Not authorized to view this student', 403);
    }
  } else if (!['admin', 'super_admin', 'teacher', 'librarian'].includes(req.user.role)) {
    throw new ApiError('Not authorized', 403);
  }

  const issuesRows = await db.raw(
    `SELECT ${issueSelect} ${issueJoins}
     WHERE bi.student_id = $1 AND bi.school_id = $2 AND bi.status IN ('issued', 'overdue')
     ORDER BY bi.issue_date DESC`,
    [studentId, req.user.role === 'super_admin' && req.query.schoolId ? req.query.schoolId : req.user.school_id]
  );

  return ApiResponse.success(
    res,
    { issues: issuesRows.map(mapIssueRow) },
    'Student issues retrieved'
  );
});

exports.createIssue = catchAsync(async (req, res) => {
  const { bookCopyId, studentId, issueDate, dueDate, remarks } = req.body;
  const bookId = req.body.bookId || req.params.id;

  const student = await db.findOne('students', { id: studentId, ...getSchoolFilter(req) });
  if (!student || student.status !== 'active') {
    throw new ApiError('Student not found or inactive', 404);
  }

  // Outstanding fine check
  const outstandingFine = await db.raw(
    `SELECT COALESCE(SUM(fine_amount - fine_paid), 0) AS total
     FROM book_issues
     WHERE student_id = $1 AND school_id = $2 AND fine_amount > fine_paid`,
    [studentId, req.user.school_id]
  );
  const totalFine = parseFloat(outstandingFine[0]?.total) || 0;
  if (totalFine > SETTINGS.fineBlockThreshold) {
    throw new ApiError(
      `Outstanding fine of ${totalFine} exceeds threshold. Please clear dues before issuing books.`,
      409
    );
  }

  // Issue limit check
  const activeIssuesCount = await db.raw(
    `SELECT COUNT(*)::int AS count FROM book_issues
     WHERE student_id = $1 AND school_id = $2 AND status IN ('issued', 'overdue')`,
    [studentId, req.user.school_id]
  );
  const activeIssues = activeIssuesCount[0]?.count || 0;

  const maxBooks = SETTINGS.maxBooksStudent;
  if (activeIssues >= maxBooks) {
    throw new ApiError(`Issue limit reached (${maxBooks} books)`, 409);
  }

  // Resolve copy
  let copy;
  if (bookCopyId) {
    copy = await db.findOne('book_copies', { id: bookCopyId, ...getSchoolFilter(req) });
  } else if (bookId) {
    const rows = await db.raw(
      `SELECT bc.* FROM book_copies bc
       JOIN books b ON bc.book_id = b.id
       WHERE bc.book_id = $1 AND bc.school_id = $2 AND bc.status = 'available' LIMIT 1`,
      [bookId, req.user.school_id]
    );
    copy = rows[0];
  }

  if (!copy) {
    throw new ApiError(
      bookCopyId ? 'Book copy not found' : 'No available copy for this book',
      404
    );
  }

  if (copy.status !== 'available') {
    throw new ApiError('Book copy is not available for issue', 409);
  }

  const existingIssue = await db.raw(
    `SELECT bi.* FROM book_issues bi
     JOIN books b ON bi.book_id = b.id
     WHERE bi.book_id = $1 AND bi.student_id = $2 AND bi.school_id = $3 AND bi.status IN ('issued', 'overdue')
     LIMIT 1`,
    [copy.book_id, studentId, req.user.school_id]
  );
  if (existingIssue[0]) {
    throw new ApiError('Student already has an active issue for this book', 409);
  }

  const calculatedDueDate = dueDate
    ? new Date(dueDate)
    : addDays(issueDate || new Date(), SETTINGS.issueDaysStudent);

  const issueRow = await db.insert('book_issues', {
    book_copy_id: copy.id,
    book_id: copy.book_id,
    student_id: studentId,
    issue_date: issueDate || new Date(),
    due_date: calculatedDueDate,
    status: 'issued',
    issued_by_id: resolveUserId(req.user),
    remarks: remarks || '',
    school_id: req.user.school_id,
  });

  await db.update('book_copies', { status: 'issued' }, { id: copy.id });
  await db.raw(
    'UPDATE books SET available_copies = available_copies - 1 WHERE id = $1',
    [copy.book_id]
  );

  const populatedRows = await db.raw(
    `SELECT ${issueSelect} ${issueJoins} WHERE bi.id = $1`,
    [issueRow.id]
  );

  return ApiResponse.success(
    res,
    { issue: mapIssueRow(populatedRows[0]) },
    'Book issued successfully',
    201
  );
});

exports.returnIssue = catchAsync(async (req, res) => {
  const { returnDate, fineAmount: manualFine, remarks } = req.body;

  const issueRow = await db.findOne('book_issues', { id: req.params.id, ...getSchoolFilter(req) });
  if (!issueRow) throw new ApiError('Issue not found', 404);
  if (issueRow.status === 'returned') throw new ApiError('Book is already returned', 400);

  const actualReturnDate = returnDate ? new Date(returnDate) : new Date();
  const calculatedFine = calculateFine(issueRow.due_date, actualReturnDate);
  const fine = manualFine !== undefined ? manualFine : calculatedFine;

  const updateData = {
    return_date: actualReturnDate,
    status: 'returned',
    fine_amount: fine,
    returned_by_id: resolveUserId(req.user),
  };
  if (remarks !== undefined) updateData.remarks = remarks;
  await db.update('book_issues', updateData, { id: req.params.id });

  const nextReservationRows = await db.raw(
    `SELECT * FROM book_reservations
     WHERE book_id = $1 AND school_id = $2 AND status = 'pending'
     ORDER BY queue_position ASC, reserved_at ASC
     LIMIT 1`,
    [issueRow.book_id, req.user.school_id]
  );
  const nextReservation = nextReservationRows[0];

  if (nextReservation) {
    const holdExpiry = addDays(new Date(), SETTINGS.holdHours / 24);
    await db.update(
      'book_reservations',
      {
        status: 'hold',
        expires_at: holdExpiry,
        notified_at: new Date(),
      },
      { id: nextReservation.id }
    );
    await db.update('book_copies', { status: 'reserved' }, { id: issueRow.book_copy_id });
  } else {
    await db.update('book_copies', { status: 'available' }, { id: issueRow.book_copy_id });
    await db.raw(
      'UPDATE books SET available_copies = available_copies + 1 WHERE id = $1',
      [issueRow.book_id]
    );
  }

  const populatedRows = await db.raw(
    `SELECT ${issueSelect} ${issueJoins} WHERE bi.id = $1`,
    [issueRow.id]
  );

  const message = fine > 0 ? `Book returned with fine of ${fine}` : 'Book returned successfully';
  return ApiResponse.success(res, { issue: mapIssueRow(populatedRows[0]) }, message);
});

exports.renewIssue = catchAsync(async (req, res) => {
  const { dueDate, remarks } = req.body;

  const issueRow = await db.findOne('book_issues', { id: req.params.id, ...getSchoolFilter(req) });
  if (!issueRow) throw new ApiError('Issue not found', 404);
  if (issueRow.status !== 'issued') throw new ApiError('Only active issues can be renewed', 400);

  const activeReservationRows = await db.raw(
    `SELECT * FROM book_reservations
     WHERE book_id = $1 AND school_id = $2 AND status IN ('pending', 'hold')
     LIMIT 1`,
    [issueRow.book_id, req.user.school_id]
  );
  if (activeReservationRows[0]) {
    throw new ApiError('Cannot renew. Another user has reserved this book.', 409);
  }

  const updateData = { due_date: new Date(dueDate) };
  if (remarks !== undefined) updateData.remarks = remarks;
  await db.update('book_issues', updateData, { id: req.params.id });

  const populatedRows = await db.raw(
    `SELECT ${issueSelect} ${issueJoins} WHERE bi.id = $1`,
    [issueRow.id]
  );

  return ApiResponse.success(
    res,
    { issue: mapIssueRow(populatedRows[0]) },
    'Book renewed successfully'
  );
});

exports.getOverdue = catchAsync(async (req, res) => {
  const now = new Date();

  await db.raw(
    `UPDATE book_issues SET status = 'overdue' WHERE school_id = $1 AND due_date < NOW() AND status = 'issued'`,
    [req.user.role === 'super_admin' && req.query.schoolId ? req.query.schoolId : req.user.school_id]
  );

  const { page, limit, skip, sort } = req.query;
  const orderBy = buildOrderBy(sort, undefined, ISSUE_SORT_ALLOWLIST, 'bi.created_at DESC');
  const limitNum = parseInt(limit, 10) || 10;
  const skipNum = parseInt(skip, 10) || 0;
  const schoolId = req.user.role === 'super_admin' && req.query.schoolId ? req.query.schoolId : req.user.school_id;

  const [issuesRows, countRows] = await Promise.all([
    db.raw(
      `SELECT ${issueSelect} ${issueJoins}
       WHERE bi.school_id = $1 AND bi.status = 'overdue'
       ORDER BY ${orderBy} LIMIT $2 OFFSET $3`,
      [schoolId, limitNum, skipNum]
    ),
    db.raw(`SELECT COUNT(*)::int AS count FROM book_issues WHERE school_id = $1 AND status = 'overdue'`, [schoolId]),
  ]);

  const issues = issuesRows.map(mapIssueRow);
  const total = countRows[0]?.count || 0;

  const overdue = issues.map((issue) => {
    const msPerDay = 24 * 60 * 60 * 1000;
    const overdueDays = Math.ceil((now - new Date(issue.dueDate)) / msPerDay);
    const estimatedFine = calculateFine(issue.dueDate, now);
    return { ...issue, overdueDays, estimatedFine };
  });

  return ApiResponse.success(
    res,
    { overdue, meta: getPaginationMeta(page, limit, total) },
    'Overdue books retrieved successfully'
  );
});

// ── Reservations ───────────────────────────────────────────

exports.getReservations = catchAsync(async (req, res) => {
  const { book, student, status: statusFilter, page, limit, skip, sort } = req.query;
  const studentIdForUser = await resolveStudentIdForUser(req.user);

  const conditions = ['br.school_id = $1'];
  const values = [req.user.role === 'super_admin' && req.query.schoolId ? req.query.schoolId : req.user.school_id];

  if (studentIdForUser) {
    conditions.push(`br.student_id = $${values.length + 1}`);
    values.push(studentIdForUser);
  } else if (student) {
    conditions.push(`br.student_id = $${values.length + 1}`);
    values.push(student);
  }

  if (book) {
    conditions.push(`br.book_id = $${values.length + 1}`);
    values.push(book);
  }

  if (statusFilter) {
    conditions.push(`br.status = $${values.length + 1}`);
    values.push(statusFilter);
  }

  const where = conditions.join(' AND ');
  const orderBy = buildOrderBy(sort, undefined, RESERVATION_SORT_ALLOWLIST, 'br.created_at DESC');
  const limitNum = parseInt(limit, 10) || 10;
  const skipNum = parseInt(skip, 10) || 0;

  const [reservationsRows, countRows] = await Promise.all([
    db.raw(
      `SELECT ${reservationSelect} ${reservationJoins} WHERE ${where} ORDER BY ${orderBy} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limitNum, skipNum]
    ),
    db.raw(`SELECT COUNT(*)::int AS count FROM book_reservations br WHERE ${where}`, [...values]),
  ]);

  const reservations = reservationsRows.map(mapReservationRow);
  const total = countRows[0]?.count || 0;

  return ApiResponse.success(
    res,
    { reservations, meta: getPaginationMeta(page, limit, total) },
    'Reservations retrieved successfully'
  );
});

exports.createReservation = catchAsync(async (req, res) => {
  const { bookId, studentId, remarks } = req.body;

  const student = await db.findOne('students', { id: studentId, ...getSchoolFilter(req) });
  if (!student || student.status !== 'active') {
    throw new ApiError('Student not found or inactive', 404);
  }

  const book = await db.findOne('books', { id: bookId, ...getSchoolFilter(req) });
  if (!book) throw new ApiError('Book not found', 404);

  const activeIssueRows = await db.raw(
    `SELECT bi.* FROM book_issues bi
     JOIN books b ON bi.book_id = b.id
     WHERE bi.book_id = $1 AND bi.student_id = $2 AND bi.school_id = $3 AND bi.status IN ('issued', 'overdue')
     LIMIT 1`,
    [bookId, studentId, req.user.school_id]
  );
  if (activeIssueRows[0]) {
    throw new ApiError('Student currently has this book issued', 409);
  }

  const existingReservationRows = await db.raw(
    `SELECT * FROM book_reservations
     WHERE book_id = $1 AND student_id = $2 AND school_id = $3 AND status IN ('pending', 'hold')
     LIMIT 1`,
    [bookId, studentId, req.user.school_id]
  );
  if (existingReservationRows[0]) {
    throw new ApiError('Active reservation already exists for this student and book', 409);
  }

  const queueCount = await db.raw(
    `SELECT COUNT(*)::int AS count FROM book_reservations WHERE book_id = $1 AND school_id = $2 AND status = 'pending'`,
    [bookId, req.user.school_id]
  );
  const queuePosition = (queueCount[0]?.count || 0) + 1;

  const reservationRow = await db.insert('book_reservations', {
    book_id: bookId,
    student_id: studentId,
    queue_position: queuePosition,
    status: 'pending',
    remarks: remarks || '',
    school_id: req.user.school_id,
  });

  const populatedRows = await db.raw(
    `SELECT ${reservationSelect} ${reservationJoins} WHERE br.id = $1`,
    [reservationRow.id]
  );

  return ApiResponse.success(
    res,
    { reservation: mapReservationRow(populatedRows[0]) },
    'Reservation created successfully',
    201
  );
});

exports.cancelReservation = catchAsync(async (req, res) => {
  const reservationRow = await db.findOne('book_reservations', { id: req.params.id, ...getSchoolFilter(req) });
  if (!reservationRow) throw new ApiError('Reservation not found', 404);
  if (!['pending', 'hold'].includes(reservationRow.status)) {
    throw new ApiError('Only pending or hold reservations can be cancelled', 400);
  }

  const wasHold = reservationRow.status === 'hold';
  await db.update('book_reservations', { status: 'cancelled' }, { id: req.params.id });

  if (wasHold) {
    const heldCopy = await db.findOne('book_copies', {
      book_id: reservationRow.book_id,
      status: 'reserved',
      ...getSchoolFilter(req),
    });

    if (heldCopy) {
      await db.update('book_copies', { status: 'available' }, { id: heldCopy.id });
      await db.raw(
        'UPDATE books SET available_copies = available_copies + 1 WHERE id = $1',
        [reservationRow.book_id]
      );
    }
  }

  return ApiResponse.success(res, null, 'Reservation cancelled successfully');
});

// ── Fines ──────────────────────────────────────────────────

exports.getFines = catchAsync(async (req, res) => {
  const { student, status: statusFilter, page, limit, skip, sort } = req.query;
  const studentIdForUser = await resolveStudentIdForUser(req.user);

  let conditions =
    statusFilter === 'paid'
      ? ['bi.fine_amount <= bi.fine_paid']
      : ['bi.fine_amount > bi.fine_paid'];
  conditions.push(`bi.school_id = $1`);
  const values = [req.user.role === 'super_admin' && req.query.schoolId ? req.query.schoolId : req.user.school_id];

  if (studentIdForUser) {
    conditions.push(`bi.student_id = $${values.length + 1}`);
    values.push(studentIdForUser);
  } else if (student) {
    conditions.push(`bi.student_id = $${values.length + 1}`);
    values.push(student);
  }

  const where = conditions.join(' AND ');
  const orderBy = buildOrderBy(sort, undefined, FINE_SORT_ALLOWLIST, 'bi.created_at DESC');
  const limitNum = parseInt(limit, 10) || 10;
  const skipNum = parseInt(skip, 10) || 0;

  const [finesRows, countRows] = await Promise.all([
    db.raw(
      `SELECT ${issueSelect} ${issueJoins}
       WHERE ${where}
       ORDER BY ${orderBy} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limitNum, skipNum]
    ),
    db.raw(`SELECT COUNT(*)::int AS count FROM book_issues bi WHERE ${where}`, [...values]),
  ]);

  const fines = finesRows.map(mapIssueRow);
  const total = countRows[0]?.count || 0;

  return ApiResponse.success(
    res,
    { fines, meta: getPaginationMeta(page, limit, total) },
    'Fines retrieved successfully'
  );
});

exports.payFine = catchAsync(async (req, res) => {
  const { amount, remarks } = req.body;

  const issueRow = await db.findOne('book_issues', { id: req.params.id, ...getSchoolFilter(req) });
  if (!issueRow) throw new ApiError('Issue record not found', 404);

  const outstanding = (Number(issueRow.fine_amount) || 0) - (Number(issueRow.fine_paid) || 0);
  if (outstanding <= 0) throw new ApiError('No outstanding fine for this issue', 400);

  if (amount > outstanding) {
    throw new ApiError(`Payment amount exceeds outstanding fine of ${outstanding}`, 400);
  }

  const updateData = {
    fine_paid: (Number(issueRow.fine_paid) || 0) + Number(amount),
  };
  if (remarks !== undefined) updateData.remarks = remarks;

  const [updatedIssue] = await db.update('book_issues', updateData, { id: req.params.id });

  return ApiResponse.success(
    res,
    { issue: camelize(updatedIssue) },
    `Fine payment of ${amount} recorded successfully`
  );
});

// ── Reports ────────────────────────────────────────────────

exports.getSummary = catchAsync(async (req, res) => {
  const schoolId = req.user.role === 'super_admin' && req.query.schoolId ? req.query.schoolId : req.user.school_id;
  const [
    totalBooksRows,
    totalCopiesRows,
    availableCopiesRows,
    issuedCopiesRows,
    overdueIssuesRows,
    totalFinesRows,
  ] = await Promise.all([
    db.raw(`SELECT COUNT(*)::int AS count FROM books WHERE school_id = $1 AND status <> 'inactive'`, [schoolId]),
    db.raw(`SELECT COUNT(*)::int AS count FROM book_copies WHERE school_id = $1`, [schoolId]),
    db.raw(`SELECT COUNT(*)::int AS count FROM book_copies WHERE school_id = $1 AND status = 'available'`, [schoolId]),
    db.raw(`SELECT COUNT(*)::int AS count FROM book_copies WHERE school_id = $1 AND status = 'issued'`, [schoolId]),
    db.raw(`SELECT COUNT(*)::int AS count FROM book_issues WHERE school_id = $1 AND status = 'overdue'`, [schoolId]),
    db.raw(
      `SELECT COALESCE(SUM(fine_amount - fine_paid), 0) AS total
       FROM book_issues
       WHERE school_id = $1 AND fine_amount > fine_paid`,
      [schoolId]
    ),
  ]);

  const summary = {
    totalBooks: totalBooksRows[0]?.count || 0,
    totalCopies: totalCopiesRows[0]?.count || 0,
    availableCopies: availableCopiesRows[0]?.count || 0,
    issuedCopies: issuedCopiesRows[0]?.count || 0,
    overdueIssues: overdueIssuesRows[0]?.count || 0,
    outstandingFines: parseFloat(totalFinesRows[0]?.total) || 0,
  };

  return ApiResponse.success(res, { summary }, 'Library summary retrieved successfully');
});
