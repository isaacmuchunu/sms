require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

// Models
const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const { FeeHead, FeeStructure, FeePayment } = require('../models/Fee');
const { Book, BookTransaction } = require('../models/Library');
const { Vehicle, Route } = require('../models/Transport');
const { Room, VisitorLog } = require('../models/Hostel');

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
    await FeePayment.deleteMany({});
    await FeeStructure.deleteMany({});
    await FeeHead.deleteMany({});
    await BookTransaction.deleteMany({});
    await Book.deleteMany({});
    await Route.deleteMany({});
    await Vehicle.deleteMany({});
    await VisitorLog.deleteMany({});
    await Room.deleteMany({});
    console.log('Collections cleared.');

    // ── Create Admin User ──────────────────────────────────
    console.log('Creating admin user...');
    const seedPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
    const adminUser = await User.create({
      name: 'School Administrator',
      email: 'admin@school.com',
      password: seedPassword,
      role: 'admin',
      phone: '+91-9876543210',
      address: '123 School Road, Education City',
      status: 'active',
    });
    console.log(`Admin created: ${adminUser.email} / ${seedPassword}`);

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
        password: seedPassword,
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
    // ── Create Teachers ──────────────────────────────────
    console.log('Creating teachers...');
    const teachersData = [
      {
        employeeId: 'TCH-001',
        user: teacherUsers[0]._id,
        firstName: 'Rajesh',
        lastName: 'Sharma',
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
        firstName: 'Priya',
        lastName: 'Patel',
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
        firstName: 'Arun',
        lastName: 'Kumar',
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

    console.log('Assigning class teachers...');
    for (let i = 0; i < Math.min(3, classes.length); i++) {
      classes[i].classTeacher = teachers[i]._id;
      await classes[i].save();
    }

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

    console.log('Creating fee heads and structures...');
    const feeHeads = await FeeHead.insertMany([
      {
        name: 'Tuition Fee',
        description: 'Annual tuition fee',
        frequency: 'yearly',
        category: 'tuition',
        status: 'active',
      },
      {
        name: 'Examination Fee',
        description: 'Assessment and report card fee',
        frequency: 'yearly',
        category: 'exam',
        status: 'active',
      },
      {
        name: 'Library Fee',
        description: 'Library access and maintenance fee',
        frequency: 'yearly',
        category: 'library',
        status: 'active',
      },
    ]);

    for (const cls of classes) {
      const gradeNumber = Number(cls.name.replace(/\D/g, '')) || 1;
      await FeeStructure.create({
        class: cls._id,
        academicYear,
        feeHeads: [
          {
            feeHead: feeHeads[0]._id,
            amount: 12000 + gradeNumber * 500,
            frequency: 'yearly',
            dueDate: new Date('2024-07-15'),
          },
          {
            feeHead: feeHeads[1]._id,
            amount: 1500,
            frequency: 'yearly',
            dueDate: new Date('2024-09-15'),
          },
          {
            feeHead: feeHeads[2]._id,
            amount: 800,
            frequency: 'yearly',
            dueDate: new Date('2024-07-15'),
          },
        ],
      });
    }
    console.log(`${feeHeads.length} fee heads and ${classes.length} fee structures created.`);

    console.log('Creating library books...');
    const books = await Book.insertMany([
      {
        title: 'Mathematics in Action',
        author: 'R. K. Sharma',
        isbn: '9780000001001',
        publisher: 'Academic Press',
        category: 'Mathematics',
        publicationYear: 2021,
        language: 'English',
        pages: 320,
        price: 450,
        shelfLocation: 'A1',
        totalCopies: 10,
        availableCopies: 10,
        status: 'available',
      },
      {
        title: 'Foundations of Science',
        author: 'Priya Menon',
        isbn: '9780000001002',
        publisher: 'School House',
        category: 'Science',
        publicationYear: 2022,
        language: 'English',
        pages: 280,
        price: 390,
        shelfLocation: 'B2',
        totalCopies: 8,
        availableCopies: 8,
        status: 'available',
      },
      {
        title: 'English Reader',
        author: 'A. Kumar',
        isbn: '9780000001003',
        publisher: 'Learning Tree',
        category: 'English',
        publicationYear: 2020,
        language: 'English',
        pages: 240,
        price: 320,
        shelfLocation: 'C1',
        totalCopies: 12,
        availableCopies: 12,
        status: 'available',
      },
    ]);
    console.log(`${books.length} library books created.`);

    console.log('Creating transport routes...');
    const vehicles = await Vehicle.insertMany([
      {
        registrationNumber: 'DL01AB1234',
        type: 'bus',
        model: 'School Bus 40',
        manufacturer: 'Tata',
        yearOfManufacture: 2021,
        capacity: 40,
        driverName: 'Mahesh Yadav',
        driverPhone: '+91-9812345678',
        status: 'active',
      },
      {
        registrationNumber: 'DL01AB5678',
        type: 'van',
        model: 'Traveller',
        manufacturer: 'Force',
        yearOfManufacture: 2022,
        capacity: 18,
        driverName: 'Sanjay Rao',
        driverPhone: '+91-9812345688',
        status: 'active',
      },
    ]);

    const routes = await Route.insertMany([
      {
        routeName: 'North Campus Route',
        routeCode: 'RT-NORTH',
        vehicle: vehicles[0]._id,
        startPoint: 'Model Town',
        endPoint: 'School Main Gate',
        totalDistance: 14,
        estimatedTime: '45 minutes',
        fare: 1800,
        students: students.slice(0, 6).map((student) => student._id),
        stops: [
          { name: 'Model Town', sequence: 1, distanceKm: 0, arrivalTime: '07:10' },
          { name: 'Civil Lines', sequence: 2, distanceKm: 6, arrivalTime: '07:25' },
          { name: 'School Main Gate', sequence: 3, distanceKm: 14, arrivalTime: '07:55' },
        ],
        status: 'active',
      },
      {
        routeName: 'East City Route',
        routeCode: 'RT-EAST',
        vehicle: vehicles[1]._id,
        startPoint: 'Preet Vihar',
        endPoint: 'School Main Gate',
        totalDistance: 11,
        estimatedTime: '35 minutes',
        fare: 1500,
        students: students.slice(6, 10).map((student) => student._id),
        stops: [
          { name: 'Preet Vihar', sequence: 1, distanceKm: 0, arrivalTime: '07:20' },
          { name: 'Laxmi Nagar', sequence: 2, distanceKm: 4, arrivalTime: '07:35' },
          { name: 'School Main Gate', sequence: 3, distanceKm: 11, arrivalTime: '07:55' },
        ],
        status: 'active',
      },
    ]);

    for (const student of students.slice(0, 6)) {
      student.transportRoute = routes[0]._id;
      student.transportStop = 'Civil Lines';
      await student.save();
    }
    for (const student of students.slice(6, 10)) {
      student.transportRoute = routes[1]._id;
      student.transportStop = 'Laxmi Nagar';
      await student.save();
    }
    console.log(`${vehicles.length} vehicles and ${routes.length} routes created.`);

    console.log('Creating hostel rooms...');
    const rooms = await Room.insertMany([
      {
        roomNumber: 'H-101',
        block: 'A',
        floor: 1,
        type: 'triple',
        capacity: 3,
        occupants: students.slice(0, 3).map((student) => student._id),
        monthlyRent: 6000,
        facilities: ['Bed', 'Study Table', 'Wardrobe'],
        status: 'full',
      },
      {
        roomNumber: 'H-102',
        block: 'A',
        floor: 1,
        type: 'triple',
        capacity: 3,
        occupants: students.slice(3, 5).map((student) => student._id),
        monthlyRent: 6000,
        facilities: ['Bed', 'Study Table', 'Wardrobe'],
        status: 'partially_occupied',
      },
      {
        roomNumber: 'H-201',
        block: 'B',
        floor: 2,
        type: 'double',
        capacity: 2,
        occupants: [],
        monthlyRent: 7500,
        facilities: ['Bed', 'Study Table', 'Attached Bath'],
        status: 'available',
      },
    ]);

    for (const student of students.slice(0, 3)) {
      student.hostelRoom = rooms[0]._id;
      student.hostelAllocationDate = new Date('2024-06-15');
      await student.save();
    }
    for (const student of students.slice(3, 5)) {
      student.hostelRoom = rooms[1]._id;
      student.hostelAllocationDate = new Date('2024-06-15');
      await student.save();
    }
    console.log(`${rooms.length} hostel rooms created.`);

    console.log('\n✅ Database seeded successfully!');
    console.log('\n--- Login Credentials ---');
    console.log(`Admin: admin@school.com / ${seedPassword}`);
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
