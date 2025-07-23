const crypto = require('crypto');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const db = require('../db');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { parseCSV } = require('../utils/csvParser');
const { sendTemplatedEmail } = require('../utils/emailService');
const { sendSMS } = require('../utils/smsService');
const { getSchoolFilter } = require('../middleware/auth');

const MAX_CSV_ROWS = 10000;
const MAX_CSV_COLUMNS = 50;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const generateRandomPassword = () => `${crypto.randomBytes(8).toString('hex')}A1!`;

const generateSetPasswordToken = async (user, expiresMinutes = 24 * 60) => {
  const token = crypto.randomBytes(32).toString('hex');
  const passwordResetToken = hashToken(token);
  const passwordResetExpires = new Date(Date.now() + expiresMinutes * 60 * 1000);

  await db.update(
    'users',
    { password_reset_token: passwordResetToken, password_reset_expires: passwordResetExpires },
    { id: user.id }
  );

  return token;
};

const buildSetPasswordUrl = (token) => {
  const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${clientUrl}/set-password?token=${token}`;
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());

const normalize = (value) => (value ? String(value).trim() : '');

const hashPassword = async (password) => bcrypt.hash(password, 12);

const getSchoolId = (req) => getSchoolFilter(req).school_id || req.user.school_id;

const generateNextRollNo = async (classId, sectionId, academicYearId, schoolId) => {
  const students = await db.findMany('students', {
    where: { class_id: classId, section_id: sectionId, academic_year_id: academicYearId, school_id: schoolId },
  });

  const max = students.reduce((m, s) => {
    const n = parseInt(s.roll_no, 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);

  return String(max + 1);
};

const ROLE_TEMPLATES = {
  teacher: ['name', 'email', 'phone'],
  accountant: ['name', 'email', 'phone'],
  librarian: ['name', 'email', 'phone'],
  staff: ['name', 'email', 'phone'],
  admin: ['name', 'email', 'phone'],
  parent: ['name', 'email', 'phone', 'studentAdmissionNo'],
  student: [
    'firstName',
    'lastName',
    'gender',
    'dob',
    'admissionNo',
    'className',
    'sectionName',
    'academicYearName',
    'email',
    'phone',
  ],
};

const REQUIRED_BY_ROLE = {
  teacher: ['name', 'email'],
  accountant: ['name', 'email'],
  librarian: ['name', 'email'],
  staff: ['name', 'email'],
  admin: ['name', 'email'],
  parent: ['name', 'email'],
  student: ['firstName', 'lastName', 'gender', 'dob', 'admissionNo', 'className', 'sectionName'],
};

const createStaffUser = async (row, role, schoolId) => {
  const name = normalize(row.name);
  const email = normalize(row.email).toLowerCase();
  const phone = normalize(row.phone);
  const plainPassword = normalize(row.password) || generateRandomPassword();

  if (!isValidEmail(email)) {
    throw new Error('Invalid email address');
  }
  if (plainPassword.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const existing = await db.findOne('users', { email });
  if (existing) throw new Error('User with this email already exists');

  const password = await hashPassword(plainPassword);

  const user = await db.insert('users', {
    name,
    email,
    password,
    role,
    phone,
    school_id: schoolId,
    status: 'active',
  });

  return {
    userId: user.id,
    email,
    password: normalize(row.password) ? undefined : plainPassword,
  };
};

const createParentUser = async (row, schoolId) => {
  const name = normalize(row.name);
  const email = normalize(row.email).toLowerCase();
  const phone = normalize(row.phone);
  const studentAdmissionNo = normalize(row.studentAdmissionNo);

  if (!isValidEmail(email)) throw new Error('Invalid email address');

  const existing = await db.findOne('users', { email });
  if (existing) throw new Error('User with this email already exists');

  const tempPassword = generateRandomPassword();
  const password = await hashPassword(tempPassword);

  const user = await db.insert('users', {
    name,
    email,
    password,
    role: 'parent',
    phone,
    school_id: schoolId,
    status: 'pending',
  });

  const guardian = await db.insert('guardians', {
    first_name: name.split(' ')[0] || name,
    last_name: name.split(' ').slice(1).join(' ') || '',
    relationship: 'guardian',
    phone,
    email,
    user_id: user.id,
    school_id: schoolId,
  });

  if (studentAdmissionNo) {
    const student = await db.raw(
      'SELECT id FROM students WHERE admission_no = $1 AND school_id = $2 LIMIT 1',
      [studentAdmissionNo, schoolId]
    );
    if (student && student.length > 0) {
      await db.raw(
        `INSERT INTO student_guardians (student_id, guardian_id, school_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (student_id, guardian_id) DO NOTHING`,
        [student[0].id, guardian.id, schoolId]
      );
    }
  }

  const token = await generateSetPasswordToken(user);
  const setPasswordUrl = buildSetPasswordUrl(token);

  try {
    await sendTemplatedEmail('parentInvite', user.email, { name: user.name, setPasswordUrl });
  } catch (err) {
    console.error('Failed to send parent invite email:', err.message);
  }
  if (user.phone) {
    try {
      await sendSMS({
        to: user.phone,
        message: `Welcome to the school portal. Please check your email (${user.email}) to set your password.`,
      });
    } catch (err) {
      console.error('Failed to send parent invite SMS:', err.message);
    }
  }

  return { userId: user.id, guardianId: guardian.id, email };
};

const createStudentUser = async (row, schoolId) => {
  const firstName = normalize(row.firstName);
  const lastName = normalize(row.lastName);
  const gender = normalize(row.gender).toLowerCase();
  const dob = normalize(row.dob);
  const admissionNo = normalize(row.admissionNo);
  const className = normalize(row.className);
  const sectionName = normalize(row.sectionName).toUpperCase();
  const academicYearName = normalize(row.academicYearName);
  const email = normalize(row.email).toLowerCase();
  const phone = normalize(row.phone);

  if (!['male', 'female', 'other'].includes(gender)) {
    throw new Error("Gender must be 'male', 'female' or 'other'");
  }
  if (!Date.parse(dob)) throw new Error('Invalid date of birth');

  const existingStudent = await db.findOne('students', {
    admission_no: admissionNo,
    school_id: schoolId,
  });
  if (existingStudent) throw new Error('Student with this admission number already exists');

  let academicYearId = null;
  let classQuery = 'SELECT * FROM classes WHERE name = $1 AND status <> \'inactive\'';
  let classParams = [className];

  if (academicYearName) {
    const ay = await db.findOne('academic_years', {
      name: academicYearName,
      ...getSchoolFilter({ user: { role: 'admin', school_id: schoolId }, query: {} }),
    });
    if (!ay) throw new Error(`Academic year "${academicYearName}" not found`);
    academicYearId = ay.id;
    classQuery += ' AND academic_year_id = $2 AND school_id = $3';
    classParams.push(academicYearId, schoolId);
  } else {
    classQuery += ' AND school_id = $2';
    classParams.push(schoolId);
  }

  classQuery += ' LIMIT 1';
  const classRows = await db.raw(classQuery, classParams);
  const cls = classRows[0];
  if (!cls) throw new Error(`Class "${className}" not found`);

  const sectionRows = await db.raw(
    `SELECT * FROM class_sections
     WHERE class_id = $1 AND status <> 'inactive' AND school_id = $2`,
    [cls.id, schoolId]
  );
  const section = sectionRows.find((s) => s.name.toUpperCase() === sectionName);
  if (!section) throw new Error(`Section "${sectionName}" not found in class "${className}"`);

  const finalAcademicYearId = academicYearId || cls.academic_year_id;

  const userEmail = email || `${admissionNo.toLowerCase()}@student.school.com`;
  const existingUser = await db.findOne('users', { email: userEmail });
  if (existingUser) throw new Error(`User with email ${userEmail} already exists`);

  const plainPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!plainPassword) {
    throw new Error('SEED_ADMIN_PASSWORD environment variable is required');
  }
  const password = await hashPassword(plainPassword);

  const user = await db.insert('users', {
    name: `${firstName} ${lastName}`,
    email: userEmail,
    password,
    role: 'student',
    phone,
    school_id: schoolId,
    status: 'active',
  });

  const rollNo = await generateNextRollNo(cls.id, section.id, finalAcademicYearId, schoolId);

  const student = await db.insert('students', {
    first_name: firstName,
    last_name: lastName,
    gender,
    dob: new Date(dob),
    admission_no: admissionNo,
    roll_no: rollNo,
    class_id: cls.id,
    section_id: section.id,
    academic_year_id: finalAcademicYearId,
    email: userEmail,
    phone,
    status: 'active',
    user_id: user.id,
    school_id: schoolId,
  });

  return { userId: user.id, studentId: student.id, admissionNo, rollNo };
};

exports.bulkUploadUsers = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new ApiError('CSV file is required', 400);
  }

  const role = req.body.role;
  const allowedRoles = Object.keys(ROLE_TEMPLATES);
  if (!role || !allowedRoles.includes(role)) {
    throw new ApiError(`Invalid role. Allowed roles: ${allowedRoles.join(', ')}`, 400);
  }

  const rows = await parseCSV(fs.createReadStream(req.file.path));
  if (rows.length === 0) {
    throw new ApiError('CSV file is empty', 400);
  }
  if (rows.length > MAX_CSV_ROWS) {
    throw new ApiError(`CSV exceeds the maximum allowed ${MAX_CSV_ROWS} rows`, 400);
  }
  if (Object.keys(rows[0]).length > MAX_CSV_COLUMNS) {
    throw new ApiError(`CSV exceeds the maximum allowed ${MAX_CSV_COLUMNS} columns`, 400);
  }

  const required = REQUIRED_BY_ROLE[role];
  const headers = Object.keys(rows[0]).map((h) => h.trim().toLowerCase());
  const missingHeaders = required.filter((h) => !headers.includes(h.toLowerCase()));
  if (missingHeaders.length) {
    throw new ApiError(
      `CSV is missing required columns for role "${role}": ${missingHeaders.join(', ')}`,
      400
    );
  }

  const results = [];
  const errors = [];
  let successCount = 0;
  const schoolId = getSchoolId(req);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // header is row 1

    try {
      let result;
      if (role === 'parent') {
        result = await createParentUser(row, schoolId);
      } else if (role === 'student') {
        result = await createStudentUser(row, schoolId);
      } else {
        result = await createStaffUser(row, role, schoolId);
      }
      results.push({ row: rowNumber, ...result, status: 'success' });
      successCount += 1;
    } catch (err) {
      errors.push({ row: rowNumber, message: err.message });
    }
  }

  return ApiResponse.success(
    res,
    {
      role,
      total: rows.length,
      success: successCount,
      failed: errors.length,
      results,
      errors,
    },
    'Bulk upload processed',
    201
  );
});

exports.getBulkUploadTemplate = catchAsync(async (req, res) => {
  const { role } = req.query;
  const allowedRoles = Object.keys(ROLE_TEMPLATES);
  if (!role || !allowedRoles.includes(role)) {
    throw new ApiError(`Invalid role. Allowed roles: ${allowedRoles.join(', ')}`, 400);
  }

  const headers = ROLE_TEMPLATES[role].join(',') + '\n';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=${role}-template.csv`);
  return res.send(headers);
});
