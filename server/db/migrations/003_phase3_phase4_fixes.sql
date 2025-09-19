-- Phase 3/4 hardening: indexes, school-scoped unique constraints, and duplicate cleanup.

-- ------------------------------------------------------------
-- 1. Duplicate cleanup for school-scoped unique indexes
--    Keep the oldest id (smallest UUID) for each duplicate group.
-- ------------------------------------------------------------

-- teachers.employee_id must be scoped by school
DELETE FROM teachers a USING teachers b
WHERE a.id > b.id
  AND a.school_id = b.school_id
  AND a.employee_id = b.employee_id
  AND a.employee_id IS NOT NULL AND a.employee_id <> '';

-- transport_routes.route_code scoped by school
DELETE FROM transport_routes a USING transport_routes b
WHERE a.id > b.id
  AND a.school_id = b.school_id
  AND a.route_code = b.route_code
  AND a.route_code IS NOT NULL AND a.route_code <> '';

-- fee_heads.code scoped by school
DELETE FROM fee_heads a USING fee_heads b
WHERE a.id > b.id
  AND a.school_id = b.school_id
  AND a.code = b.code
  AND a.code IS NOT NULL AND a.code <> '';

-- subjects.code scoped by school
DELETE FROM subjects a USING subjects b
WHERE a.id > b.id
  AND a.school_id = b.school_id
  AND a.code = b.code
  AND a.code IS NOT NULL AND a.code <> '';

-- vehicles.vehicle_no scoped by school
DELETE FROM vehicles a USING vehicles b
WHERE a.id > b.id
  AND a.school_id = b.school_id
  AND a.vehicle_no = b.vehicle_no
  AND a.vehicle_no IS NOT NULL AND a.vehicle_no <> '';

-- vehicles.registration_no scoped by school
DELETE FROM vehicles a USING vehicles b
WHERE a.id > b.id
  AND a.school_id = b.school_id
  AND a.registration_no = b.registration_no
  AND a.registration_no IS NOT NULL AND a.registration_no <> '';

-- books.isbn scoped by school
DELETE FROM books a USING books b
WHERE a.id > b.id
  AND a.school_id = b.school_id
  AND a.isbn = b.isbn
  AND a.isbn IS NOT NULL AND a.isbn <> '';

-- fee_invoices.invoice_no scoped by school
DELETE FROM fee_invoices a USING fee_invoices b
WHERE a.id > b.id
  AND a.school_id = b.school_id
  AND a.invoice_no = b.invoice_no
  AND a.invoice_no IS NOT NULL AND a.invoice_no <> '';

-- fee_payments.receipt_no scoped by school
DELETE FROM fee_payments a USING fee_payments b
WHERE a.id > b.id
  AND a.school_id = b.school_id
  AND a.receipt_no = b.receipt_no
  AND a.receipt_no IS NOT NULL AND a.receipt_no <> '';

-- students.admission_no scoped by school
DELETE FROM students a USING students b
WHERE a.id > b.id
  AND a.school_id = b.school_id
  AND a.admission_no = b.admission_no
  AND a.admission_no IS NOT NULL AND a.admission_no <> '';

-- academic_years.name scoped by school
DELETE FROM academic_years a USING academic_years b
WHERE a.id > b.id
  AND a.school_id = b.school_id
  AND a.name = b.name
  AND a.name IS NOT NULL AND a.name <> '';

-- hostels.name scoped by school
DELETE FROM hostels a USING hostels b
WHERE a.id > b.id
  AND a.school_id = b.school_id
  AND a.name = b.name
  AND a.name IS NOT NULL AND a.name <> '';

-- grading_scales single default per school
DELETE FROM grading_scales a USING grading_scales b
WHERE a.id > b.id
  AND a.school_id = b.school_id
  AND a.is_default = true AND b.is_default = true;

-- ------------------------------------------------------------
-- 2. Performance indexes
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_students_admission_no ON students(school_id, admission_no);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_users_school_role ON users(school_id, role);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_due_date ON fee_invoices(school_id, due_date);
CREATE INDEX IF NOT EXISTS idx_marks_student_id ON marks(student_id);
CREATE INDEX IF NOT EXISTS idx_marks_exam_id ON marks(exam_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(school_id, date);

-- ------------------------------------------------------------
-- 3. School-scoped unique indexes
-- ------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_school_employee_id ON teachers(school_id, employee_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_routes_school_code ON transport_routes(school_id, route_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fee_heads_school_code ON fee_heads(school_id, code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_school_code ON subjects(school_id, code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_school_vehicle_no ON vehicles(school_id, vehicle_no);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_school_registration_no ON vehicles(school_id, registration_no);
CREATE UNIQUE INDEX IF NOT EXISTS idx_books_school_isbn ON books(school_id, isbn);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fee_invoices_school_invoice_no ON fee_invoices(school_id, invoice_no);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fee_payments_school_receipt_no ON fee_payments(school_id, receipt_no);
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_school_admission_no ON students(school_id, admission_no);
CREATE UNIQUE INDEX IF NOT EXISTS idx_academic_years_school_name ON academic_years(school_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hostels_school_name ON hostels(school_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_grading_scales_one_default ON grading_scales(school_id) WHERE is_default = true;
