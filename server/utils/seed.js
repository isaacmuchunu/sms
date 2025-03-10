require('dotenv').config();
const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker/locale/en');
const { connectDB } = require('../config/db');
const db = require('../db');

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;

if (!ADMIN_EMAIL) {
  throw new Error('SEED_ADMIN_EMAIL environment variable is required');
}
if (!ADMIN_PASSWORD) {
  throw new Error('SEED_ADMIN_PASSWORD environment variable is required');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const kenyanCounties = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Uasin Gishu', 'Kiambu', 'Kilifi',
  'Machakos', 'Kajiado', 'Nyeri', 'Kakamega', 'Bungoma', 'Meru', 'Kisii',
  'Trans Nzoia', 'Bomet', 'Kericho', 'Embu', 'Laikipia', 'Homa Bay',
];
const kenyanTowns = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi',
  'Kitale', 'Garissa', 'Nanyuki', 'Naivasha', 'Kisii', 'Machakos', 'Nyahururu',
  'Wajir', 'Mandera', 'Isiolo', 'Lamu', 'Marsabit', 'Embu',
];
const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const religions = ['Christian', 'Muslim', 'Hindu', 'Traditional', 'Other'];
const categories = ['general', 'other'];
const relationships = ['father', 'mother', 'guardian'];

const kenyanFirstNames = {
  male: ['James', 'John', 'Michael', 'David', 'Daniel', 'Peter', 'Joseph', 'Paul', 'Samuel', 'George', 'William', 'Robert', 'Stephen', 'Charles', 'Francis', 'Patrick', 'Andrew', 'Simon', 'Mark', 'Anthony', 'Brian', 'Kevin', 'Dennis', 'Alex', 'Eric', 'Henry', 'Victor', 'Kennedy', 'Collins', 'Emmanuel'],
  female: ['Mary', 'Grace', 'Jane', 'Sarah', 'Elizabeth', 'Ann', 'Agnes', 'Lucy', 'Joyce', 'Catherine', 'Ruth', 'Beatrice', 'Lilian', 'Janet', 'Hellen', 'Dorcas', 'Esther', 'Alice', 'Joy', 'Linda', 'Rose', 'Maureen', 'Irene', 'Florence', 'Mercy', 'Naomi', 'Rebecca', 'Diana', 'Caroline', 'Fridah'],
};
const kenyanLastNames = [
  'Otieno', 'Kamau', 'Wanjiru', 'Njoroge', 'Ochieng', 'Mutua', 'Koech', 'Mwangi', 'Odhiambo', 'Kiptoo',
  'Kimani', 'Omondi', 'Kipchirchir', 'Wambui', 'Onyango', 'Langat', 'Mbugua', 'Auma', 'Kiprono', 'Nyambura',
  'Karanja', 'Owino', 'Cheruiyot', 'Muthoni', 'Wafula', 'Ongoro', 'Rono', 'Juma', 'Abdi', 'Hassan',
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pad = (n, len = 2) => String(n).padStart(len, '0');
const kenyanName = (gender) => {
  const g = gender || (Math.random() > 0.5 ? 'male' : 'female');
  return { firstName: rand(kenyanFirstNames[g]), lastName: rand(kenyanLastNames) };
};
const phoneKenya = () => {
  const prefix = ['700', '701', '702', '710', '711', '712', '713', '714', '715', '716', '717', '718', '719', '720', '721', '722', '723', '724', '725', '726', '727', '728', '729', '740', '741', '742', '743', '745', '746', '747', '748', '749', '750', '751', '752', '753', '754', '755', '756', '757', '758', '759', '768', '769', '770', '771', '772', '773', '774', '775', '776', '777', '778', '779', '780', '781', '782', '783', '784', '785', '786', '787', '788', '789', '790', '791', '792', '793', '794', '795', '796', '797', '798', '799'][randInt(0, 60)];
  return `+254-${prefix}-${faker.string.numeric(6)}`;
};
const formatTime = (h, m) => `${pad(h)}:${pad(m)}`;
const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const gradeToAgeRange = (grade) => {
  const baseAge = grade + 5;
  return { min: baseAge - 1, max: baseAge + 1 };
};

const hashPassword = async (password) => bcrypt.hash(password, 12);

const weightedStatus = () => {
  const r = Math.random();
  if (r < 0.82) return 'present';
  if (r < 0.9) return 'absent';
  if (r < 0.95) return 'late';
  if (r < 0.98) return 'half_day';
  return 'on_leave';
};

const gradeFromPercentage = (pct) => {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
};

const uniqueCode = (prefix, idx, len = 3) => `${prefix}${pad(idx + 1, len)}`;

const batchInsert = async (table, rows, batchSize = 500) => {
  if (!rows || rows.length === 0) return [];
  const inserted = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const keys = Object.keys(batch[0]);
    const columns = keys.map((k) => `"${k}"`).join(', ');
    const values = [];
    let placeholderIdx = 0;
    const placeholders = batch
      .map(() => `(${keys.map(() => `$${++placeholderIdx}`).join(', ')})`)
      .join(', ');
    for (const row of batch) {
      for (const k of keys) values.push(row[k]);
    }
    const query = `INSERT INTO "${table}" (${columns}) VALUES ${placeholders} RETURNING *`;
    const result = await db.raw(query, values);
    inserted.push(...result);
  }
  return inserted;
};

const validateSeedEnv = () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('Destructive seeding is blocked when NODE_ENV=production.');
    process.exit(1);
  }
  if (process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') {
    console.error('Destructive seeding requires ALLOW_DESTRUCTIVE_SEED=true.');
    process.exit(1);
  }
};

// ---------------------------------------------------------------------------
// Main seed routine
// ---------------------------------------------------------------------------
const seedDatabase = async () => {
  validateSeedEnv();
  const startTime = Date.now();
  try {
    await connectDB();
    await db.raw('SELECT 1');

    // -----------------------------------------------------------------------
    // 1. Clear tables in dependency order
    // -----------------------------------------------------------------------
    console.log('Clearing existing data...');
    await db.raw(`
      TRUNCATE TABLE
        academic_year_terms,
        attendance,
        announcements,
        notifications,
        meetings,
        book_reservations,
        book_issues,
        book_copies,
        books,
        payment_transactions,
        fee_payments,
        fee_invoice_items,
        fee_invoices,
        fee_concessions,
        fee_structure_items,
        fee_structures,
        fee_heads,
        marks,
        exam_schedules,
        exams,
        timetable_entries,
        class_subjects,
        subject_applicable_classes,
        student_guardians,
        student_documents,
        student_medical_info,
        hostel_allocations,
        hostel_room_beds,
        hostel_rooms,
        hostels,
        student_transports,
        transport_route_stops,
        transport_routes,
        vehicles,
        teacher_documents,
        teacher_subjects,
        teachers,
        students,
        guardians,
        class_sections,
        classes,
        subjects,
        academic_years,
        sessions,
        users,
        schools,
        grading_scale_grades,
        grading_scales
      RESTART IDENTITY CASCADE
    `);
    console.log('Existing data cleared.');

    // -----------------------------------------------------------------------
    // 2. Super admin, school and school admin
    // -----------------------------------------------------------------------
    console.log('Creating super admin, school and school admin...');
    const sharedPasswordHash = await hashPassword(ADMIN_PASSWORD);

    const superAdmin = await db.insert('users', {
      name: 'Isaac Muchunu',
      email: 'isaacmuchunu@gmail.com',
      password: sharedPasswordHash,
      role: 'super_admin',
      phone: phoneKenya(),
      status: 'active',
      preferences: { language: 'en', theme: 'light', notifications: { email: true, sms: false, push: true } },
    });
    console.log(`Super admin created: ${superAdmin.email}`);

    const school = await db.insert('schools', {
      name: 'Hillcrest Academy',
      address: 'Nairobi, Kenya',
      phone: phoneKenya(),
      email: 'info@hillcrestacademy.sc.ke',
      website: 'https://hillcrestacademy.sc.ke',
      affiliation_no: 'KICD/KE02345',
      board: 'CBC',
      established_year: 1995,
      status: 'active',
      modules: { transport: false, hostel: false, library: true },
    });
    console.log(`School created: ${school.name}`);
    const schoolId = school.id;

    const adminUser = await db.insert('users', {
      name: 'School Admin',
      email: 'schooladmin@hillcrestacademy.sc.ke',
      password: sharedPasswordHash,
      role: 'admin',
      school_id: schoolId,
      phone: phoneKenya(),
      status: 'active',
      preferences: { language: 'en', theme: 'light', notifications: { email: true, sms: false, push: true } },
    });
    console.log(`School admin created: ${adminUser.email}`);

    // -----------------------------------------------------------------------
    // 3. Academic year
    // -----------------------------------------------------------------------
    console.log('Creating academic year...');
    const academicYear = await db.insert('academic_years', {
      school_id: schoolId,
      name: '2024-2025',
      start_date: new Date('2024-04-01'),
      end_date: new Date('2025-03-31'),
      is_current: true,
      status: 'active',
      late_threshold_minutes: 10,
      promotion_criteria: {
        minAggregatePercentage: 40,
        maxFailingSubjects: 2,
        minAttendancePercentage: 75,
      },
    });

    await batchInsert('academic_year_terms', [
      { academic_year_id: academicYear.id, name: 'Term 1', start_date: new Date('2024-04-01'), end_date: new Date('2024-09-30') },
      { academic_year_id: academicYear.id, name: 'Term 2', start_date: new Date('2024-10-01'), end_date: new Date('2025-03-31') },
    ]);

    // -----------------------------------------------------------------------
    // 4. Subjects
    // -----------------------------------------------------------------------
    console.log('Creating subjects...');
    const subjectDefinitions = [
      { name: 'English', code: 'ENG01', type: 'core', credits: 4, max_marks: 100, pass_marks: 40 },
      { name: 'Mathematics', code: 'MATH01', type: 'core', credits: 5, max_marks: 100, pass_marks: 40 },
      { name: 'Science', code: 'SCI01', type: 'core', credits: 5, max_marks: 100, pass_marks: 40 },
      { name: 'Social Science', code: 'SST01', type: 'core', credits: 4, max_marks: 100, pass_marks: 40 },
    ];
    const subjects = await batchInsert('subjects', subjectDefinitions.map((s) => ({ ...s, school_id: schoolId, status: 'active' })));
    const subjectMap = Object.fromEntries(subjects.map((s) => [s.code, s]));
    const coreSubjects = subjects.filter((s) => s.type === 'core').slice(0, 8);

    // -----------------------------------------------------------------------
    // 5. Classes & sections
    // -----------------------------------------------------------------------
    console.log('Creating classes and sections...');
    const classDefinitions = [
      { name: 'Nursery', numeric_name: 1, sections: ['A'] },
      { name: 'LKG', numeric_name: 2, sections: ['A'] },
      { name: 'UKG', numeric_name: 3, sections: ['A'] },
      { name: 'Class 1', numeric_name: 4, sections: ['A'] },
    ];

    const classRows = classDefinitions.map((c) => ({
      school_id: schoolId,
      name: c.name,
      numeric_name: c.numeric_name,
      academic_year_id: academicYear.id,
      monthly_fee: c.numeric_name * 100 + 500,
      status: 'active',
    }));
    const classes = await batchInsert('classes', classRows);

    const sectionRows = [];
    for (let i = 0; i < classes.length; i += 1) {
      const c = classes[i];
      const def = classDefinitions[i];
      for (const sec of def.sections) {
        sectionRows.push({
          school_id: schoolId,
          class_id: c.id,
          name: sec,
          capacity: 40,
          room_number: `R${c.numeric_name}${sec}`,
          status: 'active',
        });
      }
    }
    const sections = await batchInsert('class_sections', sectionRows);

    const classByNumeric = Object.fromEntries(classes.map((c) => [c.numeric_name, c]));
    const sectionById = Object.fromEntries(sections.map((s) => [s.id, s]));

    const applicableRows = [];
    for (const subj of subjects) {
      for (const cls of classes) {
        applicableRows.push({ school_id: schoolId, subject_id: subj.id, class_id: cls.id });
      }
    }
    await batchInsert('subject_applicable_classes', applicableRows);

    // -----------------------------------------------------------------------
    // 6. Teachers & users (batched)
    // -----------------------------------------------------------------------
    console.log('Creating teachers...');
    const teacherCount = 4;
    const teacherUserRows = [];
    const teacherRows = [];
    for (let i = 0; i < teacherCount; i += 1) {
      const gender = Math.random() > 0.5 ? 'male' : 'female';
      const { firstName, lastName } = kenyanName(gender);
      teacherUserRows.push({
        index: i,
        name: `${firstName} ${lastName}`,
        email: `teacher.${pad(i + 1, 3)}@school.com`,
        role: 'teacher',
        phone: phoneKenya(),
        status: 'active',
        firstName,
        lastName,
        gender,
      });
    }

    const teacherUserInserts = teacherUserRows.map((u) => ({
      name: u.name,
      email: u.email,
      password: sharedPasswordHash,
      role: u.role,
      school_id: schoolId,
      phone: u.phone,
      status: u.status,
    }));
    const teacherUsers = await batchInsert('users', teacherUserInserts);

    for (let i = 0; i < teacherCount; i += 1) {
      const u = teacherUserRows[i];
      const ageRange = gradeToAgeRange(randInt(25, 50));
      teacherRows.push({
        school_id: schoolId,
        employee_id: uniqueCode('EMP', i, 3),
        first_name: u.firstName,
        last_name: u.lastName,
        gender: u.gender,
        dob: faker.date.birthdate({ min: ageRange.min, max: ageRange.max, mode: 'age' }),
        joining_date: addDays(new Date('2020-06-01'), randInt(0, 900)),
        phone: u.phone,
        email: u.email,
        address: faker.location.streetAddress(),
        qualification: rand(['B.Ed', 'M.Ed', 'B.Sc Education', 'M.Sc Education', 'Diploma in Education']),
        specialization: rand(subjects.map((s) => s.name)),
        designation: i === 0 ? 'Principal' : 'Teacher',
        department: rand(['Science', 'Arts', 'Languages', 'Sports', 'Admin']),
        salary: randInt(25000, 80000),
        employment_type: rand(['full_time', 'part_time', 'contract']),
        status: 'active',
        user_id: teacherUsers[i].id,
      });
    }
    const teachers = await batchInsert('teachers', teacherRows);

    const teacherSubjectRows = [];
    for (const teacher of teachers) {
      const subs = faker.helpers.arrayElements(subjects, randInt(1, 4));
      for (const sub of subs) {
        teacherSubjectRows.push({ school_id: schoolId, teacher_id: teacher.id, subject_id: sub.id });
      }
    }
    await batchInsert('teacher_subjects', teacherSubjectRows);

    // Assign class teachers to sections
    let teacherIdx = 0;
    const sectionUpdates = [];
    const teacherUpdates = [];
    for (const section of sections) {
      const teacher = teachers[teacherIdx % teachers.length];
      sectionUpdates.push({ id: section.id, class_teacher_id: teacher.id });
      teacherUpdates.push({ id: teacher.id, class_teacher_class_id: section.class_id, class_teacher_section_id: section.id });
      teacherIdx += 1;
    }
    for (const upd of sectionUpdates) {
      await db.update('class_sections', { class_teacher_id: upd.class_teacher_id }, { id: upd.id });
    }
    for (const upd of teacherUpdates) {
      await db.update('teachers', { class_teacher_class_id: upd.class_teacher_class_id, class_teacher_section_id: upd.class_teacher_section_id }, { id: upd.id });
    }

    // -----------------------------------------------------------------------
    // 7. Fee heads & fee structures
    // -----------------------------------------------------------------------
    console.log('Creating fee structures...');
    const feeHeadDefs = [
      { name: 'Tuition Fee', code: 'TUITION', type: 'tuition', frequency: 'monthly' },
      { name: 'Admission Fee', code: 'ADMISSION', type: 'admission', frequency: 'one_time' },
      { name: 'Examination Fee', code: 'EXAM', type: 'examination', frequency: 'yearly' },
      { name: 'Transport Fee', code: 'TRANSPORT', type: 'transport', frequency: 'monthly' },
    ];
    const feeHeads = await batchInsert('fee_heads', feeHeadDefs.map((f) => ({ ...f, school_id: schoolId, description: f.name, status: 'active' })));

    const feeStructureRows = [];
    for (const cls of classes) {
      for (const cat of categories) {
        feeStructureRows.push({
          school_id: schoolId,
          name: `${cls.name} - ${cat}`,
          academic_year_id: academicYear.id,
          class_id: cls.id,
          category: cat,
          total_amount: cls.numeric_name * 1200 + 12000,
          effective_from: new Date('2024-04-01'),
          effective_to: new Date('2025-03-31'),
          status: 'active',
        });
      }
    }
    const feeStructures = await batchInsert('fee_structures', feeStructureRows);

    const feeStructureItemRows = [];
    for (const fs of feeStructures) {
      const cls = classes.find((c) => c.id === fs.class_id);
      const base = cls.numeric_name * 100 + 1000;
      feeStructureItemRows.push({ school_id: schoolId, fee_structure_id: fs.id, fee_head_id: feeHeads.find((f) => f.code === 'TUITION').id, amount: base * 10, due_months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] });
      feeStructureItemRows.push({ school_id: schoolId, fee_structure_id: fs.id, fee_head_id: feeHeads.find((f) => f.code === 'ADMISSION').id, amount: base * 2, due_months: [4] });
      feeStructureItemRows.push({ school_id: schoolId, fee_structure_id: fs.id, fee_head_id: feeHeads.find((f) => f.code === 'EXAM').id, amount: base * 1.5, due_months: [9, 3] });
      feeStructureItemRows.push({ school_id: schoolId, fee_structure_id: fs.id, fee_head_id: feeHeads.find((f) => f.code === 'TRANSPORT').id, amount: base * 3, due_months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] });
    }
    await batchInsert('fee_structure_items', feeStructureItemRows);

    // -----------------------------------------------------------------------
    // 8. Guardians (batched)
    // -----------------------------------------------------------------------
    console.log('Creating guardians...');
    const guardianCount = 4;
    const guardianUserRows = [];
    for (let i = 0; i < guardianCount; i += 1) {
      if (i === 0) {
        guardianUserRows.push({
          name: 'Honar Peter',
          email: 'honarpeter@gmail.com',
          role: 'parent',
          phone: phoneKenya(),
          status: 'active',
          firstName: 'Honar',
          lastName: 'Peter',
          relationship: 'father',
          occupation: 'Businessperson',
          address: faker.location.streetAddress(),
          is_primary_contact: true,
        });
        continue;
      }
      const gender = Math.random() > 0.5 ? 'male' : 'female';
      const { firstName, lastName } = kenyanName(gender);
      guardianUserRows.push({
        name: `${firstName} ${lastName}`,
        email: `parent.${pad(i + 1, 3)}@school.com`,
        role: 'parent',
        phone: phoneKenya(),
        status: 'active',
        firstName,
        lastName,
        relationship: rand(relationships),
        occupation: rand(['Teacher', 'Farmer', 'Businessperson', 'Driver', 'Nurse', 'Engineer', 'Doctor', 'Clerk', 'Trader', 'Civil Servant']),
        address: faker.location.streetAddress(),
        is_primary_contact: i % 3 === 0,
      });
    }
    const guardianUserInserts = guardianUserRows.map((u) => ({
      name: u.name,
      email: u.email,
      password: sharedPasswordHash,
      role: u.role,
      school_id: schoolId,
      phone: u.phone,
      status: u.status,
    }));
    const guardianUsers = await batchInsert('users', guardianUserInserts);

    const guardianRows = guardianUserRows.map((u, i) => ({
      school_id: schoolId,
      first_name: u.firstName,
      last_name: u.lastName,
      relationship: u.relationship,
      phone: u.phone,
      email: u.email,
      occupation: u.occupation,
      address: u.address,
      is_primary_contact: u.is_primary_contact,
      user_id: guardianUsers[i].id,
    }));
    const guardians = await batchInsert('guardians', guardianRows);

    // -----------------------------------------------------------------------
    // 9. Students (batched)
    // -----------------------------------------------------------------------
    console.log('Creating students...');
    const studentCount = 4;
    const studentUserRows = [];
    const studentRows = [];
    let rollCounter = {};
    for (let i = 0; i < studentCount; i += 1) {
      const section = rand(sections);
      const cls = classes.find((c) => c.id === section.class_id);
      const sectionKey = `${cls.id}-${section.id}`;
      rollCounter[sectionKey] = (rollCounter[sectionKey] || 0) + 1;
      const gender = Math.random() > 0.5 ? 'male' : 'female';
      const { firstName, lastName } = kenyanName(gender);
      const classIndex = classes.findIndex((c) => c.id === cls.id);
      const ageRange = gradeToAgeRange(classIndex + 1);
      const dob = faker.date.birthdate({ min: ageRange.min, max: ageRange.max, mode: 'age' });
      const phone = phoneKenya();
      studentUserRows.push({
        index: i,
        name: `${firstName} ${lastName}`,
        email: `student.${pad(i + 1, 3)}@school.com`,
        role: 'student',
        phone,
        status: 'active',
      });
      studentRows.push({
        index: i,
        school_id: schoolId,
        admission_no: uniqueCode('ADM', i, 4),
        roll_no: String(rollCounter[sectionKey]),
        first_name: firstName,
        last_name: lastName,
        gender,
        dob,
        phone,
        email: `student.${pad(i + 1, 3)}@school.com`,
        address: faker.location.streetAddress(),
        city: rand(kenyanTowns),
        state: rand(kenyanCounties),
        pincode: faker.string.numeric(5),
        aadhar_number: faker.string.numeric(8),
        admission_date: addDays(new Date('2024-04-01'), randInt(0, 60)),
        class_id: cls.id,
        section_id: section.id,
        academic_year_id: academicYear.id,
        category: rand(categories),
        religion: rand(religions),
        caste: '',
        blood_group: rand(bloodGroups),
        previous_school: `${rand(kenyanTowns)} Primary School`,
        previous_class_percentage: randInt(40, 100),
        father_name: kenyanName('male').firstName,
        father_phone: phoneKenya(),
        father_occupation: rand(['Teacher', 'Farmer', 'Businessperson', 'Driver', 'Nurse', 'Engineer', 'Doctor', 'Clerk', 'Trader', 'Civil Servant']),
        mother_name: kenyanName('female').firstName,
        mother_phone: phoneKenya(),
        mother_occupation: rand(['Teacher', 'Nurse', 'Businessperson', 'Farmer', 'Accountant', 'Doctor', 'Clerk', 'Trader', 'Engineer', 'Homemaker']),
        guardian_name: (() => {
          const { firstName, lastName } = kenyanName();
          return `${firstName} ${lastName}`;
        })(),
        guardian_phone: phoneKenya(),
        guardian_relation: rand(relationships),
        status: 'active',
      });
    }

    const studentUserInserts = studentUserRows.map((u) => ({
      name: u.name,
      email: u.email,
      password: sharedPasswordHash,
      role: u.role,
      school_id: schoolId,
      phone: u.phone,
      status: u.status,
    }));
    const studentUsers = await batchInsert('users', studentUserInserts);

    const studentInserts = studentRows.map((s, i) => {
      const { index, ...rest } = s;
      return { ...rest, user_id: studentUsers[i].id };
    });
    const students = await batchInsert('students', studentInserts);

    const studentGuardianRows = [];
    const medicalRows = [];
    for (let i = 0; i < students.length; i += 1) {
      const student = students[i];
      // Ensure the first student is linked to Honar Peter (first guardian)
      // and other students get random guardians.
      const sgrd = i === 0
        ? [guardians[0]]
        : faker.helpers.arrayElements(guardians, randInt(1, 2));
      for (const g of sgrd) {
        studentGuardianRows.push({ school_id: schoolId, student_id: student.id, guardian_id: g.id });
      }
      medicalRows.push({
        school_id: schoolId,
        student_id: student.id,
        allergies: Math.random() > 0.8 ? faker.lorem.words(2) : '',
        medications: Math.random() > 0.85 ? faker.lorem.words(2) : '',
        emergency_contact: phoneKenya(),
      });
    }
    await batchInsert('student_guardians', studentGuardianRows);
    await batchInsert('student_medical_info', medicalRows);

    // -----------------------------------------------------------------------
    // 10. Class subjects
    // -----------------------------------------------------------------------
    console.log('Creating class subjects...');
    const classSubjectRows = [];
    for (const section of sections) {
      const cls = classes.find((c) => c.id === section.class_id);
      const classIndex = classes.findIndex((c) => c.id === cls.id);
      const applicable = coreSubjects.slice(0, Math.min(coreSubjects.length, 6 + Math.floor(classIndex / 2)));
      for (const subj of applicable) {
        classSubjectRows.push({
          school_id: schoolId,
          class_id: cls.id,
          section_id: section.id,
          subject_id: subj.id,
          teacher_id: rand(teachers).id,
          academic_year_id: academicYear.id,
          weekly_periods: randInt(4, 8),
          is_elective: subj.type === 'elective',
        });
      }
    }
    await batchInsert('class_subjects', classSubjectRows);

    // -----------------------------------------------------------------------
    // 11. Timetable entries
    // -----------------------------------------------------------------------
    console.log('Creating timetable entries...');
    const timetableRows = [];
    for (const section of sections) {
      const cls = classes.find((c) => c.id === section.class_id);
      const applicable = coreSubjects.slice(0, Math.min(coreSubjects.length, 6));
      for (let day = 1; day <= 6; day += 1) {
        for (let period = 1; period <= 6; period += 1) {
          const subj = applicable[(day + period) % applicable.length];
          const teacher = rand(teachers);
          const startH = 8 + Math.floor((period - 1) / 2);
          const startM = ((period - 1) % 2) * 30;
          const endH = 8 + Math.floor(period / 2);
          const endM = (period % 2) * 30;
          timetableRows.push({
            school_id: schoolId,
            academic_year_id: academicYear.id,
            class_id: cls.id,
            section_id: section.id,
            subject_id: subj.id,
            teacher_id: teacher.id,
            day_of_week: day,
            period_number: period,
            start_time: formatTime(startH, startM),
            end_time: formatTime(endH, endM),
            room_number: section.room_number,
            type: 'regular',
            is_recurring: true,
          });
        }
      }
    }
    await batchInsert('timetable_entries', timetableRows);

    // -----------------------------------------------------------------------
    // 12. Exams & schedules & marks
    // -----------------------------------------------------------------------
    console.log('Creating exams and marks...');
    const examDefs = [
      { name: 'Unit Test 1', exam_type: 'unit_test', weightage: 20 },
      { name: 'Quarterly Exam', exam_type: 'quarterly', weightage: 25 },
      { name: 'Half Yearly Exam', exam_type: 'half_yearly', weightage: 25 },
      { name: 'Final Exam', exam_type: 'final', weightage: 30 },
    ];
    const exams = [];
    for (const def of examDefs) {
      const exam = await db.insert('exams', {
        school_id: schoolId,
        name: def.name,
        exam_type: def.exam_type,
        academic_year_id: academicYear.id,
        start_date: addDays(new Date('2024-08-01'), randInt(0, 30)),
        end_date: addDays(new Date('2024-08-15'), randInt(0, 30)),
        weightage: def.weightage,
        is_result_published: def.exam_type === 'final',
        status: 'completed',
        description: `${def.name} for academic year 2024-2025`,
      });
      exams.push(exam);
    }

    const examScheduleRows = [];
    for (const exam of exams) {
      for (const section of sections) {
        const cls = classes.find((c) => c.id === section.class_id);
        const applicable = coreSubjects.slice(0, Math.min(coreSubjects.length, 5));
        for (const subj of applicable) {
          examScheduleRows.push({
            school_id: schoolId,
            exam_id: exam.id,
            class_id: cls.id,
            section_id: section.id,
            subject_id: subj.id,
            exam_date: addDays(new Date(exam.start_date), randInt(0, 10)),
            start_time: '09:00',
            end_time: '12:00',
            max_marks: 100,
            pass_marks: 40,
            room_number: section.room_number,
            invigilator_id: rand(teachers).id,
            academic_year_id: academicYear.id,
          });
        }
      }
    }
    const examSchedules = await batchInsert('exam_schedules', examScheduleRows);

    const markRows = [];
    for (const schedule of examSchedules) {
      const sectionStudents = students.filter((s) => s.section_id === schedule.section_id);
      for (const student of sectionStudents.slice(0, Math.min(sectionStudents.length, 20))) {
        const pct = randInt(25, 100);
        markRows.push({
          school_id: schoolId,
          exam_schedule_id: schedule.id,
          exam_id: schedule.exam_id,
          student_id: student.id,
          class_id: schedule.class_id,
          section_id: schedule.section_id,
          subject_id: schedule.subject_id,
          marks_obtained: Math.round(pct),
          max_marks: 100,
          pass_marks: 40,
          grade: gradeFromPercentage(pct),
          percentage: pct,
          remarks: pct >= 40 ? '' : 'Needs improvement',
          status: 'published',
          entered_by_id: adminUser.id,
          verified_by_id: rand(teachers).user_id,
          academic_year_id: academicYear.id,
        });
      }
    }
    await batchInsert('marks', markRows);

    // -----------------------------------------------------------------------
    // 13. Fee invoices & payments
    // -----------------------------------------------------------------------
    console.log('Creating fee invoices and payments...');
    const invoiceRows = [];
    for (let i = 0; i < Math.min(students.length, 4); i += 1) {
      const student = students[i];
      const fs = feeStructures.find((f) => f.class_id === student.class_id && f.category === student.category);
      if (!fs) continue;
      invoiceRows.push({
        school_id: schoolId,
        invoice_no: uniqueCode('INV', i, 5),
        student_id: student.id,
        academic_year_id: academicYear.id,
        fee_structure_id: fs.id,
        total_amount: fs.total_amount,
        concession_amount: 0,
        fine_amount: 0,
        paid_amount: 0,
        balance_amount: fs.total_amount,
        status: 'pending',
        due_date: addDays(new Date('2024-05-01'), randInt(0, 30)),
        generated_by: adminUser.id,
        notes: 'Annual fee invoice',
      });
    }
    const invoices = await batchInsert('fee_invoices', invoiceRows);

    const invoiceItemRows = [];
    for (const inv of invoices) {
      const fs = feeStructures.find((f) => f.id === inv.fee_structure_id);
      const items = await db.findMany('fee_structure_items', { where: { fee_structure_id: fs.id } });
      for (const item of items) {
        invoiceItemRows.push({
          invoice_id: inv.id,
          fee_head_id: item.fee_head_id,
          amount: item.amount,
          due_date: inv.due_date,
        });
      }
    }
    await batchInsert('fee_invoice_items', invoiceItemRows);

    const paymentRows = [];
    for (let i = 0; i < Math.min(invoices.length, 4); i += 1) {
      const inv = invoices[i];
      const amount = Math.min(inv.total_amount, randInt(1000, Number(inv.total_amount)));
      paymentRows.push({
        school_id: schoolId,
        receipt_no: uniqueCode('RCP', i, 5),
        student_id: inv.student_id,
        invoice_id: inv.id,
        amount,
        payment_mode: rand(['cash', 'mpesa', 'card', 'bank_transfer']),
        paid_date: addDays(new Date('2024-05-05'), randInt(0, 60)),
        status: 'completed',
        collected_by: adminUser.id,
      });
    }
    const payments = await batchInsert('fee_payments', paymentRows);

    for (const pay of payments) {
      const inv = invoices.find((i) => i.id === pay.invoice_id);
      const newPaid = Number(inv.paid_amount) + Number(pay.amount);
      const newBalance = Number(inv.total_amount) - newPaid;
      let status = 'pending';
      if (newBalance <= 0) status = 'paid';
      else if (newPaid > 0) status = 'partial';
      await db.update('fee_invoices', {
        paid_amount: newPaid,
        balance_amount: newBalance,
        status,
      }, { id: inv.id });
    }

    // -----------------------------------------------------------------------
    // 14. Vehicles, routes, student transport
    // -----------------------------------------------------------------------
    console.log('Creating transport...');
    const vehicleRows = [];
    for (let i = 0; i < 4; i += 1) {
      vehicleRows.push({
        school_id: schoolId,
        vehicle_no: `VEH${pad(i + 1, 2)}`,
        type: rand(['bus', 'van']),
        capacity: randInt(20, 50),
        model: rand(['Isuzu', 'Toyota Coaster', 'Mitsubishi Rosa', 'Nissan Civilian']),
        manufacturer: rand(['Isuzu', 'Toyota', 'Mitsubishi', 'Nissan']),
        registration_no: `REG${pad(i + 1, 4)}`,
        driver_name: (() => { const { firstName, lastName } = kenyanName('male'); return `${firstName} ${lastName}`; })(),
        driver_phone: phoneKenya(),
        attendant_name: (() => { const { firstName, lastName } = kenyanName(); return `${firstName} ${lastName}`; })(),
        status: 'active',
      });
    }
    const vehicles = await batchInsert('vehicles', vehicleRows);

    const routeRows = [];
    const stopRows = [];
    for (let i = 0; i < vehicles.length; i += 1) {
      const route = await db.insert('transport_routes', {
        school_id: schoolId,
        name: `Route ${i + 1}`,
        route_code: `RT${pad(i + 1, 2)}`,
        vehicle_id: vehicles[i].id,
        driver: (() => { const { firstName, lastName } = kenyanName('male'); return `${firstName} ${lastName}`; })(),
        attendant: (() => { const { firstName, lastName } = kenyanName(); return `${firstName} ${lastName}`; })(),
        total_distance: randInt(5, 30),
        monthly_fee: randInt(500, 1500),
        status: 'active',
      });
      routeRows.push(route);
      for (let j = 0; j < randInt(4, 8); j += 1) {
        stopRows.push({
          school_id: schoolId,
          route_id: route.id,
          name: `Stop ${j + 1}`,
          sequence: j + 1,
          pickup_time: formatTime(7, j * 10),
          drop_time: formatTime(15, j * 10),
          fee: randInt(100, 500),
        });
      }
    }
    await batchInsert('transport_route_stops', stopRows);

    const transportRows = [];
    for (let i = 0; i < Math.min(students.length, 4); i += 1) {
      const route = rand(routeRows);
      transportRows.push({
        school_id: schoolId,
        student_id: students[i].id,
        route_id: route.id,
        pickup_stop: 'Stop 1',
        drop_stop: 'Stop 2',
        monthly_fee: route.monthly_fee,
        effective_from: new Date('2024-04-01'),
        status: 'active',
      });
    }
    await batchInsert('student_transports', transportRows);

    // -----------------------------------------------------------------------
    // 15. Hostels, rooms, allocations
    // -----------------------------------------------------------------------
    console.log('Creating hostels...');
    const hostelRows = [
      { name: 'Boys Hostel A', hostel_type: 'boys', address: faker.location.streetAddress() },
      { name: 'Girls Hostel A', hostel_type: 'girls', address: faker.location.streetAddress() },
    ];
    const hostels = [];
    for (const h of hostelRows) {
      const hostel = await db.insert('hostels', {
        school_id: schoolId,
        ...h,
        warden_id: rand(teachers).id,
        phone: phoneKenya(),
        total_rooms: 20,
        total_beds: 80,
        occupied_beds: 0,
        status: 'active',
      });
      hostels.push(hostel);
    }

    const roomRows = [];
    for (const hostel of hostels) {
      for (let floor = 1; floor <= 2; floor += 1) {
        for (let r = 1; r <= 10; r += 1) {
          roomRows.push({
            school_id: schoolId,
            hostel_id: hostel.id,
            room_no: `${floor * 100 + r}`,
            floor: String(floor),
            room_type: rand(['single', 'double', 'triple', 'dormitory']),
            capacity: randInt(2, 6),
            occupied: 0,
            monthly_fee: randInt(2000, 5000),
            facilities: ['WiFi', 'Fan'],
            status: 'available',
          });
        }
      }
    }
    const hostelRooms = await batchInsert('hostel_rooms', roomRows);

    const allocationRows = [];
    for (let i = 0; i < Math.min(students.length, 2); i += 1) {
      const room = rand(hostelRooms);
      allocationRows.push({
        school_id: schoolId,
        student_id: students[i].id,
        hostel_id: room.hostel_id,
        room_id: room.id,
        bed_no: String(randInt(1, room.capacity)),
        allocation_date: new Date('2024-04-01'),
        monthly_fee: room.monthly_fee,
        status: 'active',
      });
    }
    await batchInsert('hostel_allocations', allocationRows);

    // -----------------------------------------------------------------------
    // 16. Books, copies, issues, reservations
    // -----------------------------------------------------------------------
    console.log('Creating library...');
    const bookDefs = [
      { title: 'Primary Mathematics', author: 'Kenya Institute of Curriculum Development', isbn: '9781234567890', category: 'Textbook' },
      { title: 'Science for Schools', author: 'Kenya Institute of Curriculum Development', isbn: '9781234567891', category: 'Textbook' },
      { title: 'English Grammar and Composition', author: 'Various', isbn: '9781234567892', category: 'Reference' },
      { title: 'African Moral Stories', author: 'Various', isbn: '9781234567893', category: 'Story' },
    ];
    const books = await batchInsert('books', bookDefs.map((b, i) => ({
      ...b,
      school_id: schoolId,
      subject_id: rand(subjects).id,
      publisher: rand(['KICD', 'Longhorn', 'Oxford', 'Moran', 'Jomo Kenyatta Foundation']),
      publish_year: randInt(2015, 2023),
      total_copies: 2,
      available_copies: 1,
      status: 'active',
    })));

    const copyRows = [];
    for (const book of books) {
      for (let i = 0; i < book.total_copies; i += 1) {
        copyRows.push({
          school_id: schoolId,
          book_id: book.id,
          accession_no: `${book.isbn}-${i + 1}`,
          status: rand(['available', 'issued']),
          condition: rand(['new', 'good', 'fair']),
          purchase_date: addDays(new Date('2020-01-01'), randInt(0, 1000)),
          cost: randInt(100, 1000),
          location: 'Library Shelf A',
        });
      }
    }
    const bookCopies = await batchInsert('book_copies', copyRows);

    const issueRows = [];
    for (let i = 0; i < Math.min(bookCopies.length, 4); i += 1) {
      const copy = bookCopies[i];
      const student = rand(students);
      issueRows.push({
        school_id: schoolId,
        book_copy_id: copy.id,
        book_id: copy.book_id,
        student_id: student.id,
        issue_date: addDays(new Date('2024-08-01'), -randInt(0, 30)),
        due_date: addDays(new Date('2024-08-01'), randInt(5, 15)),
        status: 'issued',
        issued_by_id: adminUser.id,
      });
    }
    await batchInsert('book_issues', issueRows);

    const reservationRows = [];
    for (let i = 0; i < Math.min(books.length, 4); i += 1) {
      reservationRows.push({
        school_id: schoolId,
        book_id: books[i].id,
        student_id: rand(students).id,
        status: 'pending',
        queue_position: 1,
        reserved_at: new Date(),
      });
    }
    await batchInsert('book_reservations', reservationRows);

    // -----------------------------------------------------------------------
    // 17. Attendance
    // -----------------------------------------------------------------------
    console.log('Creating attendance...');
    const attendanceRows = [];
    const attendanceStart = new Date('2024-08-01');
    let schoolDays = 0;
    for (let d = 0; schoolDays < 5; d += 1) {
      const date = addDays(attendanceStart, d);
      if (date.getDay() === 0) continue; // skip Sundays
      schoolDays += 1;
      for (const student of students) {
        attendanceRows.push({
          school_id: schoolId,
          student_id: student.id,
          class_id: student.class_id,
          section_id: student.section_id,
          academic_year_id: academicYear.id,
          date: date.toISOString().split('T')[0],
          status: weightedStatus(),
          type: 'daily',
          marked_by_id: adminUser.id,
          is_manual: false,
        });
      }
    }
    await batchInsert('attendance', attendanceRows);

    // -----------------------------------------------------------------------
    // 18. Announcements, notifications, meetings
    // -----------------------------------------------------------------------
    console.log('Creating communications...');
    const announcementRows = [];
    for (let i = 0; i < 4; i += 1) {
      announcementRows.push({
        school_id: schoolId,
        title: `Announcement ${i + 1}`,
        content: faker.lorem.paragraph(),
        category: rand(['general', 'academic', 'exam', 'fee', 'event', 'holiday']),
        priority: rand(['low', 'normal', 'high', 'urgent']),
        target_audience: rand(['all', 'students', 'teachers', 'parents', 'staff']),
        posted_by_id: adminUser.id,
        publish_date: addDays(new Date('2024-08-01'), randInt(0, 60)),
        expiry_date: addDays(new Date('2024-12-01'), randInt(0, 60)),
        is_published: true,
      });
    }
    await batchInsert('announcements', announcementRows);

    const notificationRows = [];
    for (let i = 0; i < 4; i += 1) {
      const user = rand([...teacherUsers, ...guardianUsers, ...students.map((s) => ({ id: s.user_id }))]);
      notificationRows.push({
        school_id: schoolId,
        recipient_id: user.id,
        sender_id: adminUser.id,
        title: `Notification ${i + 1}`,
        message: faker.lorem.sentence(),
        type: rand(['announcement', 'fee', 'attendance', 'exam', 'general']),
        is_read: Math.random() > 0.5,
        is_push_sent: false,
      });
    }
    await batchInsert('notifications', notificationRows);

    const meetingRows = [];
    for (let i = 0; i < 4; i += 1) {
      const student = rand(students);
      const guardian = rand(guardians);
      meetingRows.push({
        school_id: schoolId,
        title: `Parent Teacher Meeting ${i + 1}`,
        description: faker.lorem.sentence(),
        type: rand(['in_person', 'online', 'phone']),
        scheduled_at: addDays(new Date('2024-09-01'), randInt(0, 60)),
        duration: 30,
        location: 'Conference Room',
        student_id: student.id,
        guardian_id: guardian.id,
        organizer_id: adminUser.id,
        status: 'scheduled',
      });
    }
    await batchInsert('meetings', meetingRows);

    // -----------------------------------------------------------------------
    // 19. Grading scale
    // -----------------------------------------------------------------------
    console.log('Creating grading scale...');
    const gradingScale = await db.insert('grading_scales', {
      school_id: schoolId,
      name: 'Default',
      is_default: true,
    });
    await batchInsert('grading_scale_grades', [
      { grading_scale_id: gradingScale.id, grade: 'A+', min_percent: 90, max_percent: 100, points: 10 },
      { grading_scale_id: gradingScale.id, grade: 'A', min_percent: 80, max_percent: 89.99, points: 9 },
      { grading_scale_id: gradingScale.id, grade: 'B+', min_percent: 70, max_percent: 79.99, points: 8 },
      { grading_scale_id: gradingScale.id, grade: 'B', min_percent: 60, max_percent: 69.99, points: 7 },
      { grading_scale_id: gradingScale.id, grade: 'C', min_percent: 50, max_percent: 59.99, points: 6 },
      { grading_scale_id: gradingScale.id, grade: 'D', min_percent: 40, max_percent: 49.99, points: 5 },
      { grading_scale_id: gradingScale.id, grade: 'F', min_percent: 0, max_percent: 39.99, points: 0 },
    ]);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Seed completed in ${elapsed}s.`);
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedDatabase();
}
