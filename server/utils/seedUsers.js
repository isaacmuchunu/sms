require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB } = require('../config/db');
const db = require('../db');

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD;

if (!DEFAULT_PASSWORD) {
  throw new Error('SEED_DEFAULT_PASSWORD environment variable is required');
}

const userConfigs = [
  { role: 'teacher', count: 4, namePrefix: 'Teacher' },
  { role: 'student', count: 4, namePrefix: 'Student' },
  { role: 'parent', count: 4, namePrefix: 'Parent' },
  { role: 'librarian', count: 4, namePrefix: 'Librarian' },
  { role: 'staff', count: 4, namePrefix: 'Staff' },
];

const hashPassword = async (password) => bcrypt.hash(password, 12);

const generateUsers = async (defaultSchoolId) => {
  const users = [
    {
      name: 'Isaac Muchunu',
      email: 'isaacmuchunu@gmail.com',
      password: await hashPassword(DEFAULT_PASSWORD),
      role: 'super_admin',
      status: 'active',
    },
  ];
  for (const { role, count, namePrefix } of userConfigs) {
    for (let i = 1; i <= count; i += 1) {
      const suffix = String(i).padStart(2, '0');
      users.push({
        name: `${namePrefix} ${suffix}`,
        email: `${role}.${suffix}@school.com`,
        password: await hashPassword(DEFAULT_PASSWORD),
        role,
        school_id: defaultSchoolId,
        status: 'active',
      });
    }
  }
  return users;
};

const explainConnectionError = (err) => {
  const message = err?.message || '';
  if (message.includes('ECONNREFUSED') || message.includes('ENOTFOUND') || message.includes('connection')) {
    return [
      'Unable to reach NeonDB before seeding.',
      'Check that DATABASE_URL is correct and reachable from this machine.',
    ].join('\n');
  }
  return `Failed to seed users: ${message}`;
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

const seedUsers = async () => {
  validateSeedEnv();
  await connectDB();
  await db.raw('SELECT 1');

  // Find or create a default school for seeded users
  let [defaultSchool] = await db.raw('SELECT * FROM schools ORDER BY created_at ASC LIMIT 1');
  if (!defaultSchool) {
    defaultSchool = await db.insert('schools', {
      name: 'Hillcrest Academy',
      address: 'Nairobi, Kenya',
      phone: '+254-700-000-000',
      email: 'info@hillcrestacademy.sc.ke',
      website: 'https://hillcrestacademy.sc.ke',
      affiliation_no: 'KICD/KE02345',
      board: 'CBC',
      established_year: 1995,
      status: 'active',
    });
  }

  const users = await generateUsers(defaultSchool.id);
  let created = 0;
  let skipped = 0;

  for (const userData of users) {
    const exists = await db.findOne('users', { email: userData.email });
    if (exists) {
      skipped += 1;
      continue;
    }
    await db.insert('users', userData);
    created += 1;
  }

  console.log(`Users seeded: ${created} created, ${skipped} skipped (already existed).`);

  process.exit(0);
};

if (require.main === module) {
  seedUsers().catch((err) => {
    console.error(explainConnectionError(err));
    process.exitCode = 1;
  }).finally(() => {
    process.exit(process.exitCode || 0);
  });
}
