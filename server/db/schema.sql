-- ============================================================
-- School Management System - NeonDB (PostgreSQL) schema
-- Replaces the previous MongoDB/Mongoose collections.
-- ============================================================

-- ------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. Core / no-dependency tables
-- ============================================================

CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  website TEXT DEFAULT '',
  affiliation_no TEXT DEFAULT '',
  board TEXT DEFAULT '',
  established_year INT CHECK (established_year BETWEEN 1800 AND 2100),
  principal_name TEXT DEFAULT '',
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  modules JSONB DEFAULT '{"transport": false, "hostel": false, "library": true}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER trg_schools_updated_at BEFORE UPDATE ON schools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE module_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module VARCHAR(50) NOT NULL CHECK (module IN ('transport', 'hostel', 'library')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT DEFAULT '',
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_module_requests_school_id ON module_requests(school_id);
CREATE INDEX idx_module_requests_status ON module_requests(status);
CREATE INDEX idx_module_requests_school_module_status ON module_requests(school_id, module, status);
CREATE TRIGGER trg_module_requests_updated_at BEFORE UPDATE ON module_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'student'
    CHECK (role IN ('super_admin', 'admin', 'teacher', 'student', 'parent', 'staff', 'librarian', 'accountant')),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  avatar VARCHAR(500) DEFAULT '',
  phone VARCHAR(50) DEFAULT '',
  address VARCHAR(500) DEFAULT '',
  refresh_token VARCHAR(500) DEFAULT '',
  password_reset_token VARCHAR(500) DEFAULT '',
  password_reset_expires TIMESTAMP DEFAULT NULL,
  password_changed_at TIMESTAMP DEFAULT NULL,
  last_login TIMESTAMP DEFAULT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'pending')),
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_users_role_status ON users(role, status);
CREATE INDEX idx_users_school_id ON users(school_id);
CREATE INDEX idx_users_school_role ON users(school_id, role);
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  promotion_criteria JSONB DEFAULT '{"minAggregatePercentage": 40, "maxFailingSubjects": 2, "minAttendancePercentage": 75}',
  late_threshold_minutes INT DEFAULT 10,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_academic_years_is_current ON academic_years(is_current);
CREATE INDEX idx_academic_years_status ON academic_years(status);
CREATE INDEX idx_academic_years_school_id ON academic_years(school_id);
CREATE UNIQUE INDEX idx_academic_years_school_name ON academic_years(school_id, name);
CREATE TRIGGER trg_academic_years_updated_at BEFORE UPDATE ON academic_years
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  employee_id VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  gender VARCHAR(20) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  dob DATE NOT NULL,
  joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
  phone VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  address VARCHAR(255) DEFAULT '',
  qualification VARCHAR(255) DEFAULT '',
  specialization VARCHAR(255) DEFAULT '',
  designation VARCHAR(255) DEFAULT 'Teacher',
  department VARCHAR(255) DEFAULT '',
  salary NUMERIC(12,2) DEFAULT 0 CHECK (salary >= 0),
  employment_type VARCHAR(20) DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'resigned')),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_teachers_status ON teachers(status);
CREATE INDEX idx_teachers_school_id ON teachers(school_id);
CREATE UNIQUE INDEX idx_teachers_school_employee_id ON teachers(school_id, employee_id);
CREATE TRIGGER trg_teachers_updated_at BEFORE UPDATE ON teachers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  numeric_name INT NOT NULL CHECK (numeric_name >= 1),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  monthly_fee NUMERIC(10,2) DEFAULT 0 CHECK (monthly_fee >= 0),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_classes_name_academic_year_id ON classes(name, academic_year_id);
CREATE INDEX idx_classes_academic_year_id ON classes(academic_year_id);
CREATE INDEX idx_classes_school_id ON classes(school_id);
CREATE TRIGGER trg_classes_updated_at BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE class_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  class_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  capacity INT NOT NULL DEFAULT 40 CHECK (capacity >= 1),
  room_number TEXT DEFAULT '',
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_class_sections_name_class_id ON class_sections(class_id, name);
CREATE INDEX idx_class_sections_class_teacher_id ON class_sections(class_teacher_id);
CREATE INDEX idx_class_sections_school_id ON class_sections(school_id);
CREATE TRIGGER trg_class_sections_updated_at BEFORE UPDATE ON class_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add reverse class-teacher columns after both teachers and class_sections exist.
ALTER TABLE teachers ADD COLUMN class_teacher_class_id UUID REFERENCES classes(id) ON DELETE SET NULL;
ALTER TABLE teachers ADD COLUMN class_teacher_section_id UUID REFERENCES class_sections(id) ON DELETE SET NULL;
CREATE INDEX idx_teachers_class_teacher ON teachers(class_teacher_class_id, class_teacher_section_id)
  WHERE class_teacher_class_id IS NOT NULL;

CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  type VARCHAR(50) DEFAULT 'core' CHECK (type IN ('core', 'elective', 'language', 'co_curricular', 'extra_curricular')),
  description TEXT DEFAULT '',
  credits INT DEFAULT 1 CHECK (credits >= 0),
  max_marks INT DEFAULT 100 CHECK (max_marks >= 0),
  pass_marks INT DEFAULT 40 CHECK (pass_marks >= 0),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_subjects_status ON subjects(status);
CREATE INDEX idx_subjects_school_id ON subjects(school_id);
CREATE UNIQUE INDEX idx_subjects_school_code ON subjects(school_id, code);
CREATE TRIGGER trg_subjects_updated_at BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE grading_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default',
  is_default BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_grading_scales_school_id ON grading_scales(school_id);
CREATE UNIQUE INDEX idx_grading_scales_one_default ON grading_scales(school_id) WHERE is_default = true;
CREATE TRIGGER trg_grading_scales_updated_at BEFORE UPDATE ON grading_scales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  vehicle_no TEXT NOT NULL UNIQUE,
  type VARCHAR(50) DEFAULT 'bus' CHECK (type IN ('bus', 'van', 'car', 'other')),
  capacity INT NOT NULL CHECK (capacity >= 1),
  model TEXT DEFAULT '',
  manufacturer TEXT DEFAULT '',
  registration_no TEXT NOT NULL UNIQUE,
  insurance_expiry TIMESTAMP DEFAULT NULL,
  pollution_expiry TIMESTAMP DEFAULT NULL,
  fitness_expiry TIMESTAMP DEFAULT NULL,
  driver_name TEXT DEFAULT '',
  driver_phone TEXT DEFAULT '',
  attendant_name TEXT DEFAULT '',
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'under_maintenance')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_school_id ON vehicles(school_id);
CREATE UNIQUE INDEX idx_vehicles_school_vehicle_no ON vehicles(school_id, vehicle_no);
CREATE UNIQUE INDEX idx_vehicles_school_registration_no ON vehicles(school_id, registration_no);
CREATE TRIGGER trg_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE hostels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hostel_type VARCHAR(50) NOT NULL CHECK (hostel_type IN ('boys', 'girls', 'staff', 'mixed')),
  address TEXT DEFAULT '',
  warden_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  phone TEXT DEFAULT '',
  total_rooms INT DEFAULT 0,
  total_beds INT DEFAULT 0,
  occupied_beds INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_hostels_status ON hostels(status);
CREATE INDEX idx_hostels_school_id ON hostels(school_id);
CREATE UNIQUE INDEX idx_hostels_school_name ON hostels(school_id, name);
CREATE TRIGGER trg_hostels_updated_at BEFORE UPDATE ON hostels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE hostel_visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  room_id UUID REFERENCES hostel_rooms(id) ON DELETE SET NULL,
  bed_id UUID REFERENCES hostel_room_beds(id) ON DELETE SET NULL,
  visitor_name VARCHAR(255) NOT NULL,
  visitor_phone VARCHAR(50) DEFAULT '',
  visitor_relation VARCHAR(100) DEFAULT '',
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  purpose TEXT DEFAULT '',
  visit_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  exit_date TIMESTAMP DEFAULT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_hostel_visitors_hostel_id ON hostel_visitors(hostel_id);
CREATE INDEX idx_hostel_visitors_school_id ON hostel_visitors(school_id);
CREATE INDEX idx_hostel_visitors_status ON hostel_visitors(status);
CREATE TRIGGER trg_hostel_visitors_updated_at BEFORE UPDATE ON hostel_visitors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. Tables depending on users / core
-- ============================================================

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(500) NOT NULL,
  ip VARCHAR(100) DEFAULT '',
  user_agent VARCHAR(500) DEFAULT '',
  device_info VARCHAR(500) DEFAULT '',
  last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token_hash ON sessions(refresh_token_hash);
CREATE INDEX idx_sessions_is_revoked ON sessions(is_revoked);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE TRIGGER trg_sessions_updated_at BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  relationship VARCHAR(50) NOT NULL CHECK (relationship IN ('father', 'mother', 'guardian')),
  phone TEXT NOT NULL,
  email TEXT,
  occupation TEXT DEFAULT '',
  address TEXT DEFAULT '',
  is_primary_contact BOOLEAN DEFAULT false,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_guardians_phone ON guardians(phone);
CREATE INDEX idx_guardians_user_id ON guardians(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_guardians_school_id ON guardians(school_id);
CREATE TRIGGER trg_guardians_updated_at BEFORE UPDATE ON guardians
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE fee_heads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  type VARCHAR(50) NOT NULL CHECK (type IN ('tuition', 'admission', 'examination', 'transport', 'hostel', 'library', 'activity', 'other')),
  frequency VARCHAR(50) DEFAULT 'monthly' CHECK (frequency IN ('monthly', 'quarterly', 'half_yearly', 'yearly', 'one_time')),
  refundable BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_fee_heads_status ON fee_heads(status);
CREATE INDEX idx_fee_heads_type ON fee_heads(type);
CREATE INDEX idx_fee_heads_school_id ON fee_heads(school_id);
CREATE UNIQUE INDEX idx_fee_heads_school_code ON fee_heads(school_id, code);
CREATE TRIGGER trg_fee_heads_updated_at BEFORE UPDATE ON fee_heads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. Tables depending on classes / sections / academic years
-- ============================================================

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  admission_no TEXT NOT NULL UNIQUE,
  roll_no TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender VARCHAR(20) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  dob DATE NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  pincode TEXT DEFAULT '',
  aadhar_number TEXT DEFAULT '',
  admission_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  section_id UUID NOT NULL REFERENCES class_sections(id) ON DELETE RESTRICT,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('general', 'scholarship', 'boarding', 'day', 'other')),
  religion TEXT DEFAULT '',
  caste TEXT DEFAULT '',
  blood_group VARCHAR(10) DEFAULT '' CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', '')),
  previous_school TEXT DEFAULT '',
  previous_class_percentage NUMERIC(5,2) DEFAULT NULL,
  father_name TEXT DEFAULT '',
  father_phone TEXT DEFAULT '',
  father_occupation TEXT DEFAULT '',
  mother_name TEXT DEFAULT '',
  mother_phone TEXT DEFAULT '',
  mother_occupation TEXT DEFAULT '',
  guardian_name TEXT DEFAULT '',
  guardian_phone TEXT DEFAULT '',
  guardian_relation TEXT DEFAULT '',
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'transferred', 'graduated', 'suspended')),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_students_class_section_year_rollno
  ON students(class_id, section_id, academic_year_id, roll_no);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_class_id ON students(class_id);
CREATE INDEX idx_students_section_id ON students(section_id);
CREATE INDEX idx_students_academic_year_id ON students(academic_year_id);
CREATE INDEX idx_students_name_search
  ON students USING GIN (to_tsvector('english', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')));
CREATE INDEX idx_students_school_id ON students(school_id);
CREATE INDEX idx_students_admission_no ON students(school_id, admission_no);
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE UNIQUE INDEX idx_students_school_admission_no ON students(school_id, admission_no);
CREATE TRIGGER trg_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE academic_year_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_academic_year_terms_academic_year_id ON academic_year_terms(academic_year_id);
CREATE TRIGGER trg_academic_year_terms_updated_at BEFORE UPDATE ON academic_year_terms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE subject_applicable_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (subject_id, class_id)
);
CREATE INDEX idx_subject_applicable_classes_class_id ON subject_applicable_classes(class_id);
CREATE INDEX idx_subject_applicable_classes_school_id ON subject_applicable_classes(school_id);
CREATE TRIGGER trg_subject_applicable_classes_updated_at BEFORE UPDATE ON subject_applicable_classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE teacher_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (teacher_id, subject_id)
);
CREATE INDEX idx_teacher_subjects_school_id ON teacher_subjects(school_id);
CREATE TRIGGER trg_teacher_subjects_updated_at BEFORE UPDATE ON teacher_subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE teacher_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  name TEXT,
  url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_teacher_documents_teacher_id ON teacher_documents(teacher_id);
CREATE INDEX idx_teacher_documents_school_id ON teacher_documents(school_id);
CREATE TRIGGER trg_teacher_documents_updated_at BEFORE UPDATE ON teacher_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE class_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  weekly_periods INT DEFAULT 5 CHECK (weekly_periods >= 1),
  is_elective BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_class_subjects_unique
  ON class_subjects(class_id, section_id, subject_id, academic_year_id);
CREATE INDEX idx_class_subjects_teacher_id ON class_subjects(teacher_id);
CREATE INDEX idx_class_subjects_school_id ON class_subjects(school_id);
CREATE TRIGGER trg_class_subjects_updated_at BEFORE UPDATE ON class_subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE timetable_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  period_number INT NOT NULL CHECK (period_number >= 1),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  room_number TEXT DEFAULT '',
  type VARCHAR(50) DEFAULT 'regular' CHECK (type IN ('regular', 'substitute', 'extra')),
  is_recurring BOOLEAN DEFAULT true,
  effective_date DATE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_timetable_entries_unique_slot
  ON timetable_entries(academic_year_id, class_id, section_id, day_of_week, period_number);
CREATE INDEX idx_timetable_entries_teacher_schedule
  ON timetable_entries(teacher_id, day_of_week, start_time);
CREATE INDEX idx_timetable_entries_school_id ON timetable_entries(school_id);
CREATE TRIGGER trg_timetable_entries_updated_at BEFORE UPDATE ON timetable_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('general', 'scholarship', 'boarding', 'day', 'other')),
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  effective_from DATE NOT NULL,
  effective_to DATE DEFAULT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_fee_structures_unique
  ON fee_structures(academic_year_id, class_id, category);
CREATE INDEX idx_fee_structures_school_id ON fee_structures(school_id);
CREATE TRIGGER trg_fee_structures_updated_at BEFORE UPDATE ON fee_structures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  exam_type VARCHAR(50) NOT NULL CHECK (exam_type IN ('unit_test', 'quarterly', 'half_yearly', 'final', 'entrance', 'other')),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  weightage NUMERIC(10,2) NOT NULL DEFAULT 100 CHECK (weightage >= 0),
  result_publish_date TIMESTAMP DEFAULT NULL,
  is_result_published BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'ongoing', 'completed', 'cancelled')),
  description TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_exams_academic_year_status ON exams(academic_year_id, status);
CREATE INDEX idx_exams_school_id ON exams(school_id);
CREATE TRIGGER trg_exams_updated_at BEFORE UPDATE ON exams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE transport_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  route_code TEXT NOT NULL UNIQUE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  driver TEXT DEFAULT '',
  attendant TEXT DEFAULT '',
  total_distance NUMERIC(10,2) DEFAULT 0,
  monthly_fee NUMERIC(10,2) DEFAULT 0 CHECK (monthly_fee >= 0),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_transport_routes_vehicle_id ON transport_routes(vehicle_id);
CREATE INDEX idx_transport_routes_school_id ON transport_routes(school_id);
CREATE UNIQUE INDEX idx_routes_school_code ON transport_routes(school_id, route_code);
CREATE TRIGGER trg_transport_routes_updated_at BEFORE UPDATE ON transport_routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE hostel_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  room_no TEXT NOT NULL,
  floor TEXT DEFAULT '',
  room_type VARCHAR(50) DEFAULT 'double' CHECK (room_type IN ('single', 'double', 'triple', 'dormitory')),
  capacity INT NOT NULL CHECK (capacity >= 1),
  occupied INT DEFAULT 0 CHECK (occupied >= 0),
  monthly_fee NUMERIC(10,2) DEFAULT 0 CHECK (monthly_fee >= 0),
  facilities TEXT[] DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'full', 'under_maintenance')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_hostel_rooms_hostel_room_no ON hostel_rooms(hostel_id, room_no);
CREATE INDEX idx_hostel_rooms_school_id ON hostel_rooms(school_id);
CREATE TRIGGER trg_hostel_rooms_updated_at BEFORE UPDATE ON hostel_rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. Tables depending on students / fee structures / exams
-- ============================================================

CREATE TABLE student_guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (student_id, guardian_id)
);
CREATE INDEX idx_student_guardians_student_id ON student_guardians(student_id);
CREATE INDEX idx_student_guardians_guardian_id ON student_guardians(guardian_id);
CREATE INDEX idx_student_guardians_school_id ON student_guardians(school_id);
CREATE TRIGGER trg_student_guardians_updated_at BEFORE UPDATE ON student_guardians
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE student_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  name TEXT,
  url TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_student_documents_student_id ON student_documents(student_id);
CREATE INDEX idx_student_documents_school_id ON student_documents(school_id);
CREATE TRIGGER trg_student_documents_updated_at BEFORE UPDATE ON student_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE student_medical_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  allergies TEXT DEFAULT '',
  medications TEXT DEFAULT '',
  emergency_contact TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_student_medical_info_school_id ON student_medical_info(school_id);
CREATE TRIGGER trg_student_medical_info_updated_at BEFORE UPDATE ON student_medical_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE fee_structure_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  fee_structure_id UUID NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
  fee_head_id UUID NOT NULL REFERENCES fee_heads(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  due_months INT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_fee_structure_items_fee_structure_id ON fee_structure_items(fee_structure_id);
CREATE INDEX idx_fee_structure_items_fee_head_id ON fee_structure_items(fee_head_id);
CREATE INDEX idx_fee_structure_items_school_id ON fee_structure_items(school_id);
CREATE TRIGGER trg_fee_structure_items_updated_at BEFORE UPDATE ON fee_structure_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE fee_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  invoice_no TEXT NOT NULL UNIQUE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  fee_structure_id UUID NOT NULL REFERENCES fee_structures(id) ON DELETE RESTRICT,
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  concession_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (concession_amount >= 0),
  fine_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (fine_amount >= 0),
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  advance_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (advance_amount >= 0),
  net_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'partial', 'paid', 'overdue', 'cancelled')),
  due_date DATE NOT NULL,
  generated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_fee_invoices_student_academic_year ON fee_invoices(student_id, academic_year_id);
CREATE INDEX idx_fee_invoices_status ON fee_invoices(status);
CREATE INDEX idx_fee_invoices_school_id ON fee_invoices(school_id);
CREATE INDEX idx_fee_invoices_due_date ON fee_invoices(school_id, due_date);
CREATE UNIQUE INDEX idx_fee_invoices_school_invoice_no ON fee_invoices(school_id, invoice_no);
CREATE TRIGGER trg_fee_invoices_updated_at BEFORE UPDATE ON fee_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE exam_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  exam_date TIMESTAMP NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  max_marks NUMERIC(10,2) NOT NULL CHECK (max_marks >= 0),
  pass_marks NUMERIC(10,2) NOT NULL CHECK (pass_marks >= 0),
  room_number TEXT DEFAULT '',
  invigilator_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_exam_schedules_unique ON exam_schedules(exam_id, class_id, section_id, subject_id);
CREATE INDEX idx_exam_schedules_school_id ON exam_schedules(school_id);
CREATE TRIGGER trg_exam_schedules_updated_at BEFORE UPDATE ON exam_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE transport_route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sequence INT NOT NULL CHECK (sequence >= 1),
  pickup_time TEXT DEFAULT '',
  drop_time TEXT DEFAULT '',
  fee NUMERIC(10,2) DEFAULT 0 CHECK (fee >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_transport_route_stops_route_id ON transport_route_stops(route_id);
CREATE INDEX idx_transport_route_stops_sequence ON transport_route_stops(route_id, sequence);
CREATE INDEX idx_transport_route_stops_school_id ON transport_route_stops(school_id);
CREATE TRIGGER trg_transport_route_stops_updated_at BEFORE UPDATE ON transport_route_stops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE hostel_room_beds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  hostel_room_id UUID NOT NULL REFERENCES hostel_rooms(id) ON DELETE CASCADE,
  bed_no TEXT,
  occupied_by_id UUID REFERENCES students(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_hostel_room_beds_room ON hostel_room_beds(hostel_room_id);
CREATE INDEX idx_hostel_room_beds_occupied_by ON hostel_room_beds(occupied_by_id);
CREATE INDEX idx_hostel_room_beds_school_id ON hostel_room_beds(school_id);
CREATE TRIGGER trg_hostel_room_beds_updated_at BEFORE UPDATE ON hostel_room_beds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. Tables depending on fee invoices / exam schedules / routes / rooms
-- ============================================================

CREATE TABLE fee_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES fee_invoices(id) ON DELETE CASCADE,
  fee_head_id UUID NOT NULL REFERENCES fee_heads(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  due_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_fee_invoice_items_invoice_id ON fee_invoice_items(invoice_id);
CREATE INDEX idx_fee_invoice_items_fee_head_id ON fee_invoice_items(fee_head_id);
CREATE TRIGGER trg_fee_invoice_items_updated_at BEFORE UPDATE ON fee_invoice_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  receipt_no TEXT NOT NULL UNIQUE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  invoice_id UUID NOT NULL REFERENCES fee_invoices(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  payment_mode VARCHAR(50) NOT NULL CHECK (payment_mode IN ('cash', 'cheque', 'mpesa', 'card', 'bank_transfer', 'online', 'dd')),
  transaction_id TEXT DEFAULT '',
  cheque_no TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  paid_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed', 'cancelled', 'refunded')),
  collected_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  remarks TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_fee_payments_student_paid_date ON fee_payments(student_id, paid_date DESC);
CREATE INDEX idx_fee_payments_school_id ON fee_payments(school_id);
CREATE UNIQUE INDEX idx_fee_payments_school_receipt_no ON fee_payments(school_id, receipt_no);
CREATE TRIGGER trg_fee_payments_updated_at BEFORE UPDATE ON fee_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE fee_concessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  fee_head_id UUID REFERENCES fee_heads(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('percentage', 'fixed_amount')),
  value NUMERIC(12,2) NOT NULL CHECK (value >= 0),
  reason TEXT DEFAULT '',
  approved_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_fee_concessions_student ON fee_concessions(student_id);
CREATE INDEX idx_fee_concessions_academic_year ON fee_concessions(academic_year_id);
CREATE INDEX idx_fee_concessions_school_id ON fee_concessions(school_id);
CREATE TRIGGER trg_fee_concessions_updated_at BEFORE UPDATE ON fee_concessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  exam_schedule_id UUID NOT NULL REFERENCES exam_schedules(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  marks_obtained NUMERIC(10,2) DEFAULT NULL,
  max_marks NUMERIC(10,2) NOT NULL CHECK (max_marks >= 0),
  pass_marks NUMERIC(10,2) NOT NULL CHECK (pass_marks >= 0),
  grade TEXT DEFAULT '',
  percentage NUMERIC(10,2) DEFAULT NULL,
  remarks TEXT DEFAULT '',
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'verified', 'published')),
  entered_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  verified_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_marks_exam_schedule_student ON marks(exam_schedule_id, student_id);
CREATE INDEX idx_marks_exam_student_status ON marks(exam_id, student_id, status);
CREATE INDEX idx_marks_school_id ON marks(school_id);
CREATE INDEX idx_marks_student_id ON marks(student_id);
CREATE INDEX idx_marks_exam_id ON marks(exam_id);
CREATE TRIGGER trg_marks_updated_at BEFORE UPDATE ON marks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE grading_scale_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grading_scale_id UUID NOT NULL REFERENCES grading_scales(id) ON DELETE CASCADE,
  grade TEXT NOT NULL,
  min_percent NUMERIC(5,2) NOT NULL CHECK (min_percent >= 0 AND min_percent <= 100),
  max_percent NUMERIC(5,2) NOT NULL CHECK (max_percent >= 0 AND max_percent <= 100),
  points NUMERIC(10,2) NOT NULL DEFAULT 0,
  remarks TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_grading_scale_grades_scale_id ON grading_scale_grades(grading_scale_id);
CREATE TRIGGER trg_grading_scale_grades_updated_at BEFORE UPDATE ON grading_scale_grades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE student_transports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES transport_routes(id) ON DELETE RESTRICT,
  pickup_stop TEXT DEFAULT '',
  drop_stop TEXT DEFAULT '',
  monthly_fee NUMERIC(10,2) DEFAULT 0 CHECK (monthly_fee >= 0),
  effective_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  effective_to TIMESTAMP DEFAULT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_student_transports_student_id ON student_transports(student_id);
CREATE INDEX idx_student_transports_route_id ON student_transports(route_id);
CREATE UNIQUE INDEX idx_student_transports_active_student ON student_transports(student_id) WHERE status = 'active';
CREATE INDEX idx_student_transports_school_id ON student_transports(school_id);
CREATE TRIGGER trg_student_transports_updated_at BEFORE UPDATE ON student_transports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE hostel_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES hostel_rooms(id) ON DELETE CASCADE,
  bed_no TEXT DEFAULT '',
  allocation_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deallocation_date TIMESTAMP DEFAULT NULL,
  monthly_fee NUMERIC(10,2) DEFAULT 0 CHECK (monthly_fee >= 0),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_hostel_allocations_active_student ON hostel_allocations(student_id) WHERE status = 'active';
CREATE INDEX idx_hostel_allocations_hostel ON hostel_allocations(hostel_id);
CREATE INDEX idx_hostel_allocations_room ON hostel_allocations(room_id);
CREATE INDEX idx_hostel_allocations_school_id ON hostel_allocations(school_id);
CREATE TRIGGER trg_hostel_allocations_updated_at BEFORE UPDATE ON hostel_allocations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 6. Attendance, communication, library, payment transactions
-- ============================================================

CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'half_day', 'on_leave')),
  type VARCHAR(50) NOT NULL DEFAULT 'daily' CHECK (type IN ('daily', 'subject')),
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  period INT DEFAULT NULL,
  marked_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  remarks TEXT DEFAULT '',
  is_manual BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_attendance_subject_unique
  ON attendance(student_id, date, type, COALESCE(subject_id, '00000000-0000-0000-0000-000000000000'))
  WHERE type = 'subject';
CREATE INDEX idx_attendance_class_section_date ON attendance(class_id, section_id, date);
CREATE INDEX idx_attendance_academic_year_status ON attendance(academic_year_id, status);
CREATE INDEX idx_attendance_school_id ON attendance(school_id);
CREATE INDEX idx_attendance_date ON attendance(school_id, date);
CREATE TRIGGER trg_attendance_updated_at BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('general', 'academic', 'exam', 'fee', 'event', 'holiday', 'urgent')),
  priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  target_audience VARCHAR(50) DEFAULT 'all' CHECK (target_audience IN ('all', 'students', 'teachers', 'parents', 'staff')),
  posted_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  publish_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expiry_date TIMESTAMP DEFAULT NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  attachment_url TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_announcements_publish_date ON announcements(publish_date DESC);
CREATE INDEX idx_announcements_category_is_published ON announcements(category, is_published);
CREATE INDEX idx_announcements_school_id ON announcements(school_id);
CREATE TRIGGER trg_announcements_updated_at BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'general' CHECK (type IN ('announcement', 'fee', 'attendance', 'exam', 'general', 'alert')),
  reference_model TEXT DEFAULT '',
  reference_id UUID DEFAULT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP DEFAULT NULL,
  is_push_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_notifications_recipient_read_created ON notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_school_id ON notifications(school_id);
CREATE TRIGGER trg_notifications_updated_at BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  type VARCHAR(50) DEFAULT 'in_person' CHECK (type IN ('in_person', 'online', 'phone')),
  scheduled_at TIMESTAMP NOT NULL,
  duration INT NOT NULL DEFAULT 30 CHECK (duration >= 5),
  location TEXT DEFAULT '',
  meet_link TEXT DEFAULT '',
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes TEXT DEFAULT '',
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_meetings_scheduled_at ON meetings(scheduled_at);
CREATE INDEX idx_meetings_student_status ON meetings(student_id, status);
CREATE INDEX idx_meetings_guardian_status ON meetings(guardian_id, status);
CREATE INDEX idx_meetings_organizer_status ON meetings(organizer_id, status);
CREATE INDEX idx_meetings_school_id ON meetings(school_id);
CREATE TRIGGER trg_meetings_updated_at BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  isbn VARCHAR(255) NOT NULL UNIQUE,
  author VARCHAR(255) NOT NULL,
  publisher VARCHAR(255) DEFAULT '',
  category VARCHAR(255) DEFAULT '',
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  edition VARCHAR(255) DEFAULT '',
  publish_year INT DEFAULT NULL,
  pages INT DEFAULT NULL,
  language VARCHAR(255) DEFAULT 'English',
  description TEXT DEFAULT '',
  cover_image VARCHAR(500) DEFAULT '',
  total_copies INT DEFAULT 1,
  available_copies INT DEFAULT 1,
  shelf_location VARCHAR(100) DEFAULT '',
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'lost')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_books_status ON books(status);
CREATE INDEX idx_books_subject_id ON books(subject_id);
CREATE INDEX idx_books_search ON books USING GIN (
  to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(author, '') || ' ' || COALESCE(isbn, ''))
);
CREATE INDEX idx_books_school_id ON books(school_id);
CREATE UNIQUE INDEX idx_books_school_isbn ON books(school_id, isbn);
CREATE TRIGGER trg_books_updated_at BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE book_copies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  accession_no VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'issued', 'reserved', 'lost', 'damaged', 'withdrawn')),
  condition VARCHAR(50) DEFAULT 'good' CHECK (condition IN ('new', 'good', 'fair', 'poor', 'damaged')),
  purchase_date TIMESTAMP DEFAULT NULL,
  cost NUMERIC(10,2) DEFAULT 0,
  location VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_book_copies_book_status ON book_copies(book_id, status);
CREATE INDEX idx_book_copies_school_id ON book_copies(school_id);
CREATE TRIGGER trg_book_copies_updated_at BEFORE UPDATE ON book_copies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE book_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  book_copy_id UUID NOT NULL REFERENCES book_copies(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  issue_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_date TIMESTAMP NOT NULL,
  return_date TIMESTAMP DEFAULT NULL,
  status VARCHAR(50) DEFAULT 'issued' CHECK (status IN ('issued', 'returned', 'lost', 'overdue')),
  fine_amount NUMERIC(10,2) DEFAULT 0,
  fine_paid NUMERIC(10,2) DEFAULT 0,
  issued_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  returned_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  remarks TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_book_issues_student_status ON book_issues(student_id, status);
CREATE INDEX idx_book_issues_due_date_status ON book_issues(due_date, status);
CREATE INDEX idx_book_issues_school_id ON book_issues(school_id);
CREATE TRIGGER trg_book_issues_updated_at BEFORE UPDATE ON book_issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE book_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'hold', 'fulfilled', 'cancelled', 'expired')),
  queue_position INT DEFAULT 1 CHECK (queue_position >= 1),
  reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT NULL,
  fulfilled_at TIMESTAMP DEFAULT NULL,
  notified_at TIMESTAMP DEFAULT NULL,
  remarks VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_book_reservations_book_status_queue ON book_reservations(book_id, status, queue_position);
CREATE INDEX idx_book_reservations_student_status ON book_reservations(student_id, status);
CREATE INDEX idx_book_reservations_expires_at ON book_reservations(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_book_reservations_school_id ON book_reservations(school_id);
CREATE TRIGGER trg_book_reservations_updated_at BEFORE UPDATE ON book_reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES fee_invoices(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('mpesa', 'stripe', 'cash', 'cheque', 'card', 'bank_transfer', 'online', 'dd')),
  provider_transaction_id VARCHAR(255) DEFAULT '',
  merchant_request_id VARCHAR(255) DEFAULT '',
  checkout_request_id VARCHAR(255) DEFAULT '',
  phone_number VARCHAR(50) DEFAULT '',
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'cancelled', 'refunded')),
  result_code VARCHAR(255) DEFAULT '',
  result_desc TEXT DEFAULT '',
  receipt_no VARCHAR(255) DEFAULT '',
  receipt_url TEXT DEFAULT '',
  metadata JSONB DEFAULT '{}',
  paid_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_payment_transactions_invoice_id ON payment_transactions(invoice_id);
CREATE INDEX idx_payment_transactions_student_id ON payment_transactions(student_id);
CREATE INDEX idx_payment_transactions_provider_txn_id ON payment_transactions(provider_transaction_id);
CREATE INDEX idx_payment_transactions_merchant_request_id ON payment_transactions(merchant_request_id);
CREATE INDEX idx_payment_transactions_checkout_request_id ON payment_transactions(checkout_request_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_receipt_no ON payment_transactions(receipt_no);
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions(created_at DESC);
CREATE INDEX idx_payment_transactions_school_id ON payment_transactions(school_id);
CREATE TRIGGER trg_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
