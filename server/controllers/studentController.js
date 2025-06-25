const bcrypt = require('bcryptjs');
const db = require('../db');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { scopeBySchool } = require('../middleware/auth');
const { buildOrderBy } = require('../utils/sort');
const { calculateAttendancePercentage } = require('../utils/attendance');
const {
  createDocument,
  drawHeader,
  drawFooter,
  drawTable,
  drawInfoRow,
} = require('../utils/pdfHelpers');

const scopedSchoolClause = (scope, alias) =>
  scope.clause === '1=1' ? '1=1' : `${alias}.${scope.clause}`;

const ADMIN_ROLES = [
  'super_admin',
  'admin',
  'teacher',
  'principal',
  'accountant',
  'librarian',
  'staff',
];

// ---------------------------------------------------------------------------
// Field / key helpers
// ---------------------------------------------------------------------------
const snakeToCamel = (str) =>
  str.replace(/^_/, '').replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

const mapKeys = (obj, mapper) => {
  if (Array.isArray(obj)) return obj.map((item) => mapKeys(item, mapper));
  if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [mapper(key), mapKeys(value, mapper)])
    );
  }
  return obj;
};

const omitAliasFields = (row) =>
  Object.fromEntries(Object.entries(row).filter(([key]) => !key.includes('__')));

const toNumber = (value) => (value == null ? 0 : Number(value));

const STUDENT_FIELD_MAP = {
  id: 'id',
  admissionNo: 'admission_no',
  rollNo: 'roll_no',
  firstName: 'first_name',
  lastName: 'last_name',
  gender: 'gender',
  dob: 'dob',
  phone: 'phone',
  email: 'email',
  address: 'address',
  city: 'city',
  state: 'state',
  pincode: 'pincode',
  aadharNumber: 'aadhar_number',
  admissionDate: 'admission_date',
  class: 'class_id',
  section: 'section_id',
  academicYear: 'academic_year_id',
  category: 'category',
  religion: 'religion',
  caste: 'caste',
  bloodGroup: 'blood_group',
  previousSchool: 'previous_school',
  previousClassPercentage: 'previous_class_percentage',
  fatherName: 'father_name',
  fatherPhone: 'father_phone',
  fatherOccupation: 'father_occupation',
  motherName: 'mother_name',
  motherPhone: 'mother_phone',
  motherOccupation: 'mother_occupation',
  guardianName: 'guardian_name',
  guardianPhone: 'guardian_phone',
  guardianRelation: 'guardian_relation',
  status: 'status',
  user: 'user_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

const toStudentDb = (data) => {
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    // Only map known student columns; ignore unrelated form fields
    // (e.g. transport/hostel, which are stored in their own tables).
    if (!STUDENT_FIELD_MAP[key]) continue;
    result[STUDENT_FIELD_MAP[key]] = value;
  }
  return result;
};

const stripEmptyStrings = (value) => {
  if (Array.isArray(value)) {
    return value.map(stripEmptyStrings);
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, val]) => [key, stripEmptyStrings(val)])
        .filter(([, val]) => val !== undefined)
    );
  }
  return value === '' ? undefined : value;
};

const STUDENT_SORT_ALLOWLIST = {
  createdAt: 's.created_at',
  updatedAt: 's.updated_at',
  firstName: 's.first_name',
  lastName: 's.last_name',
  admissionNo: 's.admission_no',
  rollNo: 's.roll_no',
  admissionDate: 's.admission_date',
};

const buildSort = (sortBy, sortOrder) => buildOrderBy(sortBy, sortOrder, STUDENT_SORT_ALLOWLIST, 's.created_at DESC');

const getSectionName = (sectionId, sectionsMap) => {
  if (!sectionId || !sectionsMap) return null;
  const sec = sectionsMap[sectionId.toString()];
  return sec ? sec.name : null;
};

const fetchSectionsForStudents = async (studentRows) => {
  const sectionIds = [
    ...new Set(
      studentRows.map((row) => row.section_id || row.section).filter(Boolean)
    ),
  ];
  if (!sectionIds.length) return {};

  const rows = await db.raw('SELECT id, name FROM class_sections WHERE id = ANY($1::uuid[])', [
    sectionIds,
  ]);
  const map = {};
  rows.forEach((row) => {
    map[row.id] = row;
  });
  return map;
};

const fetchGuardiansForStudents = async (studentIds) => {
  if (!studentIds.length) return {};

  const rows = await db.raw(
    `SELECT sg.student_id,
            g.id, g.first_name, g.last_name, g.relationship, g.phone,
            g.email, g.occupation, g.is_primary_contact
       FROM guardians g
       JOIN student_guardians sg ON sg.guardian_id = g.id
      WHERE sg.student_id = ANY($1::uuid[])`,
    [studentIds]
  );

  const map = {};
  rows.forEach((row) => {
    const { student_id, ...guardianRow } = row;
    if (!map[student_id]) map[student_id] = [];
    map[student_id].push(mapKeys(guardianRow, snakeToCamel));
  });
  return map;
};

const formatStudent = (row, guardians = [], sectionName = null) => {
  const base = mapKeys(omitAliasFields(row), snakeToCamel);

  if (base.previousClassPercentage != null) {
    base.previousClassPercentage = toNumber(base.previousClassPercentage);
  }

  const student = {
    ...base,
    class: row.class__id
      ? {
          id: row.class__id,
          name: row.class__name,
          numericName: row.class__numeric_name,
          academicYear: row.class__academic_year_id,
        }
      : null,
    academicYear: row.ay__id
      ? {
          id: row.ay__id,
          name: row.ay__name,
          isCurrent: row.ay__is_current,
        }
      : null,
    guardians,
  };

  if (sectionName !== undefined) student.sectionName = sectionName;
  return student;
};

const fetchPopulatedStudent = async (id) => {
  const rows = await db.raw(
    `SELECT s.*,
            c.id as class__id, c.name as class__name, c.numeric_name as class__numeric_name,
            c.academic_year_id as class__academic_year_id,
            ay.id as ay__id, ay.name as ay__name, ay.is_current as ay__is_current
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN academic_years ay ON ay.id = s.academic_year_id
      WHERE s.id = $1
      LIMIT 1`,
    [id]
  );

  if (!rows.length) return null;

  const row = rows[0];
  const guardians = (await fetchGuardiansForStudents([row.id]))[row.id] || [];
  const sectionsMap = await fetchSectionsForStudents([row]);
  const sectionName = getSectionName(row.section_id, sectionsMap);
  return formatStudent(row, guardians, sectionName);
};

const verifyClassSectionAcademicYear = async ({ class: classId, section, academicYear }, schoolId) => {
  const [cls, ay] = await Promise.all([
    db.findOne('classes', { id: classId }),
    db.findOne('academic_years', { id: academicYear }),
  ]);

  if (!cls) throw new ApiError('Class not found', 404);
  if (!ay) throw new ApiError('Academic year not found', 404);

  if (schoolId && (cls.school_id !== schoolId || ay.school_id !== schoolId)) {
    throw new ApiError('Class or academic year does not belong to your school', 403);
  }

  const sectionRow = await db.findOne('class_sections', { id: section, class_id: classId });
  if (!sectionRow) {
    throw new ApiError('Section does not exist in the selected class', 400);
  }

  if (schoolId && sectionRow.school_id !== schoolId) {
    throw new ApiError('Section does not belong to your school', 403);
  }

  return { cls, ay };
};

const verifyGuardians = async (guardianIds, schoolId) => {
  if (!guardianIds || guardianIds.length === 0) return;
  const rows = await db.raw(
    'SELECT id, school_id FROM guardians WHERE id = ANY($1::uuid[])',
    [guardianIds]
  );
  if (rows.length !== guardianIds.length) {
    throw new ApiError('One or more guardians not found', 400);
  }
  if (schoolId && rows.some((g) => g.school_id !== schoolId)) {
    throw new ApiError('One or more guardians do not belong to your school', 403);
  }
};

const generateNextRollNo = async (classId, sectionId, academicYearId) => {
  const rows = await db.findMany('students', {
    where: { class_id: classId, section_id: sectionId, academic_year_id: academicYearId },
  });

  const max = rows.reduce((m, s) => {
    const n = parseInt(s.roll_no, 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);

  return String(max + 1);
};

const canAccessStudentRecord = async (reqUser, student) => {
  if (ADMIN_ROLES.includes(reqUser.role)) return true;

  const requestUserId = String(reqUser.id);

  if (reqUser.role === 'student') {
    const studentUserId = String(student.userId || student.user_id || student.user || '');
    return studentUserId === requestUserId;
  }

  if (reqUser.role === 'parent') {
    const guardian = await db.findOne('guardians', { user_id: requestUserId });
    if (!guardian) return false;

    let guardianIds = [];
    if (Array.isArray(student.guardians) && student.guardians.length) {
      guardianIds = student.guardians.map((g) => (g.id ? g.id.toString() : g.toString()));
    } else {
      const links = await db.raw('SELECT guardian_id FROM student_guardians WHERE student_id = $1', [
        student.id || student._id,
      ]);
      guardianIds = links.map((l) => l.guardian_id);
    }

    return guardianIds.includes(guardian.id);
  }

  return false;
};

const getDefaultStudentPassword = () => {
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) {
    throw new Error('SEED_ADMIN_PASSWORD environment variable is required');
  }
  return password;
};

const createStudentUser = async (studentData, status = 'active', schoolId, client = null) => {
  const email = studentData.email?.trim()
    ? studentData.email.trim().toLowerCase()
    : `${studentData.admissionNo.toLowerCase()}@student.school.com`;

  const existingUser = await db.findOne('users', { email }, client);
  if (existingUser) {
    return existingUser.id;
  }

  const hashedPassword = await bcrypt.hash(getDefaultStudentPassword(), 12);

  const user = await db.insert('users', {
    name: `${studentData.firstName} ${studentData.lastName}`,
    email,
    password: hashedPassword,
    role: 'student',
    phone: studentData.phone || '',
    status,
    school_id: schoolId,
  }, ['*'], client);

  return user.id;
};

const attachSectionNames = (students, sectionsMap) => {
  return students.map((student) => ({
    ...student,
    sectionName: getSectionName(student.sectionId || student.section, sectionsMap),
  }));
};

// ---------------------------------------------------------------------------
// Controllers
// ---------------------------------------------------------------------------

// @desc    Get all students with filters, search, sort and pagination
// @route   GET /api/v1/students
// @access  Admin, Principal, Teacher
exports.getStudents = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const {
    class: classId,
    section,
    academicYear,
    status,
    search,
    sortBy,
    sortOrder,
    admissionDateFrom,
    admissionDateTo,
  } = req.query;

  const params = [];
  const conditions = ['1 = 1'];

  if (classId) {
    params.push(classId);
    conditions.push(`s.class_id = $${params.length}`);
  }
  if (section) {
    params.push(section);
    conditions.push(`s.section_id = $${params.length}`);
  }
  if (academicYear) {
    params.push(academicYear);
    conditions.push(`s.academic_year_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`s.status = $${params.length}`);
  }
  if (admissionDateFrom) {
    params.push(admissionDateFrom);
    conditions.push(`DATE(s.admission_date) >= $${params.length}`);
  }
  if (admissionDateTo) {
    params.push(admissionDateTo);
    conditions.push(`DATE(s.admission_date) <= $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    conditions.push(`(
      s.first_name ILIKE $${idx}
      OR s.last_name ILIKE $${idx}
      OR s.admission_no ILIKE $${idx}
      OR s.roll_no ILIKE $${idx}
      OR s.email ILIKE $${idx}
      OR s.phone ILIKE $${idx}
    )`);
  }

  const scope = scopeBySchool(req, params.length);
  conditions.push(scopedSchoolClause(scope, 's'));
  params.push(...scope.params);

  const where = conditions.join(' AND ');
  const orderBy = buildSort(sortBy, sortOrder);

  const [countResult, rows] = await Promise.all([
    db.raw(`SELECT COUNT(*)::int as count FROM students s WHERE ${where}`, params),
    db.raw(
      `SELECT s.*,
              c.id as class__id, c.name as class__name, c.numeric_name as class__numeric_name,
              c.academic_year_id as class__academic_year_id,
              ay.id as ay__id, ay.name as ay__name, ay.is_current as ay__is_current
         FROM students s
         LEFT JOIN classes c ON c.id = s.class_id
         LEFT JOIN academic_years ay ON ay.id = s.academic_year_id
        WHERE ${where}
        ORDER BY ${orderBy}
        LIMIT ${limit} OFFSET ${skip}`,
      params
    ),
  ]);

  const total = countResult[0].count;
  const studentIds = rows.map((row) => row.id);

  const [sectionsMap, guardiansMap] = await Promise.all([
    fetchSectionsForStudents(rows),
    fetchGuardiansForStudents(studentIds),
  ]);

  let students = rows.map((row) =>
    formatStudent(row, guardiansMap[row.id] || [], getSectionName(row.section_id, sectionsMap))
  );
  students = attachSectionNames(students, sectionsMap);

  const meta = getPaginationMeta(page, limit, total);
  return ApiResponse.paginated(res, students, meta, 'Students retrieved successfully');
});

// @desc    Search students by name, admission or roll number
// @route   GET /api/v1/students/search
// @access  Admin, Principal, Teacher
exports.searchStudents = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { q } = req.query;

  const params = [`%${q}%`];
  const scope = scopeBySchool(req, 1);
  const where = `(
    s.first_name ILIKE $1
    OR s.last_name ILIKE $1
    OR s.admission_no ILIKE $1
    OR s.roll_no ILIKE $1
    OR s.email ILIKE $1
  ) AND ${scopedSchoolClause(scope, 's')}`;
  params.push(...scope.params);

  const [countResult, rows] = await Promise.all([
    db.raw(`SELECT COUNT(*)::int as count FROM students s WHERE ${where}`, params),
    db.raw(
      `SELECT s.*,
              c.id as class__id, c.name as class__name, c.numeric_name as class__numeric_name,
              c.academic_year_id as class__academic_year_id,
              ay.id as ay__id, ay.name as ay__name, ay.is_current as ay__is_current
         FROM students s
         LEFT JOIN classes c ON c.id = s.class_id
         LEFT JOIN academic_years ay ON ay.id = s.academic_year_id
        WHERE ${where}
        ORDER BY s.first_name ASC, s.last_name ASC
        LIMIT ${limit} OFFSET ${skip}`,
      params
    ),
  ]);

  const total = countResult[0].count;
  const studentIds = rows.map((row) => row.id);

  const [sectionsMap, guardiansMap] = await Promise.all([
    fetchSectionsForStudents(rows),
    fetchGuardiansForStudents(studentIds),
  ]);

  let students = rows.map((row) =>
    formatStudent(row, guardiansMap[row.id] || [], getSectionName(row.section_id, sectionsMap))
  );
  students = attachSectionNames(students, sectionsMap);

  const meta = getPaginationMeta(page, limit, total);
  return ApiResponse.paginated(res, students, meta, 'Search results retrieved');
});

// @desc    Get single student with academic and financial summaries
// @route   GET /api/v1/students/:id
// @access  Admin, Principal, Teacher, Student (self), Parent (child)
exports.getStudent = catchAsync(async (req, res) => {
  const student = await fetchPopulatedStudent(req.params.id);

  if (!student) {
    throw new ApiError('Student not found', 404);
  }

  if (req.user.role !== 'super_admin' && student.schoolId !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  if (!(await canAccessStudentRecord(req.user, student))) {
    throw new ApiError('You are not authorized to view this student record', 403);
  }

  const [attendanceSummary, invoiceRows, paymentRows, markRows] = await Promise.all([
    db.raw(
      'SELECT status, COUNT(*)::int as count FROM attendance WHERE student_id = $1 GROUP BY status',
      [student.id]
    ),
    db.findMany('fee_invoices', {
      where: { student_id: student.id },
      orderBy: '"due_date" DESC',
    }),
    db.findMany('fee_payments', {
      where: { student_id: student.id },
      orderBy: '"paid_date" DESC',
    }),
    db.raw(
      `SELECT m.*,
              e.id as exam__id, e.name as exam__name, e.exam_type as exam__type,
              s.id as subject__id, s.name as subject__name, s.code as subject__code
         FROM marks m
         LEFT JOIN exams e ON e.id = m.exam_id
         LEFT JOIN subjects s ON s.id = m.subject_id
        WHERE m.student_id = $1
        ORDER BY m.created_at DESC
        LIMIT 10`,
      [student.id]
    ),
  ]);

  const attendanceStats = {
    present: attendanceSummary.find((a) => a.status === 'present')?.count || 0,
    absent: attendanceSummary.find((a) => a.status === 'absent')?.count || 0,
    late: attendanceSummary.find((a) => a.status === 'late')?.count || 0,
    halfDay: attendanceSummary.find((a) => a.status === 'half_day')?.count || 0,
    onLeave: attendanceSummary.find((a) => a.status === 'on_leave')?.count || 0,
    total: attendanceSummary.reduce((sum, a) => sum + a.count, 0),
  };
  attendanceStats.percentage = calculateAttendancePercentage(attendanceStats);

  const invoices = invoiceRows.map((row) => mapKeys(row, snakeToCamel));
  const payments = paymentRows.map((row) => mapKeys(row, snakeToCamel));

  const feeSummary = {
    totalInvoiced: invoices.reduce((sum, inv) => sum + toNumber(inv.totalAmount), 0),
    totalPaid: invoices.reduce((sum, inv) => sum + toNumber(inv.paidAmount), 0),
    totalBalance: invoices.reduce((sum, inv) => sum + toNumber(inv.balanceAmount), 0),
    totalConcessions: invoices.reduce((sum, inv) => sum + toNumber(inv.concessionAmount), 0),
    recentPayments: payments.slice(0, 5),
  };

  const marks = markRows.map((row) => ({
    ...mapKeys(omitAliasFields(row), snakeToCamel),
    exam: row.exam__id
      ? { id: row.exam__id, name: row.exam__name, type: row.exam__type }
      : null,
    subject: row.subject__id
      ? { id: row.subject__id, name: row.subject__name, code: row.subject__code }
      : null,
  }));

  student.sectionName = getSectionName(
    student.sectionId || student.section,
    await fetchSectionsForStudents([{ section_id: student.sectionId || student.section }])
  );

  return ApiResponse.success(
    res,
    { student, attendanceSummary: attendanceStats, feeSummary, recentMarks: marks },
    'Student retrieved successfully'
  );
});

// @desc    Create a new student with auto-generated roll number
// @route   POST /api/v1/students
// @access  Admin
exports.createStudent = catchAsync(async (req, res) => {
  const data = stripEmptyStrings(req.body);
  const { admissionNo, class: classId, section, academicYear, guardians = [] } = data;
  const schoolId = req.user.school_id;

  const existingStudent = await db.findOne('students', {
    admission_no: admissionNo,
    school_id: schoolId,
  });
  if (existingStudent) {
    throw new ApiError('Student with this admission number already exists', 409);
  }

  await verifyClassSectionAcademicYear({ class: classId, section, academicYear }, schoolId);
  await verifyGuardians(guardians, schoolId);

  const rollNo = await generateNextRollNo(classId, section, academicYear);
  const userId = await createStudentUser(data, 'active', schoolId);

  const insertData = toStudentDb({ ...data, rollNo, user: userId });
  delete insertData.guardians;
  insertData.school_id = schoolId;

  const studentRow = await db.insert('students', insertData);

  for (const guardianId of guardians) {
    await db.insert('student_guardians', {
      student_id: studentRow.id,
      guardian_id: guardianId,
      school_id: schoolId,
    });
  }

  const populatedStudent = await fetchPopulatedStudent(studentRow.id);

  return ApiResponse.success(
    res,
    { student: populatedStudent },
    'Student created successfully',
    201
  );
});

// @desc    Update student profile
// @route   PUT /api/v1/students/:id
// @access  Admin, Teacher
exports.updateStudent = catchAsync(async (req, res) => {
  const data = stripEmptyStrings(req.body);
  const { class: newClassId, section: newSectionId, academicYear: newAcademicYearId, guardians } = data;

  const existingRows = await db.raw('SELECT * FROM students WHERE id = $1', [req.params.id]);
  if (!existingRows.length) {
    throw new ApiError('Student not found', 404);
  }

  const existing = existingRows[0];
  if (req.user.role !== 'super_admin' && existing.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const classId = newClassId || existing.class_id;
  const sectionId = newSectionId || existing.section_id;
  const academicYearId = newAcademicYearId || existing.academic_year_id;

  if (newClassId || newSectionId || newAcademicYearId) {
    await verifyClassSectionAcademicYear({
      class: classId,
      section: sectionId,
      academicYear: academicYearId,
    }, existing.school_id);
  }

  if (guardians) {
    await verifyGuardians(guardians, existing.school_id);
  }

  const updatePayload = toStudentDb(data);
  delete updatePayload.guardians;
  delete updatePayload.id;

  if (Object.keys(updatePayload).length > 0) {
    await db.update('students', updatePayload, { id: req.params.id });
  }

  if (guardians) {
    await db.raw('DELETE FROM student_guardians WHERE student_id = $1', [req.params.id]);
    for (const guardianId of guardians) {
      await db.insert('student_guardians', {
        student_id: req.params.id,
        guardian_id: guardianId,
        school_id: existing.school_id,
      });
    }
  }

  const updatedStudent = await fetchPopulatedStudent(req.params.id);

  return ApiResponse.success(res, { student: updatedStudent }, 'Student updated successfully');
});

// @desc    Soft-delete a student (mark inactive)
// @route   DELETE /api/v1/students/:id
// @access  Admin
exports.deleteStudent = catchAsync(async (req, res) => {
  const rows = await db.raw('SELECT * FROM students WHERE id = $1', [req.params.id]);
  if (!rows.length) {
    throw new ApiError('Student not found', 404);
  }

  const student = rows[0];
  if (req.user.role !== 'super_admin' && student.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const [outstandingInvoice, activeBookIssue] = await Promise.all([
    db.raw(
      "SELECT 1 FROM fee_invoices WHERE student_id = $1 AND status = ANY($2::text[]) LIMIT 1",
      [student.id, ['pending', 'partial', 'overdue']]
    ),
    db.raw(
      "SELECT 1 FROM book_issues WHERE student_id = $1 AND status = ANY($2::text[]) LIMIT 1",
      [student.id, ['issued', 'overdue']]
    ),
  ]);

  if (outstandingInvoice.length) {
    throw new ApiError('Cannot delete student with outstanding fee dues', 409);
  }

  if (activeBookIssue.length) {
    throw new ApiError('Cannot delete student with active library book issues', 409);
  }

  await db.update('students', { status: 'inactive' }, { id: student.id });

  return ApiResponse.success(res, null, 'Student deleted successfully');
});

// @desc    Get active students by class
// @route   GET /api/v1/students/class/:classId
// @access  Admin, Principal, Teacher
exports.getStudentsByClass = catchAsync(async (req, res) => {
  const { classId } = req.params;
  const { page, limit, skip } = getPagination(req.query);
  const { sortBy, sortOrder } = req.query;

  const scope = scopeBySchool(req, 2);
  const params = [classId, 'active', ...scope.params];
  const where = `s.class_id = $1 AND s.status = $2 AND ${scopedSchoolClause(scope, 's')}`;
  const orderBy = buildSort(sortBy, sortOrder);

  const [countResult, rows] = await Promise.all([
    db.raw(`SELECT COUNT(*)::int as count FROM students s WHERE ${where}`, params),
    db.raw(
      `SELECT s.*,
              c.id as class__id, c.name as class__name, c.numeric_name as class__numeric_name,
              c.academic_year_id as class__academic_year_id,
              ay.id as ay__id, ay.name as ay__name, ay.is_current as ay__is_current
         FROM students s
         LEFT JOIN classes c ON c.id = s.class_id
         LEFT JOIN academic_years ay ON ay.id = s.academic_year_id
        WHERE ${where}
        ORDER BY ${orderBy}
        LIMIT ${limit} OFFSET ${skip}`,
      params
    ),
  ]);

  const total = countResult[0].count;
  const studentIds = rows.map((row) => row.id);

  const [sectionsMap, guardiansMap] = await Promise.all([
    fetchSectionsForStudents(rows),
    fetchGuardiansForStudents(studentIds),
  ]);

  let students = rows.map((row) =>
    formatStudent(row, guardiansMap[row.id] || [], getSectionName(row.section_id, sectionsMap))
  );
  students = attachSectionNames(students, sectionsMap);

  const meta = getPaginationMeta(page, limit, total);
  return ApiResponse.paginated(res, students, meta, 'Students retrieved by class');
});

// @desc    Get student attendance records with summary
// @route   GET /api/v1/students/:id/attendance
// @access  Admin, Principal, Teacher, Student (self), Parent (child)
exports.getStudentAttendance = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { page, limit, skip } = getPagination(req.query);
  const { startDate, endDate } = req.query;

  const studentRows = await db.raw('SELECT * FROM students WHERE id = $1', [id]);
  if (!studentRows.length) throw new ApiError('Student not found', 404);

  const student = mapKeys(studentRows[0], snakeToCamel);
  if (req.user.role !== 'super_admin' && student.schoolId !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }
  if (!(await canAccessStudentRecord(req.user, student))) {
    throw new ApiError('You are not authorized to view this student record', 403);
  }

  const params = [id];
  const conditions = ['a.student_id = $1'];

  if (startDate && endDate) {
    params.push(startDate, endDate);
    conditions.push(`a.date BETWEEN $${params.length - 1} AND $${params.length}`);
  }

  const where = conditions.join(' AND ');

  const [records, totalResult, summary] = await Promise.all([
    db.raw(
      `SELECT a.*,
              c.name as class__name,
              s.name as subject__name, s.code as subject__code
         FROM attendance a
         LEFT JOIN classes c ON c.id = a.class_id
         LEFT JOIN subjects s ON s.id = a.subject_id
        WHERE ${where}
        ORDER BY a.date DESC
        LIMIT ${limit} OFFSET ${skip}`,
      params
    ),
    db.raw(`SELECT COUNT(*)::int as count FROM attendance a WHERE ${where}`, params),
    db.raw(`SELECT status, COUNT(*)::int as count FROM attendance a WHERE ${where} GROUP BY status`, params),
  ]);

  const attendance = records.map((row) => ({
    ...mapKeys(omitAliasFields(row), snakeToCamel),
    class: row.class__name ? { name: row.class__name } : null,
    subject: row.subject__name
      ? { name: row.subject__name, code: row.subject__code }
      : null,
  }));

  const stats = {
    present: summary.find((a) => a.status === 'present')?.count || 0,
    absent: summary.find((a) => a.status === 'absent')?.count || 0,
    late: summary.find((a) => a.status === 'late')?.count || 0,
    halfDay: summary.find((a) => a.status === 'half_day')?.count || 0,
    onLeave: summary.find((a) => a.status === 'on_leave')?.count || 0,
    total: summary.reduce((sum, a) => sum + a.count, 0),
  };
  stats.percentage = calculateAttendancePercentage(stats);

  const meta = getPaginationMeta(page, limit, totalResult[0].count);

  return ApiResponse.success(
    res,
    { attendance, summary: stats, meta },
    'Attendance records retrieved'
  );
});

// @desc    Get student fee ledger
// @route   GET /api/v1/students/:id/fees
// @access  Admin, Accountant, Student (self), Parent (child)
exports.getStudentFees = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { page, limit, skip } = getPagination(req.query);
  const { status } = req.query;

  const studentRows = await db.raw('SELECT * FROM students WHERE id = $1', [id]);
  if (!studentRows.length) throw new ApiError('Student not found', 404);

  const student = mapKeys(studentRows[0], snakeToCamel);
  if (req.user.role !== 'super_admin' && student.schoolId !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }
  if (!(await canAccessStudentRecord(req.user, student))) {
    throw new ApiError('You are not authorized to view this student record', 403);
  }

  const params = [id];
  const conditions = ['fi.student_id = $1'];

  if (status) {
    params.push(status);
    conditions.push(`fi.status = $${params.length}`);
  }

  const where = conditions.join(' AND ');

  const [invoiceRows, totalResult, paymentRows] = await Promise.all([
    db.raw(
      `SELECT fi.*, fs.name as fee_structure__name
         FROM fee_invoices fi
         LEFT JOIN fee_structures fs ON fs.id = fi.fee_structure_id
        WHERE ${where}
        ORDER BY fi.due_date DESC
        LIMIT ${limit} OFFSET ${skip}`,
      params
    ),
    db.raw(`SELECT COUNT(*)::int as count FROM fee_invoices fi WHERE ${where}`, params),
    db.findMany('fee_payments', {
      where: { student_id: id },
      orderBy: '"paid_date" DESC',
    }),
  ]);

  const invoices = invoiceRows.map((row) => ({
    ...mapKeys(omitAliasFields(row), snakeToCamel),
    feeStructure: row.fee_structure__name ? { name: row.fee_structure__name } : null,
  }));

  const payments = paymentRows.map((row) => mapKeys(row, snakeToCamel));

  const summary = {
    totalInvoiced: invoices.reduce((sum, inv) => sum + toNumber(inv.totalAmount), 0),
    totalPaid: invoices.reduce((sum, inv) => sum + toNumber(inv.paidAmount), 0),
    totalBalance: invoices.reduce((sum, inv) => sum + toNumber(inv.balanceAmount), 0),
    totalConcessions: invoices.reduce((sum, inv) => sum + toNumber(inv.concessionAmount), 0),
    paymentHistory: payments,
  };

  const meta = getPaginationMeta(page, limit, totalResult[0].count);

  return ApiResponse.success(res, { invoices, summary, meta }, 'Fee ledger retrieved');
});

// @desc    Get student exam results
// @route   GET /api/v1/students/:id/results
// @access  Admin, Principal, Teacher, Student (self), Parent (child)
exports.getStudentResults = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { page, limit, skip } = getPagination(req.query);
  const { exam } = req.query;

  const studentRows = await db.raw('SELECT * FROM students WHERE id = $1', [id]);
  if (!studentRows.length) throw new ApiError('Student not found', 404);

  const student = mapKeys(studentRows[0], snakeToCamel);
  if (req.user.role !== 'super_admin' && student.schoolId !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }
  if (!(await canAccessStudentRecord(req.user, student))) {
    throw new ApiError('You are not authorized to view this student record', 403);
  }

  const params = [id];
  const conditions = ['m.student_id = $1'];

  if (exam) {
    params.push(exam);
    conditions.push(`m.exam_id = $${params.length}`);
  }

  const where = conditions.join(' AND ');

  const [markRows, totalResult] = await Promise.all([
    db.raw(
      `SELECT m.*,
              e.id as exam__id, e.name as exam__name, e.exam_type as exam__type,
              s.id as subject__id, s.name as subject__name, s.code as subject__code,
              es.exam_date as exam_schedule__exam_date,
              es.start_time as exam_schedule__start_time,
              es.end_time as exam_schedule__end_time
         FROM marks m
         LEFT JOIN exams e ON e.id = m.exam_id
         LEFT JOIN subjects s ON s.id = m.subject_id
         LEFT JOIN exam_schedules es ON es.id = m.exam_schedule_id
        WHERE ${where}
        ORDER BY m.created_at DESC
        LIMIT ${limit} OFFSET ${skip}`,
      params
    ),
    db.raw(`SELECT COUNT(*)::int as count FROM marks m WHERE ${where}`, params),
  ]);

  const marks = markRows.map((row) => ({
    ...mapKeys(omitAliasFields(row), snakeToCamel),
    exam: row.exam__id
      ? { id: row.exam__id, name: row.exam__name, type: row.exam__type }
      : null,
    subject: row.subject__id
      ? { id: row.subject__id, name: row.subject__name, code: row.subject__code }
      : null,
    examSchedule: row.exam_schedule__exam_date
      ? {
          examDate: row.exam_schedule__exam_date,
          startTime: row.exam_schedule__start_time,
          endTime: row.exam_schedule__end_time,
        }
      : null,
  }));

  const meta = getPaginationMeta(page, limit, totalResult[0].count);

  return ApiResponse.success(res, { marks, meta }, 'Student results retrieved');
});

// @desc    Bulk import students
// @route   POST /api/v1/students/bulk-import
// @access  Admin
exports.bulkImport = catchAsync(async (req, res) => {
  const { students } = req.body;

  const results = {
    valid: [],
    errors: [],
    created: [],
    total: students.length,
    validCount: 0,
    errorCount: 0,
  };

  const seenAdmissionNos = new Set();
  const admissionNos = students.map((s) => s.admissionNo).filter(Boolean);
  const schoolId = req.user.role === 'super_admin' && req.query.schoolId
    ? req.query.schoolId
    : req.user.school_id;

  const [existingRows, guardianRows] = await Promise.all([
    admissionNos.length
      ? db.raw(
          'SELECT admission_no FROM students WHERE admission_no = ANY($1::text[]) AND school_id = $2',
          [admissionNos, schoolId]
        )
      : [],
    (() => {
      const guardianIds = [...new Set(students.flatMap((s) => s.guardians || []))];
      return guardianIds.length
        ? db.raw('SELECT id, school_id FROM guardians WHERE id = ANY($1::uuid[])', [guardianIds])
        : [];
    })(),
  ]);

  const existingAdmissionNos = new Set(existingRows.map((s) => s.admission_no));
  const validGuardianIds = new Set(
    guardianRows
      .filter((g) => !schoolId || g.school_id === schoolId)
      .map((g) => g.id)
  );

  const getRowErrors = (studentData) => {
    const errors = [];

    if (!studentData.admissionNo) {
      errors.push('admissionNo is required');
    } else if (existingAdmissionNos.has(studentData.admissionNo)) {
      errors.push(`Student with admissionNo ${studentData.admissionNo} already exists`);
    } else if (seenAdmissionNos.has(studentData.admissionNo)) {
      errors.push('Duplicate admissionNo in batch');
    }

    if (!studentData.firstName) errors.push('firstName is required');
    if (!studentData.lastName) errors.push('lastName is required');
    if (!studentData.gender) errors.push('gender is required');
    if (!studentData.dob) errors.push('dob is required');
    if (!studentData.class) errors.push('class is required');
    if (!studentData.section) errors.push('section is required');
    if (!studentData.academicYear) errors.push('academicYear is required');

    if (studentData.guardians && studentData.guardians.length) {
      const invalidGuardian = studentData.guardians.find((id) => !validGuardianIds.has(id));
      if (invalidGuardian) {
        errors.push(`Guardian ${invalidGuardian} not found or does not belong to your school`);
      }
    }

    return errors;
  };

  const getComboKey = (classId, sectionId, academicYearId) =>
    `${classId}:${sectionId}:${academicYearId}`;

  const verifiedCombos = new Map();
  const rollNoCache = new Map();

  for (let i = 0; i < students.length; i++) {
    const studentData = students[i];
    const rowErrors = getRowErrors(studentData);

    if (rowErrors.length > 0) {
      results.errors.push({
        index: i,
        admissionNo: studentData.admissionNo,
        errors: rowErrors,
      });
      results.errorCount++;
      continue;
    }

    seenAdmissionNos.add(studentData.admissionNo);

    const key = getComboKey(studentData.class, studentData.section, studentData.academicYear);

    try {
      if (!verifiedCombos.has(key)) {
        await verifyClassSectionAcademicYear(
          { class: studentData.class, section: studentData.section, academicYear: studentData.academicYear },
          schoolId
        );
        verifiedCombos.set(key, true);
      }

      let nextRollNo = rollNoCache.get(key);
      if (!nextRollNo) {
        const rollNo = await generateNextRollNo(studentData.class, studentData.section, studentData.academicYear);
        nextRollNo = parseInt(rollNo, 10);
      }
      const rollNo = String(nextRollNo);
      rollNoCache.set(key, nextRollNo + 1);

      const studentRow = await db.transaction(async (tdb) => {
        const userId = await createStudentUser(studentData, studentData.status || 'active', schoolId, tdb);
        const insertData = toStudentDb({ ...studentData, rollNo, user: userId });
        delete insertData.guardians;
        insertData.school_id = schoolId;

        const inserted = await tdb.insert('students', insertData);

        for (const guardianId of studentData.guardians || []) {
          await tdb.insert('student_guardians', {
            student_id: inserted.id,
            guardian_id: guardianId,
            school_id: schoolId,
          });
        }

        return inserted;
      });

      results.created.push({
        index: i,
        id: studentRow.id,
        admissionNo: studentData.admissionNo,
        rollNo,
      });
      results.valid.push({ index: i, data: studentData });
      results.validCount++;
    } catch (error) {
      results.errors.push({
        index: i,
        admissionNo: studentData.admissionNo,
        errors: [error.message || 'Failed to import student'],
      });
      results.errorCount++;
    }
  }

  const statusCode = results.errorCount > 0 ? 207 : 201;

  return ApiResponse.success(
    res,
    { results },
    `Bulk import completed: ${results.created.length} imported, ${results.errorCount} errors`,
    statusCode
  );
});

// @desc    Teacher registers a provisional student pending admin approval
// @route   POST /api/v1/students/provisional
// @access  Teacher, Admin
exports.createProvisionalStudent = catchAsync(async (req, res) => {
  const data = stripEmptyStrings(req.body);
  const { admissionNo, class: classId, section, academicYear, guardians = [] } = data;
  const schoolId = req.user.school_id;

  const existingStudent = await db.findOne('students', {
    admission_no: admissionNo,
    school_id: schoolId,
  });
  if (existingStudent) {
    throw new ApiError('Student with this admission number already exists', 409);
  }

  await verifyClassSectionAcademicYear({ class: classId, section, academicYear }, schoolId);
  await verifyGuardians(guardians, schoolId);

  const rollNo = await generateNextRollNo(classId, section, academicYear);
  const userId = await createStudentUser(data, 'pending', schoolId);

  const insertData = toStudentDb({ ...data, rollNo, status: 'pending', user: userId });
  delete insertData.guardians;
  insertData.school_id = schoolId;

  const studentRow = await db.insert('students', insertData);

  for (const guardianId of guardians) {
    await db.insert('student_guardians', {
      student_id: studentRow.id,
      guardian_id: guardianId,
      school_id: schoolId,
    });
  }

  const populatedStudent = await fetchPopulatedStudent(studentRow.id);

  return ApiResponse.success(
    res,
    { student: populatedStudent },
    'Provisional student registration submitted for admin approval',
    201
  );
});

// @desc    Admin approves a provisional student registration
// @route   PATCH /api/v1/students/:id/approve
// @access  Admin
exports.approveStudent = catchAsync(async (req, res) => {
  const rows = await db.raw('SELECT * FROM students WHERE id = $1', [req.params.id]);
  if (!rows.length) throw new ApiError('Student not found', 404);

  const student = rows[0];
  if (req.user.role !== 'super_admin' && student.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  if (student.status !== 'pending') {
    throw new ApiError('Only pending student registrations can be approved', 400);
  }

  await db.update('students', { status: 'active' }, { id: student.id });

  if (student.user_id) {
    await db.update('users', { status: 'active' }, { id: student.user_id });
  }

  const populatedStudent = await fetchPopulatedStudent(student.id);

  return ApiResponse.success(
    res,
    { student: populatedStudent },
    'Student registration approved and account activated'
  );
});

// @desc    Admin rejects a provisional student registration
// @route   PATCH /api/v1/students/:id/reject
// @access  Admin
exports.rejectStudent = catchAsync(async (req, res) => {
  const rows = await db.raw('SELECT * FROM students WHERE id = $1', [req.params.id]);
  if (!rows.length) throw new ApiError('Student not found', 404);

  const student = rows[0];
  if (req.user.role !== 'super_admin' && student.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  if (student.status !== 'pending') {
    throw new ApiError('Only pending student registrations can be rejected', 400);
  }

  await db.update('students', { status: 'inactive' }, { id: student.id });

  if (student.user_id) {
    await db.update('users', { status: 'inactive' }, { id: student.user_id });
  }

  return ApiResponse.success(res, null, 'Student registration rejected');
});

// @desc    Get logged-in parent's children
// @route   GET /api/v1/students/my-children
// @access  Parent
exports.getMyChildren = catchAsync(async (req, res) => {
  if (req.user.role !== 'parent') {
    throw new ApiError('Only parents can access this endpoint', 403);
  }

  const guardian = await db.findOne('guardians', { user_id: req.user.id });
  if (!guardian) {
    return ApiResponse.success(res, { students: [] }, 'Children retrieved');
  }

  const scope = scopeBySchool(req, 1);
  const rows = await db.raw(
    `SELECT s.*,
            c.name as class__name, c.numeric_name as class__numeric_name,
            cs.name as section__name,
            ay.name as ay__name
       FROM students s
       JOIN student_guardians sg ON sg.student_id = s.id
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN class_sections cs ON cs.id = s.section_id
       LEFT JOIN academic_years ay ON ay.id = s.academic_year_id
      WHERE sg.guardian_id = $1 AND ${scopedSchoolClause(scope, 's')}
      ORDER BY s.first_name ASC`,
    [guardian.id, ...scope.params]
  );

  const students = rows.map((row) => ({
    ...mapKeys(omitAliasFields(row), snakeToCamel),
    class: row.class__name
      ? { name: row.class__name, numericName: row.class__numeric_name }
      : null,
    section: row.section__name ? { name: row.section__name } : null,
    academicYear: row.ay__name ? { name: row.ay__name } : null,
  }));

  return ApiResponse.success(res, { students }, 'Children retrieved');
});

// @desc    Download student report card as PDF
// @route   GET /api/v1/students/:id/report-card.pdf
// @access  Admin, Teacher, Parent, Student
exports.downloadReportCard = catchAsync(async (req, res) => {
  const rows = await db.raw(
    `SELECT s.*,
            c.name as class__name, c.numeric_name as class__numeric_name,
            cs.name as section__name,
            ay.name as ay__name
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN class_sections cs ON cs.id = s.section_id
       LEFT JOIN academic_years ay ON ay.id = s.academic_year_id
      WHERE s.id = $1`,
    [req.params.id]
  );

  if (!rows.length) throw new ApiError('Student not found', 404);

  const row = rows[0];
  if (req.user.role !== 'super_admin' && row.school_id !== req.user.school_id) {
    throw new ApiError('Access denied', 403);
  }

  const student = {
    ...mapKeys(omitAliasFields(row), snakeToCamel),
    class: row.class__name
      ? { name: row.class__name, numericName: row.class__numeric_name }
      : null,
    section: row.section__name ? { name: row.section__name } : null,
    academicYear: row.ay__name ? { name: row.ay__name } : null,
  };

  const allowed = await canAccessStudentRecord(req.user, student);
  if (!allowed) throw new ApiError('Not authorized to view this student', 403);

  // Attendance summary
  const attendanceRecords = await db.raw(
    'SELECT status FROM attendance WHERE student_id = $1 AND academic_year_id = $2',
    [student.id, student.academicYearId]
  );

  const totalDays = attendanceRecords.length;
  const presentDays = attendanceRecords.filter((a) =>
    ['present', 'late'].includes(a.status)
  ).length;
  const attendancePct = totalDays ? ((presentDays / totalDays) * 100).toFixed(1) : '0.0';

  // Latest exam marks
  const exams = await db.findMany('exams', {
    where: { academic_year_id: student.academicYearId },
    orderBy: '"end_date" DESC',
  });
  const latestExam = exams[0];
  let marksRows = [];
  let examAverage = null;

  if (latestExam) {
    const marks = await db.raw(
      `SELECT m.*, s.name as subject__name, e.name as exam__name
         FROM marks m
         LEFT JOIN subjects s ON s.id = m.subject_id
         LEFT JOIN exams e ON e.id = m.exam_id
        WHERE m.student_id = $1
          AND m.exam_id = $2
          AND m.status = ANY($3::text[])`,
      [student.id, latestExam.id, ['submitted', 'verified', 'published']]
    );

    if (marks.length) {
      const totalObtained = marks.reduce(
        (sum, m) => sum + toNumber(m.marks_obtained),
        0
      );
      const totalMax = marks.reduce((sum, m) => sum + toNumber(m.max_marks), 0);
      examAverage = totalMax ? ((totalObtained / totalMax) * 100).toFixed(1) : '0.0';
      marksRows = marks.map((m) => [
        m.subject__name || '-',
        `${m.marks_obtained ?? '-'}/${m.max_marks}`,
        m.percentage != null ? `${Number(m.percentage).toFixed(1)}%` : '-',
        m.grade || '-',
      ]);
    }
  }

  const doc = createDocument();
  const filename = `report-card-${student.admissionNo}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  doc.pipe(res);

  drawHeader(doc, 'STUDENT REPORT CARD', `Academic Year: ${student.academicYear?.name || '-'}`);

  drawInfoRow(doc, 'Student Name', `${student.firstName} ${student.lastName}`);
  drawInfoRow(doc, 'Admission No', student.admissionNo);
  drawInfoRow(doc, 'Roll No', student.rollNo);
  drawInfoRow(doc, 'Class / Section', `${student.class?.name || '-'} / ${student.section?.name || '-'}`);
  drawInfoRow(doc, 'Attendance', `${attendancePct}% (${presentDays}/${totalDays} days)`);

  doc.moveDown(1);

  if (marksRows.length) {
    doc.fontSize(12).fillColor('#111111').text(`Latest Exam: ${latestExam.name}`, 50, doc.y);
    doc.moveDown(0.5);
    drawTable(doc, ['Subject', 'Marks', 'Percentage', 'Grade'], marksRows, {
      colWidths: [220, 100, 100, 75],
      align: 'left',
    });
    doc.moveDown(0.5);
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#2c5282')
      .text(`Exam Average: ${examAverage}%`, { align: 'right' });
  } else {
    doc.fontSize(10).fillColor('#555555').text('No published exam marks available for this academic year.');
  }

  doc.moveDown(2);
  doc.fontSize(10).fillColor('#555555');
  doc.text('This is a computer-generated report card.', { align: 'center' });

  drawFooter(doc);
  doc.end();
});
