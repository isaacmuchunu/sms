require('dotenv').config({ path: './.env' });
const fs = require('fs');
const path = require('path');
const { connectDB } = require('../config/db');
const db = require('../db');

const splitStatements = (sqlText) => {
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let dollarTag = '';
  let inLineComment = false;
  let inBlockComment = false;
  let i = 0;

  while (i < sqlText.length) {
    const ch = sqlText[i];
    const nextTwo = sqlText[i] + sqlText[i + 1];

    // Block comment start
    if (!inDollarQuote && !inLineComment && !inBlockComment && nextTwo === '/*') {
      inBlockComment = true;
      current += nextTwo;
      i += 2;
      continue;
    }
    // Block comment end
    if (inBlockComment && nextTwo === '*/') {
      inBlockComment = false;
      current += nextTwo;
      i += 2;
      continue;
    }
    // Line comment start
    if (!inDollarQuote && !inLineComment && !inBlockComment && nextTwo === '--') {
      inLineComment = true;
      current += nextTwo;
      i += 2;
      continue;
    }
    // Line comment end
    if (inLineComment && ch === '\n') {
      inLineComment = false;
      current += ch;
      i += 1;
      continue;
    }
    // Dollar-quoted block start
    if (!inLineComment && !inBlockComment && !inDollarQuote && nextTwo === '$$') {
      inDollarQuote = true;
      dollarTag = '$$';
      current += nextTwo;
      i += 2;
      continue;
    }
    // Dollar-quoted block end
    if (inDollarQuote && nextTwo === dollarTag) {
      inDollarQuote = false;
      dollarTag = '';
      current += nextTwo;
      i += 2;
      continue;
    }
    // Statement terminator
    if (!inDollarQuote && !inLineComment && !inBlockComment && ch === ';') {
      const trimmed = current.trim();
      if (trimmed) {
        statements.push(trimmed);
      }
      current = '';
      i += 1;
      continue;
    }
    current += ch;
    i += 1;
  }

  const trimmed = current.trim();
  if (trimmed) {
    statements.push(trimmed);
  }

  return statements;
};

const runMigrations = async () => {
  try {
    await connectDB();
    const migrationsDir = path.join(__dirname, 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      console.log('No migrations directory found. Skipping.');
      process.exit(0);
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found. Skipping.');
      process.exit(0);
    }

    // Ensure migration tracking table exists.
    await db.raw(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    for (const file of files) {
      const alreadyApplied = await db.raw(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [file]
      );
      if (alreadyApplied && alreadyApplied.length > 0) {
        console.log(`Skipping already applied migration: ${file}`);
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const statements = splitStatements(content);
      console.log(`Running migration: ${file} (${statements.length} statement(s))`);

      await db.transaction(async (tdb) => {
        for (const statement of statements) {
          await tdb.raw(`${statement};`);
        }
        await tdb.insert('schema_migrations', { filename: file }, ['filename', 'applied_at']);
      });

      console.log(`Completed: ${file}`);
    }

    console.log('All migrations completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigrations();
