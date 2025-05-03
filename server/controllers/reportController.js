const db = require('../db');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const { startOfDay, endOfDay } = require('../utils/dateHelpers');
const { scopeBySchool, getSchoolFilter } = require('../middleware/auth');
const { calculateAttendancePercentage } = require('../utils/attendance');

// ── Helpers ────────────────────────────────────────────────────────────────

const whereSchool = (req, alias, existingParamCount = 0) => {
  const scope = scopeBySchool(req, existingParamCount);
  if (scope.clause === '1=1') {
    return { clause: '', params: [], nextIndex: scope.nextIndex };
  }
  return {
    clause: ` AND ${alias}.${scope.clause}`,
    params: scope.params,
    nextIndex: scope.nextIndex,
  };
};

const whereSchoolNoAlias = (req, existingParamCount = 0) => {
  const scope = scopeBySchool(req, existingParamCount);
  if (scope.clause === '1=1') {
    return { clause: '', params: [], nextIndex: scope.nextIndex };
  }
  return {
    clause: ` AND ${scope.clause}`,
    params: scope.params,
    nextIndex: scope.nextIndex,
  };
};

const schoolWhere = (req, existingParamCount = 0) => {
  const scope = scopeBySchool(req, existingParamCount);
  if (scope.clause === '1=1') {
    return { clause: '', params: [], nextIndex: scope.nextIndex };
  }
  return {
    clause: ` WHERE ${scope.clause}`,
    params: scope.params,
    nextIndex: scope.nextIndex,
  };
};

/**
 * Build an array of the last `count` months with start/end boundaries.
 */
const buildLastMonths = (count = 12) => {
  const now = new Date();
  const months = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    months.push({
      label: start.toLocaleString('default', { month: 'short', year: 'numeric' }),
      year: start.getFullYear(),
      month: start.getMonth() + 1,
      start,
      end,
    });
  }
  return months;
};

const extractSum = (arr, field) => {
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  const v = arr[0][field];
  return v == null ? 0 : Number(v);
};

const extractCount = (arr) => extractSum(arr, 'count');

const capitalize = (str) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : '');

const safeName = (doc) => {
  if (!doc) return 'Unknown';
  const first = doc.first_name || doc.firstName || '';
  const last = doc.last_name || doc.lastName || '';
  return `${first} ${last}`.trim() || 'Unknown';
};

// @desc    Get dashboard KPIs
// @route   GET /api/v1/reports/dashboard
// @access  Admin, Principal, Teacher, Accountant, Librarian
exports.getDashboard = catchAsync(async (req, res) => {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const months = buildLastMonths(12);
  const rangeStart = months[0].start;
  const rangeEnd = months[months.length - 1].end;
  const now = new Date();
  const schoolFilter = getSchoolFilter(req);

  // ── Core KPI counts ─────────────────────────────────────────────────────
  const presentScope = whereSchool(req, 'attendance', 3);
  const absentScope = whereSchool(req, 'attendance', 3);
  const feeCollectedScope = whereSchool(req, 'fee_payments', 3);
  const outstandingScope = whereSchool(req, 'fee_invoices', 0);
  const overdueScope = whereSchool(req, 'fee_invoices', 1);

  const [
    totalStudents,
    totalTeachers,
    totalClasses,
    presentToday,
    absentToday,
    feeCollectedTodayAgg,
    outstandingDuesAgg,
    overdueInvoicesAgg,
    libraryBooksIssued,
    transportStudents,
    hostelOccupancy,
  ] = await Promise.all([
    db.count('students', { status: 'active', ...schoolFilter }),
    db.count('teachers', { status: 'active', ...schoolFilter }),
    db.count('classes', { status: 'active', ...schoolFilter }),
    db.raw(
      `SELECT COUNT(*) AS count FROM attendance WHERE date >= $1 AND date <= $2 AND status = $3${presentScope.clause}`,
      [todayStart, todayEnd, 'present', ...presentScope.params]
    ),
    db.raw(
      `SELECT COUNT(*) AS count FROM attendance WHERE date >= $1 AND date <= $2 AND status = $3${absentScope.clause}`,
      [todayStart, todayEnd, 'absent', ...absentScope.params]
    ),
    db.raw(
      `SELECT SUM(amount) AS total FROM fee_payments WHERE paid_date >= $1 AND paid_date <= $2 AND status = $3${feeCollectedScope.clause}`,
      [todayStart, todayEnd, 'completed', ...feeCollectedScope.params]
    ),
    db.raw(
      `SELECT SUM(balance_amount) AS total FROM fee_invoices WHERE status IN ('pending','partial','overdue')${outstandingScope.clause}`,
      [...outstandingScope.params]
    ),
    db.raw(
      `SELECT COUNT(*) AS count FROM fee_invoices WHERE status NOT IN ('paid','cancelled','draft') AND due_date < $1${overdueScope.clause}`,
      [now, ...overdueScope.params]
    ),
    db.count('book_issues', { status: 'issued', ...schoolFilter }),
    db.count('student_transports', { status: 'active', ...schoolFilter }),
    db.count('hostel_allocations', { status: 'active', ...schoolFilter }),
  ]);

  const stats = {
    totalStudents,
    totalTeachers,
    totalClasses,
    presentToday: extractCount(presentToday),
    absentToday: extractCount(absentToday),
    feeCollectedToday: extractSum(feeCollectedTodayAgg, 'total'),
    outstandingDues: extractSum(outstandingDuesAgg, 'total'),
    overdueInvoices: extractCount(overdueInvoicesAgg),
    libraryBooksIssued,
    transportStudents,
    hostelOccupancy,
  };

  // ── Trends (last 12 months) ─────────────────────────────────────────────
  const enrollmentScope = whereSchool(req, 'students', 1);
  const feeCollectedTrendScope = whereSchool(req, 'fee_payments', 1);
  const feeTargetScope = whereSchool(req, 'fee_invoices', 1);

  const [enrollmentAgg, feeCollectedAgg, feeTargetAgg] = await Promise.all([
    db.raw(
      `SELECT EXTRACT(YEAR FROM admission_date) AS year,
              EXTRACT(MONTH FROM admission_date) AS month,
              COUNT(*) AS students
       FROM students
       WHERE status = $1 AND admission_date >= $2 AND admission_date <= $3${enrollmentScope.clause}
       GROUP BY 1, 2`,
      ['active', rangeStart, rangeEnd, ...enrollmentScope.params]
    ),
    db.raw(
      `SELECT EXTRACT(YEAR FROM paid_date) AS year,
              EXTRACT(MONTH FROM paid_date) AS month,
              SUM(amount) AS collected
       FROM fee_payments
       WHERE status = $1 AND paid_date >= $2 AND paid_date <= $3${feeCollectedTrendScope.clause}
       GROUP BY 1, 2`,
      ['completed', rangeStart, rangeEnd, ...feeCollectedTrendScope.params]
    ),
    db.raw(
      `SELECT EXTRACT(YEAR FROM due_date) AS year,
              EXTRACT(MONTH FROM due_date) AS month,
              SUM(total_amount) AS target
       FROM fee_invoices
       WHERE status <> $1 AND due_date >= $2 AND due_date <= $3${feeTargetScope.clause}
       GROUP BY 1, 2`,
      ['cancelled', rangeStart, rangeEnd, ...feeTargetScope.params]
    ),
  ]);

  const enrollmentMap = new Map(
    enrollmentAgg.map((i) => [`${Number(i.year)}-${Number(i.month)}`, Number(i.students)])
  );
  const collectedMap = new Map(
    feeCollectedAgg.map((i) => [`${Number(i.year)}-${Number(i.month)}`, Number(i.collected)])
  );
  const targetMap = new Map(
    feeTargetAgg.map((i) => [`${Number(i.year)}-${Number(i.month)}`, Number(i.target)])
  );

  const trends = {
    enrollment: months.map((m) => ({
      month: m.label,
      students: enrollmentMap.get(`${m.year}-${m.month}`) || 0,
    })),
    feeCollection: months.map((m) => ({
      month: m.label,
      collected: collectedMap.get(`${m.year}-${m.month}`) || 0,
      target: targetMap.get(`${m.year}-${m.month}`) || 0,
    })),
  };

  // ── Distribution ────────────────────────────────────────────────────────
  const genderScope = whereSchool(req, 'students', 1);
  const classWiseScope = whereSchool(req, 'students', 1);

  const [genderRows, classWiseRows] = await Promise.all([
    db.raw(
      `SELECT gender, COUNT(*) AS value
       FROM students
       WHERE status = $1${genderScope.clause}
       GROUP BY gender
       ORDER BY gender`,
      ['active', ...genderScope.params]
    ),
    db.raw(
      `SELECT c.name AS class_name, cs.name AS section_name, COUNT(*) AS count
       FROM students s
       JOIN classes c ON c.id = s.class_id
       JOIN class_sections cs ON cs.id = s.section_id
       WHERE s.status = $1${classWiseScope.clause}
       GROUP BY c.name, cs.name
       ORDER BY c.name, cs.name`,
      ['active', ...classWiseScope.params]
    ),
  ]);

  const genderDistribution = genderRows.map((r) => ({
    name: capitalize(r.gender),
    value: Number(r.value),
  }));

  const classWiseDistribution = classWiseRows.map((r) => ({
    class: `${r.class_name} - ${r.section_name}`,
    count: Number(r.count),
  }));

  const distribution = {
    gender: genderDistribution,
    classWise: classWiseDistribution,
  };

  // ── Recent activity (synthesized, last 8 events) ─────────────────────────
  const recentStudentScope = whereSchool(req, 'students', 1);
  const recentPaymentScope = whereSchool(req, 'fee_payments', 1);
  const recentAttendanceScope = whereSchool(req, 'attendance', 0);
  const recentExamScope = whereSchool(req, 'exam_schedules', 0);
  const recentBookScope = whereSchool(req, 'book_issues', 0);

  const [recentStudents, recentPayments, recentAttendance, recentExamSchedules, recentBookIssues] =
    await Promise.all([
      db.raw(
        `SELECT id, first_name, last_name, admission_no, created_at
         FROM students
         WHERE status = $1${recentStudentScope.clause}
         ORDER BY created_at DESC
         LIMIT 5`,
        ['active', ...recentStudentScope.params]
      ),
      db.raw(
        `SELECT fp.id, fp.receipt_no, fp.paid_date, fp.amount,
                s.first_name, s.last_name
         FROM fee_payments fp
         JOIN students s ON s.id = fp.student_id
         WHERE fp.status = $1${recentPaymentScope.clause}
         ORDER BY fp.paid_date DESC
         LIMIT 5`,
        ['completed', ...recentPaymentScope.params]
      ),
      db.raw(
        `SELECT a.id, a.date, a.status,
                s.first_name, s.last_name
         FROM attendance a
         JOIN students s ON s.id = a.student_id
         WHERE 1=1${recentAttendanceScope.clause}
         ORDER BY a.created_at DESC
         LIMIT 5`,
        [...recentAttendanceScope.params]
      ),
      db.raw(
        `SELECT es.id, es.exam_date,
                s.name AS subject_name, c.name AS class_name
         FROM exam_schedules es
         JOIN subjects s ON s.id = es.subject_id
         JOIN classes c ON c.id = es.class_id
         WHERE 1=1${recentExamScope.clause}
         ORDER BY es.created_at DESC
         LIMIT 5`,
        [...recentExamScope.params]
      ),
      db.raw(
        `SELECT bi.id, bi.issue_date,
                b.title, s.first_name, s.last_name
         FROM book_issues bi
         JOIN books b ON b.id = bi.book_id
         JOIN students s ON s.id = bi.student_id
         WHERE bi.status IN ('issued','overdue')${recentBookScope.clause}
         ORDER BY bi.issue_date DESC
         LIMIT 5`,
        [...recentBookScope.params]
      ),
    ]);

  let recentActivity = [
    ...recentStudents.map((s) => ({
      id: s.id,
      action: 'New student admitted',
      detail: `${safeName(s)} (${s.admission_no || 'N/A'})`,
      time: s.created_at ? new Date(s.created_at).toISOString() : new Date().toISOString(),
      type: 'student',
    })),
    ...recentPayments.map((p) => ({
      id: p.id,
      action: 'Fee payment received',
      detail: `Receipt ${p.receipt_no || 'N/A'} - ${safeName(p)}`,
      time: p.paid_date ? new Date(p.paid_date).toISOString() : new Date().toISOString(),
      type: 'payment',
    })),
    ...recentAttendance.map((a) => ({
      id: a.id,
      action: `${capitalize(a.status)}`,
      detail: `${safeName(a)} marked ${a.status}`,
      time: a.date ? new Date(a.date).toISOString() : new Date().toISOString(),
      type: 'attendance',
    })),
    ...recentExamSchedules.map((e) => ({
      id: e.id,
      action: 'Exam scheduled',
      detail: `${e.subject_name || 'Subject'} for ${e.class_name || 'Class'}`,
      time: e.exam_date ? new Date(e.exam_date).toISOString() : new Date().toISOString(),
      type: 'exam',
    })),
    ...recentBookIssues.map((b) => ({
      id: b.id,
      action: 'Book issued',
      detail: `${b.title || 'Book'} issued to ${safeName(b)}`,
      time: b.issue_date ? new Date(b.issue_date).toISOString() : new Date().toISOString(),
      type: 'library',
    })),
  ];

  recentActivity.sort((a, b) => new Date(b.time) - new Date(a.time));
  recentActivity = recentActivity.slice(0, 8);

  return ApiResponse.success(
    res,
    { stats, trends, distribution, recentActivity },
    'Dashboard data retrieved'
  );
});

// @desc    Get student statistics
// @route   GET /api/v1/reports/students
// @access  Admin, Principal, Teacher
exports.getStudentStats = catchAsync(async (req, res) => {
  const { academicYear } = req.query;

  const baseParams = ['active'];
  let yearFilter = '';
  if (academicYear) {
    yearFilter = 'AND (ay.name = $2 OR s.academic_year_id = $2)';
    baseParams.push(academicYear);
  }

  const schoolScope = scopeBySchool(req, baseParams.length);
  if (schoolScope.clause !== '1=1') {
    yearFilter += ` AND s.${schoolScope.clause}`;
    baseParams.push(...schoolScope.params);
  }

  // Enrollment by class (for bar chart)
  const enrollmentByClassRows = await db.raw(
    `SELECT c.name AS class_name, cs.name AS section_name, COUNT(*) AS count
     FROM students s
     JOIN classes c ON c.id = s.class_id
     JOIN class_sections cs ON cs.id = s.section_id
     JOIN academic_years ay ON ay.id = s.academic_year_id
     WHERE s.status = $1 ${yearFilter}
     GROUP BY c.name, cs.name
     ORDER BY c.name, cs.name`,
    baseParams
  );

  const enrollmentByClass = enrollmentByClassRows.map((r) => ({
    className: `${r.class_name} - ${r.section_name}`,
    count: Number(r.count),
  }));

  // Gender ratio (for pie chart)
  const genderRatioRows = await db.raw(
    `SELECT s.gender AS _id, COUNT(*) AS count
     FROM students s
     JOIN academic_years ay ON ay.id = s.academic_year_id
     WHERE s.status = $1 ${yearFilter}
     GROUP BY s.gender`,
    baseParams
  );

  const genderRatio = genderRatioRows.map((r) => ({
    _id: r._id,
    count: Number(r.count),
  }));

  // Monthly admissions (for line chart) - current year
  const currentYear = new Date().getFullYear();
  const startDate = new Date(currentYear, 0, 1);
  const endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);

  const admissionsScope = whereSchool(req, 'students', 2);
  const monthlyAdmissionsRows = await db.raw(
    `SELECT EXTRACT(MONTH FROM created_at) AS month, COUNT(*) AS count
     FROM students
     WHERE created_at >= $1 AND created_at <= $2${admissionsScope.clause}
     GROUP BY 1
     ORDER BY 1`,
    [startDate, endDate, ...admissionsScope.params]
  );

  const admissionsMap = new Map(
    monthlyAdmissionsRows.map((m) => [Number(m.month), Number(m.count)])
  );

  // Fill all months
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const filledMonthlyAdmissions = months.map((month, index) => ({
    month,
    monthNumber: index + 1,
    count: admissionsMap.get(index + 1) || 0,
  }));

  return ApiResponse.success(
    res,
    {
      enrollmentByClass,
      genderRatio,
      monthlyAdmissions: filledMonthlyAdmissions,
    },
    'Student stats retrieved'
  );
});

// @desc    Get fee statistics
// @route   GET /api/v1/reports/fees
// @access  Admin, Principal, Accountant
exports.getFeeStats = catchAsync(async (req, res) => {
  const { year } = req.query;
  const targetYear = year ? Number(year) : new Date().getFullYear();

  const startDate = new Date(targetYear, 0, 1);
  const endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999);

  // Monthly collection
  const collectionScope = whereSchool(req, 'fee_payments', 2);
  const monthlyCollectionRows = await db.raw(
    `SELECT EXTRACT(MONTH FROM paid_date) AS month,
            SUM(amount) AS total,
            COUNT(*) AS count
     FROM fee_payments
     WHERE paid_date >= $1 AND paid_date <= $2 AND status = 'completed'${collectionScope.clause}
     GROUP BY 1
     ORDER BY 1`,
    [startDate, endDate, ...collectionScope.params]
  );

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const collectionMap = new Map(monthlyCollectionRows.map((m) => [Number(m.month), m]));
  const filledMonthly = months.map((month, index) => {
    const row = collectionMap.get(index + 1);
    return {
      month,
      total: row ? Number(row.total) : 0,
      count: row ? Number(row.count) : 0,
    };
  });

  // Outstanding by class (derived from invoice balances)
  const outstandingScope = whereSchool(req, 'fee_invoices', 0);
  const outstandingByClassRows = await db.raw(
    `SELECT c.name AS class_name, cs.name AS section_name,
            SUM(fi.balance_amount) AS total_outstanding
     FROM fee_invoices fi
     JOIN students s ON s.id = fi.student_id
     JOIN classes c ON c.id = s.class_id
     JOIN class_sections cs ON cs.id = s.section_id
     WHERE fi.status IN ('pending','partial','overdue')${outstandingScope.clause}
     GROUP BY c.name, cs.name`,
    [...outstandingScope.params]
  );

  const outstandingByClass = outstandingByClassRows.map((r) => ({
    className: `${r.class_name} - ${r.section_name}`,
    totalOutstanding: Number(r.total_outstanding),
  }));

  // Payment mode distribution
  const paymentModeScope = whereSchool(req, 'fee_payments', 0);
  const paymentModeRows = await db.raw(
    `SELECT payment_mode AS _id, COUNT(*) AS count, SUM(amount) AS total
     FROM fee_payments
     WHERE status = 'completed'${paymentModeScope.clause}
     GROUP BY payment_mode`,
    [...paymentModeScope.params]
  );

  const paymentModeDistribution = paymentModeRows.map((r) => ({
    _id: r._id,
    count: Number(r.count),
    total: Number(r.total),
  }));

  return ApiResponse.success(
    res,
    {
      monthlyCollection: filledMonthly,
      outstandingByClass,
      paymentModeDistribution,
    },
    'Fee stats retrieved'
  );
});

// @desc    Get attendance statistics
// @route   GET /api/v1/reports/attendance
// @access  Admin, Principal, Teacher
exports.getAttendanceStats = catchAsync(async (req, res) => {
  const { month, year } = req.query;

  const targetMonth = month ? Number(month) - 1 : new Date().getMonth();
  const targetYear = year ? Number(year) : new Date().getFullYear();

  const startDate = new Date(targetYear, targetMonth, 1);
  const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

  // Class-wise attendance percentage
  const classWiseScope = whereSchool(req, 'attendance', 2);
  const classWiseRows = await db.raw(
    `SELECT c.name AS class_name, cs.name AS section_name,
            COUNT(*) AS total,
            SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present,
            SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent,
            SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) AS late,
            SUM(CASE WHEN a.status = 'half_day' THEN 1 ELSE 0 END) AS half_day,
            SUM(CASE WHEN a.status = 'on_leave' THEN 1 ELSE 0 END) AS on_leave
     FROM attendance a
     JOIN classes c ON c.id = a.class_id
     JOIN class_sections cs ON cs.id = a.section_id
     WHERE a.date >= $1 AND a.date <= $2${classWiseScope.clause}
     GROUP BY c.name, cs.name`,
    [startDate, endDate, ...classWiseScope.params]
  );

  const classWiseAttendance = classWiseRows.map((r) => {
    const total = Number(r.total);
    const present = Number(r.present);
    const absent = Number(r.absent);
    const late = Number(r.late);
    const halfDay = Number(r.half_day);
    const onLeave = Number(r.on_leave);
    return {
      className: `${r.class_name} - ${r.section_name}`,
      total,
      present,
      absent,
      late,
      halfDay,
      onLeave,
      percentage: calculateAttendancePercentage({ present, absent, late, halfDay, onLeave }),
    };
  });

  // Monthly trend (last 6 months)
  const sixMonthsAgo = new Date(targetYear, targetMonth - 5, 1);
  const monthlyTrendScope = whereSchool(req, 'attendance', 2);
  const monthlyTrendRows = await db.raw(
    `SELECT EXTRACT(YEAR FROM date) AS year,
            EXTRACT(MONTH FROM date) AS month,
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present
     FROM attendance
     WHERE date >= $1 AND date <= $2${monthlyTrendScope.clause}
     GROUP BY 1, 2
     ORDER BY 1, 2`,
    [sixMonthsAgo, endDate, ...monthlyTrendScope.params]
  );

  const monthlyTrend = monthlyTrendRows.map((r) => ({
    _id: { year: Number(r.year), month: Number(r.month) },
    total: Number(r.total),
    present: Number(r.present),
  }));

  // Defaulter count (< 75%)
  const allActiveStudents = await db.count('students', { status: 'active', ...getSchoolFilter(req) });

  const defaulterScope = whereSchool(req, 'attendance', 2);
  const studentAttendance = await db.raw(
    `SELECT student_id,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END)::int AS present,
            SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END)::int AS absent,
            SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END)::int AS late,
            SUM(CASE WHEN status = 'half_day' THEN 1 ELSE 0 END)::int AS half_day,
            SUM(CASE WHEN status = 'on_leave' THEN 1 ELSE 0 END)::int AS on_leave,
            COUNT(*)::int AS total
     FROM attendance
     WHERE date >= $1 AND date <= $2${defaulterScope.clause}
     GROUP BY student_id`,
    [startDate, endDate, ...defaulterScope.params]
  );

  const defaulterCount = studentAttendance.filter((r) => {
    const percentage = calculateAttendancePercentage({
      present: Number(r.present),
      absent: Number(r.absent),
      late: Number(r.late),
      halfDay: Number(r.half_day),
      onLeave: Number(r.on_leave),
    });
    return percentage < 75;
  }).length;

  return ApiResponse.success(
    res,
    {
      classWiseAttendance,
      monthlyTrend,
      defaulterCount,
      defaulterPercentage:
        allActiveStudents > 0
          ? Number(((defaulterCount / allActiveStudents) * 100).toFixed(2))
          : 0,
    },
    'Attendance stats retrieved'
  );
});

// @desc    Get exam statistics
// @route   GET /api/v1/reports/exams
// @access  Admin, Principal, Teacher
exports.getExamStats = catchAsync(async (req, res) => {
  const { examId } = req.query;

  if (!examId) {
    const examScope = schoolWhere(req, 0);
    const exams = await db.raw(
      `SELECT id, name, exam_type AS type FROM exams${examScope.clause} ORDER BY created_at DESC`,
      [...examScope.params]
    );
    return ApiResponse.success(res, { exams }, 'Available exams');
  }

  const marksScope = whereSchool(req, 'marks', 1);
  const markRows = await db.raw(
    `SELECT m.id, m.marks_obtained AS "marksObtained", m.pass_marks AS "passMarks",
            m.grade,
            s.id AS "subjectId", s.name AS "subjectName", s.code AS "subjectCode"
     FROM marks m
     JOIN subjects s ON s.id = m.subject_id
     WHERE m.exam_id = $1 AND m.status = 'published'${marksScope.clause}`,
    [examId, ...marksScope.params]
  );

  const marks = markRows.map((r) => ({
    marksObtained: r.marksObtained == null ? null : Number(r.marksObtained),
    passMarks: Number(r.passMarks),
    grade: r.grade,
    subject: {
      id: r.subjectId,
      name: r.subjectName,
      code: r.subjectCode,
    },
  }));

  // Pass/fail ratio
  const passCount = marks.filter((m) => m.marksObtained >= m.passMarks).length;
  const failCount = marks.filter((m) => m.marksObtained < m.passMarks).length;

  // Grade distribution
  const gradeDistribution = {};
  marks.forEach((m) => {
    const grade = m.grade || 'N/A';
    gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
  });

  // Subject-wise averages
  const subjectStats = {};
  marks.forEach((m) => {
    const subjId = m.subject?.id;
    if (!subjId) return;
    if (!subjectStats[subjId]) {
      subjectStats[subjId] = {
        subject: m.subject,
        totalMarks: 0,
        count: 0,
        highest: m.marksObtained,
        lowest: m.marksObtained,
      };
    }
    subjectStats[subjId].totalMarks += m.marksObtained;
    subjectStats[subjId].count += 1;
    subjectStats[subjId].highest = Math.max(subjectStats[subjId].highest, m.marksObtained);
    subjectStats[subjId].lowest = Math.min(subjectStats[subjId].lowest, m.marksObtained);
  });

  const subjectWiseAverages = Object.values(subjectStats).map((s) => ({
    subject: s.subject,
    average: (s.totalMarks / s.count).toFixed(2),
    highest: s.highest,
    lowest: s.lowest,
    totalStudents: s.count,
  }));

  return ApiResponse.success(
    res,
    {
      passFailRatio: { pass: passCount, fail: failCount },
      gradeDistribution,
      subjectWiseAverages,
    },
    'Exam stats retrieved'
  );
});
