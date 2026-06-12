require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');

// Models
const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Subject = require('../models/Subject');

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    console.log('Clearing existing collections...');
    await User.deleteMany({});
    await Student.deleteMany({});
    await Teacher.deleteMany({});
    await Class.deleteMany({});
    await Subject.deleteMany({});
    console.log('Collections cleared.');

    // ── Create Admin User ──────────────────────────────────
    console.log('Creating admin user...');
    const hashedPassword = await bcrypt.hash('password123', 12);
    const adminUser = await User.create({
      name: 'School Administrator',
      email: 'admin@school.com',
      password: hashedPassword,
      role: 'admin',
      phone: '+91-9876543210',
      address: '123 School Road, Education City',
      status: 'active',
    });
    console.log(`Admin created: ${adminUser.email} / password123`);

    // ── Create Teacher Users ──────────────────────────────────
    console.log('Creating teacher users...');
    const teacherUsersData = [
      { name: 'Dr. Rajesh Sharma', email: 'r.sharma@school.com', role: 'teacher' },
      { name: 'Mrs. Priya Patel', email: 'p.patel@school.com', role: 'teacher' },
      { name: 'Mr. Arun Kumar', email: 'a.kumar@school.com', role: 'teacher' },
    ];

    const teacherUsers = [];
    for (const tData of teacherUsersData) {
      const tUser = await User.create({
        ...tData,
        password: hashedPassword,
        phone: '+91-98' + Math.floor(10000000 + Math.random() * 90000000),
        status: 'active',
      });
      teacherUsers.push(tUser);
    }
    console.log(`${teacherUsers.length} teacher users created.`);

    // ── Create Subjects ──────────────────────────────────
    console.log('Creating subjects...');
    const subjectsData = [
      { name: 'Mathematics', code: 'MATH', type: 'core', credits: 5, passingMarks: 35, maxMarks: 100 },
      { name: 'Science', code: 'SCI', type: 'core', credits: 5, passingMarks: 35, maxMarks: 100 },
      { name: 'English', code: 'ENG', type: 'core', credits: 4, passingMarks: 35, maxMarks: 100 },
      { name: 'Social Studies', code: 'SST', type: 'core', credits: 4, passingMarks: 35, maxMarks: 100 },
      { name: 'Hindi', code: 'HIN', type: 'core', credits: 3, passingMarks: 35, maxMarks: 100 },
      { name: 'Computer Science', code: 'CS', type: 'elective', credits: 3, passingMarks: 35, maxMarks: 100 },
      { name: 'Physics', code: 'PHY', type: 'core', credits: 4, passingMarks: 35, maxMarks: 100 },
      { name: 'Chemistry', code: 'CHEM', type: 'core', credits: 4, passingMarks: 35, maxMarks: 100 },
      { name: 'Biology', code: 'BIO', type: 'core', credits: 4, passingMarks: 35, maxMarks: 100 },
      { name: 'Physical Education', code: 'PE', type: 'co_curricular', credits: 1, passingMarks: 35, maxMarks: 100 },
    ];

    const subjects = [];
    for (const sData of subjectsData) {
      const subject = await Subject.create(sData);
      subjects.push(subject);
    }
    console.log(`${subjects.length} subjects created.`);

    // ── Create Classes (Grade 1-12, Section A) ──────────────────────────────────
    console.log('Creating classes...');
    const academicYear = '2024-2025';
    const classesData = [];
    for (let i = 1; i <= 12; i++) {
      classesData.push({
        name: `Grade ${i}`,
        section: 'A',
        academicYear,
        capacity: 40,
        roomNumber: `R-${100 + i}`,
        studentsCount: 0,
        status: 'active',
      });
    }

    const classes = [];
    for (const cData of classesData) {
      const cls = await Class.create(cData);
      classes.push(cls);
    }
    console.log(`${classes.length} classes created.`);

    // ── Assign class teachers to first 3 classes ──────────────────────────────────
    console.log('Assigning class teachers...');
    for (let i = 0; i < Math.min(3, classes.length); i++) {
      classes[i].classTeacher = teacherUsers[i]._id;
      await classes[i].save();
    }

    // ── Create Teachers ──────────────────────────────────
    console.log('Creating teachers...');
    const teachersData = [
      {
        employeeId: 'TCH-001',
        user: teacherUsers[0]._id,
        qualifications: [
          { degree: 'Ph.D. in Mathematics', institution: 'IIT Delhi', year: 2015, percentage: 85 },
          { degree: 'M.Sc. Mathematics', institution: 'Delhi University', year: 2010, percentage: 82 },
        ],
        experience: [
          { school: 'DPS RK Puram', designation: 'Senior Math Teacher', from: new Date('2016-06-01'), to: null },
        ],
        joiningDate: new Date('2022-04-01'),
        designation: 'senior_teacher',
        department: 'mathematics',
        salary: { base: 50000, da: 10000, hra: 8000, ta: 3000 },
        contractType: 'permanent',
        status: 'active',
      },
      {
        employeeId: 'TCH-002',
        user: teacherUsers[1]._id,
        qualifications: [
          { degree: 'M.Sc. Physics', institution: 'Mumbai University', year: 2012, percentage: 80 },
          { degree: 'B.Ed.', institution: 'SNDT University', year: 2013, percentage: 78 },
        ],
        experience: [
          { school: 'St. Xavier School', designation: 'Science Teacher', from: new Date('2014-06-01'), to: new Date('2021-03-31') },
          { school: 'Ryan International', designation: 'HOD Science', from: new Date('2021-04-01'), to: null },
        ],
        joiningDate: new Date('2022-04-01'),
        designation: 'hod',
        department: 'science',
        salary: { base: 60000, da: 12000, hra: 10000, ta: 4000 },
        contractType: 'permanent',
        status: 'active',
      },
      {
        employeeId: 'TCH-003',
        user: teacherUsers[2]._id,
        qualifications: [
          { degree: 'M.A. English Literature', institution: 'JNU', year: 2014, percentage: 83 },
          { degree: 'B.Ed.', institution: 'Delhi University', year: 2015, percentage: 80 },
        ],
        experience: [
          { school: 'Modern School', designation: 'English Teacher', from: new Date('2016-06-01'), to: null },
        ],
        joiningDate: new Date('2023-04-01'),
        designation: 'teacher',
        department: 'english',
        salary: { base: 45000, da: 8000, hra: 6000, ta: 2000 },
        contractType: 'permanent',
        status: 'active',
      },
    ];

    const teachers = [];
    for (const tData of teachersData) {
      const teacher = await Teacher.create(tData);
      teachers.push(teacher);
    }
    console.log(`${teachers.length} teachers created.`);

    // ── Create Students ──────────────────────────────────
    console.log('Creating students...');
    const firstNames = [
      'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Ayaan', 'Krishna',
      'Ishaan', 'Aryan', 'Ananya', 'Diya', 'Sara', 'Myra', 'Priya', 'Riya',
      'Kavya', 'Sneha', 'Tanya', 'Neha',
    ];
    const lastNames = [
      'Sharma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Verma', 'Reddy', 'Nair',
      'Kapoor', 'Mehta', 'Iyer', 'Joshi', 'Desai', 'Malhotra',
    ];
    const cities = ['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune'];

    const students = [];
    for (let i = 0; i < 20; i++) {
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[i % lastNames.length];
      const gradeIndex = i % 12; // Distribute across Grades 1-12
      const yearOfBirth = 2005 + Math.floor(Math.random() * 10);
      const monthOfBirth = Math.floor(Math.random() * 12);
      const dayOfBirth = Math.floor(Math.random() * 28) + 1;

      const student = await Student.create({
        admissionNo: `ADM-${2024}${String(i + 1).padStart(4, '0')}`,
        rollNo: String(i + 1),
        firstName,
        lastName,
        dob: new Date(yearOfBirth, monthOfBirth, dayOfBirth),
        gender: i % 2 === 0 ? 'male' : 'female',
        bloodGroup: ['A+', 'B+', 'O+', 'AB+', 'A-', 'O-'][i % 6],
        religion: ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain'][i % 5],
        category: ['general', 'sc', 'st', 'obc'][i % 4],
        currentClass: classes[gradeIndex]._id,
        currentSection: 'A',
        academicYear,
        fatherName: `Mr. ${lastNames[(i + 1) % lastNames.length]}`,
        fatherPhone: `+91-98${Math.floor(10000000 + Math.random() * 90000000)}`,
        fatherOccupation: ['Engineer', 'Doctor', 'Businessman', 'Teacher', 'Government Servant'][i % 5],
        motherName: `Mrs. ${lastNames[(i + 2) % lastNames.length]}`,
        motherPhone: `+91-98${Math.floor(10000000 + Math.random() * 90000000)}`,
        motherOccupation: ['Homemaker', 'Teacher', 'Doctor', 'Engineer', 'Businesswoman'][i % 5],
        guardianName: '',
        guardianPhone: '',
        guardianRelation: '',
        guardianOccupation: '',
        address: `${Math.floor(Math.random() * 999) + 1}, ${['Main Road', 'Park Street', 'School Lane', 'Gandhi Nagar'][i % 4]}`,
        city: cities[i % cities.length],
        state: ['Delhi', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Telangana', 'West Bengal'][i % 6],
        pincode: String(Math.floor(100000 + Math.random() * 900000)),
        previousSchool: i % 3 === 0 ? '' : `ABC School ${cities[(i + 1) % cities.length]}`,
        previousClassPercentage: Math.floor(60 + Math.random() * 40),
        status: 'active',
      });
      students.push(student);
    }
    console.log(`${students.length} students created.`);

    // Update class student counts
    console.log('Updating class student counts...');
    for (let i = 0; i < 20; i++) {
      const gradeIndex = i % 12;
      await Class.findByIdAndUpdate(classes[gradeIndex]._id, {
        $inc: { studentsCount: 1 },
      });
    }

    console.log('\n✅ Database seeded successfully!');
    console.log('\n--- Login Credentials ---');
    console.log('Admin: admin@school.com / password123');
    console.log('------------------------\n');

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run seed if executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
