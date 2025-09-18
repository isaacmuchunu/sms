require('dotenv').config({ path: './.env' });
const fs = require('fs');
const path = require('path');
const { connectDB, getSql } = require('../config/db');

const runMigration = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('Destructive database reset is blocked when NODE_ENV=production.');
    process.exit(1);
  }
  if (process.env.ALLOW_DESTRUCTIVE_DB_RESET !== 'true') {
    console.error('Destructive database reset requires ALLOW_DESTRUCTIVE_DB_RESET=true.');
    process.exit(1);
  }

  try {
    await connectDB();
    const sql = getSql();
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('Running NeonDB schema migration...');

    // Drop existing tables so the migration is repeatable.
    console.log('Dropping existing tables...');
    await sql(`
      DROP TABLE IF EXISTS
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
        hostel_visitors,
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
        module_requests,
        schools,
        grading_scale_grades,
        grading_scales
      CASCADE
    `);

    // Split SQL into individual statements, respecting dollar-quoted blocks ($$...$$).
    const statements = [];
    let current = '';
    let inDollarQuote = false;
    let dollarTag = '';
    let i = 0;
    while (i < schema.length) {
      const ch = schema[i];
      const nextTwo = schema[i] + schema[i + 1];
      if (!inDollarQuote && nextTwo === '$$') {
        inDollarQuote = true;
        dollarTag = '$$';
        current += nextTwo;
        i += 2;
        continue;
      }
      if (inDollarQuote && nextTwo === dollarTag) {
        inDollarQuote = false;
        dollarTag = '';
        current += nextTwo;
        i += 2;
        continue;
      }
      if (!inDollarQuote && ch === ';') {
        const trimmed = current.trim();
        // Strip leading comment lines so a statement preceded by comments isn't discarded.
        const withoutLeadingComments = trimmed.replace(/^(\s*--[^\n]*\n)+/, '').trim();
        if (withoutLeadingComments) {
          statements.push(withoutLeadingComments);
        }
        current = '';
        i += 1;
        continue;
      }
      current += ch;
      i += 1;
    }
    // Append any remaining content.
    const trimmed = current.trim();
    const withoutLeadingComments = trimmed.replace(/^(\s*--[^\n]*\n)+/, '').trim();
    if (withoutLeadingComments) {
      statements.push(withoutLeadingComments);
    }

    for (const statement of statements) {
      try {
        await sql(statement + ';');
      } catch (err) {
        console.error(`Migration statement failed:\n${statement}\nError: ${err.message}`);
        throw err;
      }
    }

    console.log('Schema migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
