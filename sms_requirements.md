# Comprehensive School Management System (SMS) — Requirements Analysis

## Document Information
- **System Name**: School Management System (SMS)
- **Technology Stack**: Node.js (Backend), React (Frontend)
- **Document Type**: Exhaustive Requirements Specification
- **Scope**: Complete educational institution management

---

## 1. Student Management

### Core Features

#### 1.1 Admissions & Enrollment
- Online admission form submission with document upload
- Admission application tracking with unique application ID
- Multi-stage admission workflow (Application Review -> Entrance Test -> Interview -> Approval -> Enrollment)
- Bulk admission import via CSV/Excel
- Admission quota management (reserved categories, management quota, general)
- Waitlist management for oversubscribed programs
- Enrollment confirmation with provisional/temporary student ID generation
- Digital document verification and storage
- Admission fee collection integration

#### 1.2 Student Profiles
- Comprehensive student profile with demographic information
- Permanent and correspondence address management
- Medical history and emergency contact details
- Blood group, allergies, and special needs documentation
- Previous academic history and records
- Extra-curricular activities tracking
- Disciplinary records and behavioral notes
- Photo and document gallery (birth certificate, transfer certificate, etc.)
- Profile versioning and change history

#### 1.3 Student Records Management
- Academic records with year-over-year progression
- Co-curricular and extra-curricular achievement records
- Certificate and award management
- Document repository with expiry tracking
- Student ID card generation with barcode/QR code
- Roll number assignment (automatic/manual)
- Student categorization (day scholar, hosteller, transport user)

#### 1.4 Transfers & Withdrawals
- Transfer certificate (TC) issuance workflow
- Student transfer in/out from other institutions
- Mid-session withdrawal processing
- Withdrawal reason tracking and analytics
- Clearance workflow (library, fees, hostel, transport)
- Alumni status conversion upon graduation
- Re-admission process for returning students

#### 1.5 Parent/Guardian Management
- Multiple guardian support (father, mother, guardian, local guardian)
- Guardian relationship mapping and priority
- Parent contact details with primary/secondary designation
- Parent account creation linked to student
- Occupation, income category, and ID proof storage
- Emergency contact hierarchy
- Parent-teacher meeting history

### Data Entities
- `Student` (id, roll_no, admission_no, first_name, last_name, dob, gender, blood_group, nationality, religion, category, photo_url, enrollment_date, status, current_class_id, current_section_id, academic_year_id, admission_type, previous_school, medical_notes, special_needs, created_at, updated_at)
- `StudentAddress` (id, student_id, address_type, street, city, state, postal_code, country, is_primary)
- `Guardian` (id, student_id, guardian_type, name, relationship, phone, email, occupation, income_bracket, id_proof_type, id_proof_number, is_primary_contact, is_emergency_contact, priority_order)
- `AdmissionApplication` (id, application_no, academic_year_id, applying_for_class, first_name, last_name, dob, gender, parent_name, parent_phone, parent_email, status, application_date, review_date, test_date, interview_date, decision_date, decision, notes)
- `StudentDocument` (id, student_id, document_type, document_name, file_url, uploaded_by, uploaded_at, expiry_date, verified, verified_by, verified_at)
- `StudentTransfer` (id, student_id, transfer_type, from_school, to_school, transfer_date, tc_number, tc_issued_date, tc_status, clearance_status, reason)
- `StudentWithdrawal` (id, student_id, withdrawal_date, reason, effective_date, tc_issued, clearance_library, clearance_fees, clearance_hostel, clearance_transport, approved_by, status)

### User Roles
- **Administrator**: Full CRUD on all student records, admission decisions, withdrawal approvals
- **Admission Officer**: Application processing, enrollment management, document verification
- **Class Teacher**: View and update student records for assigned class/section
- **Student**: View own profile, limited edit access
- **Parent/Guardian**: View linked student(s) profile, attendance, grades, fees
- **System**: Automated roll number generation, status transitions

### Business Rules & Constraints
- Student roll numbers must be unique within an academic year and class-section combination.
- Admission number must be unique across the entire system and immutable.
- A student cannot be enrolled in multiple classes simultaneously within the same academic year.
- Student age must meet the minimum age requirement for the applied class as per government regulations.
- Withdrawal requires clearance from all departments (library dues, fee dues, hostel, transport) before TC issuance.
- Parent/guardian phone numbers must be unique and verified via OTP.
- Admission application decision must follow the sequential workflow; backward jumps require admin override with audit trail.
- Maximum guardians per student: 5.
- Student status transitions must follow: `applied -> enrolled -> active -> promoted/withdrawn/alumni`.
- Profile photo must be recent (within 6 months) and meet minimum resolution requirements.
- Transfer certificate cannot be issued if any financial dues exist.
- Re-admission within 2 years retains original admission number.

---

## 2. Teacher/Staff Management

### Core Features

#### 2.1 Recruitment & Onboarding
- Job posting and vacancy management
- Application receiving and screening
- Interview scheduling and evaluation scoring
- Offer letter generation and acceptance tracking
- Document collection during onboarding
- Staff ID generation and card printing
- Account creation and initial role assignment

#### 2.2 Staff Profiles
- Personal information, qualifications, and certifications
- Work experience history
- Subject specialization and competency mapping
- Class teacher assignment history
- Professional development and training records
- Awards, recognitions, and publications
- Bank account details for payroll
- Contractual vs permanent staff classification
- Biometric/RFID integration for attendance

#### 2.3 Qualification & Certification Management
- Educational qualifications (degree, institution, year, grade)
- Professional certifications and licenses
- Certification expiry tracking and renewal alerts
- Subject competency and teaching level mapping
- B.Ed./teaching license verification
- Skills and expertise inventory

#### 2.4 Contract Management
- Contract creation with start date, end date, type
- Contract renewal workflow with alerts (30, 15, 7 days before expiry)
- Probation period tracking
- Salary revision history
- Termination and resignation processing
- Notice period calculation and tracking
- Contract terms and conditions document storage

#### 2.5 Payroll Management
- Salary structure definition (basic pay, allowances, deductions)
- Monthly salary calculation and generation
- Payslip generation and distribution (email/download)
- Advance salary request and approval workflow
- Loan management against salary
- Tax calculation (TDS, professional tax) and deduction
- PF/EPF contribution tracking
- Salary hold and release mechanism
- Arrears calculation and payment
- Bank advice/statement generation for bulk transfer

#### 2.6 Attendance & Leave Management
- Daily attendance marking (present, absent, half-day, on-duty)
- Late entry and early exit tracking
- Leave type configuration (casual, medical, earned, maternity, paternity, unpaid)
- Leave application and approval workflow
- Leave balance tracking and carry-forward rules
- Holiday calendar management
- Overtime tracking and compensation
- Attendance report generation (monthly, yearly)
- Leave encashment processing

### Data Entities
- `Staff` (id, employee_id, first_name, last_name, gender, dob, phone, email, emergency_contact, address, photo_url, designation, department, joining_date, employment_type, contract_start, contract_end, probation_end, status, biometric_id, bank_name, bank_account, ifsc_code, pf_number, uan, basic_salary, created_at, updated_at)
- `StaffQualification` (id, staff_id, degree, specialization, institution, year_of_passing, grade, certificate_url, verified)
- `StaffExperience` (id, staff_id, institution_name, designation, from_date, to_date, is_current, description)
- `StaffContract` (id, staff_id, contract_type, start_date, end_date, probation_months, salary, terms_url, status, renewed_from, created_by)
- `StaffAttendance` (id, staff_id, date, status, check_in, check_out, late_minutes, early_exit_minutes, remarks, marked_by, device_id)
- `StaffLeave` (id, staff_id, leave_type, from_date, to_date, days, reason, attachment_url, applied_on, status, approved_by, approved_on, remarks)
- `StaffLeaveBalance` (id, staff_id, academic_year_id, leave_type, total_days, used_days, carried_forward, credited_on)
- `SalaryStructure` (id, staff_id, basic_pay, da, hra, ta, medical_allowance, special_allowance, other_allowances, pf_employee, pf_employer, tds, professional_tax, other_deductions, effective_from, effective_to, is_active)
- `SalarySlip` (id, staff_id, month, year, salary_structure_id, working_days, present_days, leave_days, gross_salary, total_deductions, net_salary, status, generated_at, sent_at)
- `PayrollPeriod` (id, month, year, start_date, end_date, status, processed_by, processed_at)

### User Roles
- **Administrator**: Full CRUD on all staff records, contract approvals, payroll processing
- **HR Manager**: Recruitment management, profile management, leave approvals, contract management
- **Finance Manager**: Payroll processing, salary structure management, payslip generation
- **Principal/Headmaster**: Leave approvals for teaching staff, recruitment decisions
- **Department Head**: View staff in department, attendance monitoring
- **Teacher/Staff**: View own profile, apply for leave, view payslips, attendance history
- **Biometric/System**: Automated attendance capture

### Business Rules & Constraints
- Employee ID must be unique and follow the format `EMP-[YEAR]-[SEQUENCE]`.
- A teacher must have at least one valid qualification record.
- Teaching staff must have a B.Ed. or equivalent certification for classes above primary.
- Contract end date must be greater than or equal to start date; maximum contract duration 5 years.
- A staff member cannot apply for leave exceeding their available balance without admin override.
- Casual leave requires at least 3 days advance notice; medical leave can be applied retroactively within 2 days.
- Maximum 3 staff members from the same department can be on leave simultaneously.
- Payroll cannot be processed for a month until attendance is finalized.
- Salary calculation: `Net Salary = Gross Earnings - (PF + TDS + Professional Tax + Other Deductions + Loan EMI + Advance Recovery)`.
- Payslips must be locked after generation; corrections require reversal and regeneration with audit trail.
- Probation review must be completed within 7 days of probation end date.
- Staff on notice period cannot apply for leave.
- Attendance marked after 10:00 AM is considered late; after 12:00 PM is half-day.

---

## 3. Academic Management

### Core Features

#### 3.1 Class & Section Management
- Class creation and hierarchy (Pre-Nursery through 12th/UG/PG)
- Section management within classes (A, B, C, etc.)
- Class teacher assignment
- Student strength limits per section
- Section merging and splitting
- Class promotion hierarchy definition

#### 3.2 Subject Management
- Subject creation with code, name, and description
- Subject categorization (core, elective, co-curricular, extra-curricular)
- Subject grouping and dependencies
- Subject-teacher assignment (primary and substitute)
- Subject credits and weightage configuration
- Practical vs theory subject distinction
- Subject syllabus upload and version control
- Subject prerequisites definition

#### 3.3 Curriculum Planning
- Curriculum framework definition (CBSE, ICSE, State Board, IB, custom)
- Syllabus breakdown by term/unit/chapter
- Learning outcome mapping to curriculum
- Curriculum review and approval workflow
- Curriculum comparison across academic years
- Resource material linking (books, references, digital content)

#### 3.4 Lesson Planning
- Lesson plan creation with objectives, activities, and assessments
- Weekly lesson plan submission by teachers
- Lesson plan approval by department heads
- Resource attachment (PPTs, worksheets, videos)
- Lesson plan sharing and reuse across teachers
- Lesson completion tracking
- Lesson plan template management

#### 3.5 Timetable & Scheduling
- Master timetable creation with drag-and-drop interface
- Multiple timetable support (regular, exam, special events)
- Automatic timetable generation with constraint optimization
- Subject period allocation and distribution
- Teacher workload balancing
- Room/lab allocation and conflict detection
- Substitution management when teachers are absent
- Timetable publication to students and parents
- Elective subject scheduling
- Break and assembly time configuration

#### 3.6 Academic Year & Terms
- Academic year creation with start and end dates
- Term/Semester definition within academic year
- Examination session mapping to terms
- Holiday calendar integration
- Working days calculation
- Academic year rollover and archival

#### 3.7 Student Promotion & Academic Progression
- Automatic promotion based on defined criteria
- Detention rules and conditional promotion
- Subject-wise promotion eligibility
- Failed student retention and remedial class assignment
- Graduation/Alumni conversion for final year students
- Promotion batch processing with rollback capability

### Data Entities
- `Class` (id, class_name, class_numeric, class_group, stream, board, status, sort_order)
- `Section` (id, class_id, section_name, room_number, capacity, class_teacher_id, academic_year_id, status)
- `Subject` (id, subject_code, subject_name, short_name, category, type, credits, max_marks_theory, max_marks_practical, passing_marks_theory, passing_marks_practical, description, status)
- `ClassSubject` (id, class_id, subject_id, academic_year_id, teacher_id, substitute_teacher_id, periods_per_week, is_elective, elective_group)
- `Curriculum` (id, board_id, class_id, subject_id, academic_year_id, syllabus_url, total_units, description, approved_by, approved_at, status)
- `CurriculumUnit` (id, curriculum_id, unit_no, unit_name, description, periods_allocated, learning_outcomes)
- `LessonPlan` (id, teacher_id, class_subject_id, unit_id, lesson_date, topic, objectives, teaching_methods, resources, assessment_method, homework, status, reviewed_by, reviewed_at)
- `Timetable` (id, academic_year_id, type, effective_from, effective_to, status, created_by)
- `TimetableEntry` (id, timetable_id, day_of_week, period_no, start_time, end_time, class_section_id, subject_id, teacher_id, room_id, is_substitution, original_teacher_id)
- `AcademicYear` (id, year_name, start_date, end_date, status, is_current)
- `Term` (id, academic_year_id, term_name, term_no, start_date, end_date, exam_session_id)
- `Promotion` (id, student_id, from_class_id, from_section_id, to_class_id, to_section_id, academic_year_id, promotion_status, result_status, promoted_on, promoted_by, remarks)
- `Room` (id, room_number, room_name, building, floor, capacity, room_type, facilities)

### User Roles
- **Administrator**: Full academic configuration, class/section CRUD, timetable management
- **Academic Coordinator**: Curriculum planning, timetable creation, teacher workload management
- **Department Head**: Subject management, lesson plan review, curriculum approval
- **Class Teacher**: Class management, student promotion recommendations
- **Subject Teacher**: Lesson plan creation, timetable viewing
- **Student**: View timetable, academic calendar
- **Parent**: View child's timetable, academic calendar, curriculum information

### Business Rules & Constraints
- A class must have at least one section; maximum sections configurable (default 10).
- Section capacity must not exceed the configured limit (default 40).
- A teacher cannot be assigned to two different classes at the same time slot.
- Each subject must have at least the minimum required periods per week (default 3 for core subjects).
- Teacher maximum periods per week must not exceed 40.
- Timetable must have no conflicts: no teacher double-booked, no room double-booked, no class double-booked.
- Academic years cannot overlap; there must be a gap of at least 1 day between consecutive academic years.
- Student promotion requires minimum attendance (default 75%) and minimum aggregate marks (default 40%).
- Failed students in up to 2 subjects may be conditionally promoted with remedial classes.
- Failed students in more than 2 subjects must repeat the year.
- Lesson plans must be submitted at least 2 days before the scheduled class.
- Curriculum changes after approval require revision and re-approval.
- Timetable effective dates cannot overlap within the same academic year.

---

## 4. Attendance Management

### Core Features

#### 4.1 Student Attendance
- Daily attendance marking (Present, Absent, Half-Day, Late, On Leave)
- Subject-wise attendance tracking
- Biometric/RFID/card-based attendance capture
- Manual attendance entry by class teacher
- Bulk attendance operations
- Attendance regularization requests
- Attendance summary and analytics
- Monthly attendance register generation
- Attendance percentage calculation and reporting

#### 4.2 Teacher Attendance
- Daily check-in/check-out with timestamp
- Late arrival and early departure tracking
- On-duty/outdoor duty marking
- Attendance correction requests
- Monthly attendance summary
- Integration with payroll for salary calculation

#### 4.3 Leave Types & Management
- Configurable leave types with rules
- Leave quota definition per staff category
- Leave application with approval workflow
- Compensatory leave (comp-off) management
- Half-day and short leave handling
- Sandwich leave rule configuration
- Leave without pay (LWP) automatic application

#### 4.4 Attendance Reports & Analytics
- Daily, weekly, monthly attendance reports
- Class-wise and section-wise attendance summaries
- Individual student attendance history
- Attendance trend analysis
- Defaulters list (below threshold)
- Consolidated attendance register
- Attendance comparison across periods

#### 4.5 Parent Notifications
- Automatic SMS/email for student absence
- Daily attendance digest to parents
- Low attendance threshold alerts
- Attendance regularization reminders
- Monthly attendance summary to parents

### Data Entities
- `StudentAttendance` (id, student_id, class_section_id, subject_id, date, status, remark, marked_by, marked_via, marked_at, is_regularized, regularized_by, regularized_at)
- `TeacherAttendance` (id, staff_id, date, check_in, check_out, status, late_minutes, early_minutes, marked_by, device_id, remarks)
- `LeaveType` (id, name, code, applicable_to, max_days, carry_forward, encashable, min_notice_days, color_code, status)
- `AttendanceRegister` (id, class_section_id, subject_id, month, year, academic_year_id, generated_by, generated_at, status)
- `AttendanceSummary` (id, student_id, academic_year_id, month, year, working_days, present_days, absent_days, late_days, half_days, leave_days, attendance_percentage, status)
- `AttendanceThresholdAlert` (id, student_id, class_section_id, alert_type, threshold_percentage, triggered_at, acknowledged, acknowledged_by)
- `AttendanceRegularization` (id, student_id, date, requested_status, reason, supporting_document, requested_by, requested_at, status, approved_by, approved_at, remarks)

### User Roles
- **Class Teacher**: Daily attendance marking, report viewing, regularization approval
- **Subject Teacher**: Subject-wise attendance marking
- **Attendance Clerk**: Bulk attendance entry, report generation
- **Administrator**: Attendance configuration, rule management, override
- **Student**: View own attendance
- **Parent**: View child's attendance, receive notifications
- **System**: Automated alerts, summary generation, threshold monitoring

### Business Rules & Constraints
- Attendance must be marked by 10:00 AM for the current day; late marking requires justification.
- A student marked absent in the morning cannot be marked present for afternoon subjects without regularization.
- Attendance percentage calculation: `(Present Days + Half Days/2) / Working Days * 100`.
- Minimum attendance requirement for exam eligibility: 75% (configurable).
- Students with attendance below 75% are flagged and reported to parents automatically.
- Students with attendance below 50% may not be promoted to the next class.
- Leave application must be submitted at least 3 days in advance for planned leave.
- Medical leave can be applied retroactively within 2 working days with medical certificate.
- Maximum 3 attendance regularization requests per student per month.
- Attendance records cannot be modified after 7 days without admin approval.
- Parent notification for absence must be sent within 2 hours of attendance marking.
- Sandwich rule: If a working day falls between a leave and a holiday/weekend, it is automatically marked as leave.
- Compensatory leave must be availed within 60 days of earning.

---

## 5. Examination & Grading

### Core Features

#### 5.1 Exam Types & Configuration
- Exam type creation (Unit Test, Mid-Term, Final, Quiz, Practical, Oral, Project)
- Exam session definition (term-wise, annual)
- Exam schedule creation with date, time, duration
- Seating arrangement generation
- Exam center/room allocation
- Invigilator assignment
- Exam rules and instructions publication

#### 5.2 Marks Entry & Management
- Marks entry interface by subject teachers
- Bulk marks import via CSV/Excel
- Marks entry deadline configuration
- Multiple entry rounds (first entry, verification, finalization)
- Marks moderation workflow
- Grace marks allocation with approval
- Absent/Expelled/Malpractice status marking
- Re-evaluation request and processing

#### 5.3 Grade Scales & Evaluation
- Grade scale definition (A+, A, B+, B, C, D, E, F)
- Marks-to-grade conversion automation
- GPA/CGPA calculation support
- CCE (Continuous Comprehensive Evaluation) pattern support
- Weighted average calculation across exam types
- Custom formula-based result calculation
- Pass/fail determination with criteria
- Rank calculation (class-wise, section-wise, overall)

#### 5.4 Report Cards & Transcripts
- Report card template design and customization
- Auto-populated report card generation
- Term-wise and consolidated report cards
- Report card publishing to parents
- Digital signature integration
- Report card download/print
- Transcript generation for transfers/higher education
- Marks sheet generation
- Cumulative performance report

#### 5.5 Progress Tracking & Analytics
- Individual student performance trend analysis
- Class performance comparison
- Subject-wise performance analysis
- Top performer identification
- Improvement/decline detection
- Parent-teacher meeting triggers based on performance
- Historical performance comparison
- Learning gap identification

### Data Entities
- `ExamType` (id, name, code, weightage, max_marks, is_graded, is_practical, status)
- `ExamSession` (id, academic_year_id, term_id, name, start_date, end_date, status)
- `ExamSchedule` (id, exam_session_id, class_id, subject_id, exam_date, start_time, duration, max_marks, passing_marks, room_id, invigilator_id)
- `ExamResult` (id, student_id, exam_schedule_id, marks_obtained, marks_obtained_practical, grade, grade_point, status, entered_by, entered_at, verified_by, verified_at)
- `GradeScale` (id, name, min_marks, max_marks, grade, grade_point, description, is_passing, color_code)
- `ReportCard` (id, student_id, academic_year_id, term_id, generated_at, generated_by, status, published_at, template_id)
- `ReportCardDetail` (id, report_card_id, subject_id, exam_type_id, marks_obtained, max_marks, grade, grade_point, teacher_remarks)
- `ReportCardTemplate` (id, name, academic_year_id, layout_config, header_image, footer_text, status)
- `Transcript` (id, student_id, academic_year_id, type, generated_at, generated_by, file_url, signed, signed_by, signed_at)
- `ReevaluationRequest` (id, student_id, exam_result_id, reason, status, fee_paid, result_changed, new_marks, processed_by, processed_at)
- `StudentPerformanceAnalytics` (id, student_id, academic_year_id, term_id, overall_percentage, overall_grade, rank_section, rank_class, attendance_factor, improvement_index)

### User Roles
- **Administrator**: Exam configuration, schedule management, result finalization
- **Academic Coordinator**: Exam scheduling, invigilator assignment, moderation
- **Subject Teacher**: Marks entry for assigned subjects
- **Department Head**: Marks verification, moderation approval
- **Class Teacher**: View class results, report card review
- **Student**: View own results and report cards
- **Parent**: View child's results and report cards
- **Examination Controller**: Full exam management, result processing

### Business Rules & Constraints
- Marks entry deadline is 5 days after the exam date; late entry requires HOD approval.
- Marks once finalized cannot be modified; only through re-evaluation process.
- Re-evaluation must be requested within 7 days of result declaration with non-refundable fee.
- Grade calculation follows the formula: `Grade = Lookup(Percentage, GradeScale)`.
- GPA calculation: `GPA = Sum(GradePoints * Credits) / Sum(Credits)`.
- A student failing in more than 2 subjects cannot be promoted.
- Report cards cannot be published to parents until all subject marks are entered and verified.
- Seating arrangement must ensure no adjacent students have the same subject.
- Exam schedule must not conflict with timetable; minimum 1 day preparation gap between major exams.
- Maximum 3 exams per day for any class.
- Practical exams must be completed before theory exam declaration.
- Moderation marks cannot exceed 10% of maximum marks and require principal approval.
- Rank calculation excludes students with any disciplinary actions during the exam period.

---

## 6. Fee & Finance Management

### Core Features

#### 6.1 Fee Structure & Configuration
- Fee category creation (Tuition, Admission, Examination, Transport, Hostel, Library, Lab, Development, Miscellaneous)
- Fee head management with frequency (one-time, monthly, quarterly, half-yearly, annually)
- Class-wise fee structure definition
- Fee component configuration with amounts
- Late fee and fine configuration
- Fee structure versioning and effective dates
- Concession category setup

#### 6.2 Fee Collection
- Student fee assignment based on class and applicable categories
- Fee invoice generation (automatic/manual)
- Multiple payment mode support (Cash, Cheque, DD, Online/UPI, Card, Bank Transfer)
- Partial payment acceptance with rules
- Fee receipt generation with unique receipt number
- Bulk fee collection interface
- Advance fee collection and adjustment
- Due date management and grace period

#### 6.3 Invoices & Receipts
- Invoice generation with line items
- Proforma invoice for estimation
- Receipt generation with digital signature
- Invoice status tracking (Paid, Partial, Unpaid, Overdue, Cancelled)
- Receipt reprint with duplicate marking
- Invoice cancellation and refund processing
- Auto-generated invoice numbering

#### 6.4 Scholarships & Discounts
- Scholarship scheme definition (merit-based, need-based, sports, cultural)
- Student scholarship application and approval
- Fee concession mapping to students
- Sibling discount configuration
- Staff children discount
- Early payment discount
- Discount cap and validation
- Scholarship disbursement tracking

#### 6.5 Payment Tracking & Reconciliation
- Real-time payment status tracking
- Payment gateway integration (multiple providers)
- Bank reconciliation for collected fees
- Bounced cheque/DD tracking
- Payment failure and retry handling
- Automated payment reminders
- Payment history and audit trail

#### 6.6 Financial Reports
- Daily collection report
- Outstanding fees report with aging analysis
- Fee collection summary (class-wise, category-wise)
- Defaulters list with contact details
- Revenue projection and actuals comparison
- Scholarship disbursement report
- Bank reconciliation report
- Financial year closing report

### Data Entities
- `FeeCategory` (id, name, code, description, frequency, is_refundable, is_optional, status)
- `FeeStructure` (id, fee_category_id, class_id, academic_year_id, amount, effective_from, effective_to, status, created_by)
- `StudentFee` (id, student_id, fee_structure_id, amount, concession_amount, net_amount, due_date, status, generated_at, generated_by)
- `FeeInvoice` (id, invoice_no, student_id, academic_year_id, month, year, total_amount, concession_amount, fine_amount, net_amount, paid_amount, balance_amount, due_date, status, generated_at)
- `FeeInvoiceItem` (id, invoice_id, fee_category_id, description, amount, concession, net_amount)
- `FeeReceipt` (id, receipt_no, invoice_id, student_id, amount, payment_mode, transaction_reference, bank_name, cheque_no, cheque_date, collected_by, collected_at, status)
- `FeeConcession` (id, student_id, fee_category_id, concession_type, amount_or_percentage, value, approved_by, approved_at, effective_from, effective_to, status)
- `ScholarshipScheme` (id, name, type, eligibility_criteria, amount_or_percentage, value, max_recipients, academic_year_id, status)
- `StudentScholarship` (id, student_id, scholarship_scheme_id, applied_on, approved_by, approved_at, amount_awarded, disbursement_status)
- `FineConfiguration` (id, fee_category_id, fine_type, fine_amount, grace_days, max_fine, apply_after_grace, status)
- `FeeReminder` (id, student_id, invoice_id, reminder_type, sent_via, sent_at, status)
- `PaymentGatewayLog` (id, student_id, amount, gateway, transaction_id, request_payload, response_payload, status, created_at)

### User Roles
- **Administrator**: Fee structure CRUD, concession approvals, financial configuration
- **Accountant**: Fee collection, receipt generation, payment tracking, reconciliation
- **Finance Manager**: Fee structure approval, financial reports, revenue analysis
- **Student**: View fee invoices, make online payments, download receipts
- **Parent**: View child's fee details, make payments, download receipts
- **System**: Automated invoice generation, reminder dispatch, fine calculation

### Business Rules & Constraints
- Fee invoices must be generated at least 7 days before the due date.
- Late fee is calculated after the grace period: `Fine = DaysAfterGrace * FinePerDay`, capped at `max_fine`.
- Partial payments are accepted only if the minimum amount is at least 50% of the due amount.
- Receipt numbers must be unique and sequential; gap reporting is mandatory.
- Invoice cancellation requires approval from Finance Manager with reason documentation.
- Refunds are processed within 14 working days of approval.
- Scholarship amount cannot exceed 100% of the applicable fee.
- Sibling discount applies only to tuition fee and is non-cumulative with other discounts.
- Online payment reconciliation must happen within 24 hours.
- Financial year-end closing prevents modification of records from closed periods.
- A student with outstanding fees exceeding 3 months may be barred from examination registration.
- Fee structure changes require 30 days advance notice and do not affect already generated invoices.
- All monetary transactions must have an immutable audit trail with timestamp and user attribution.

---

## 7. Library Management

### Core Features

#### 7.1 Catalog Management
- Book addition with complete bibliographic information
- ISBN-based auto-population from external APIs (Google Books, Open Library)
- Multi-copy management with unique accession numbers
- Book categorization (Dewey Decimal / custom classification)
- Author, publisher, and subject management
- E-book and digital resource cataloging
- Book cover image upload
- Barcode/RFID label generation
- Catalog search and advanced filtering

#### 7.2 Book Issuance & Returns
- Student/staff book issuance with due date calculation
- Scan-based quick issuance and return
- Renewal processing with renewal limit tracking
- Overdue detection and fine calculation
- Issued book tracking by user
- Reservation/hold processing
- Lost book marking and replacement cost calculation
- Current availability status display

#### 7.3 Fines & Penalties
- Fine configuration (daily rate, maximum cap, grace period)
- Automatic fine calculation on overdue returns
- Fine waiver with approval workflow
- Fine collection and receipt generation
- Fine history tracking
- Block issuance for fine defaulters

#### 7.4 Reservations & Requests
- Book reservation by users
- Queue management for popular books
- Reservation expiry (auto-cancel after 48 hours of availability notification)
- New book request/suggestion by users
- Purchase request generation for librarian

#### 7.5 Library Reports & Analytics
- Book inventory report
- Circulation statistics (issued, returned, overdue)
- Most/least borrowed books
- User borrowing history
- Fine collection report
- Acquisition and weeding recommendations
- Library usage analytics

### Data Entities
- `Book` (id, isbn, title, subtitle, authors, publisher, publication_year, edition, language, pages, description, cover_image_url, category_id, subject, classification_no, keywords, status, created_at)
- `BookCopy` (id, book_id, accession_no, barcode, rfid_tag, purchase_date, purchase_price, condition, location_rack, location_shelf, status, added_by, added_at)
- `BookCategory` (id, name, code, parent_id, description, status)
- `BookIssue` (id, book_copy_id, user_type, user_id, issue_date, due_date, return_date, fine_amount, fine_paid, status, issued_by, returned_to, renewal_count)
- `BookReservation` (id, book_id, user_type, user_id, reserved_on, expiry_date, status, notified_at)
- `LibraryFineConfig` (id, user_type, fine_per_day, max_fine, grace_days, currency, effective_from, status)
- `LibraryFineTransaction` (id, book_issue_id, amount, reason, status, collected_by, collected_at, waived_by, waived_at, waiver_reason)
- `LibrarySettings` (id, max_books_student, max_books_teacher, issue_days_student, issue_days_teacher, max_renewals, renewal_days, allow_overdue_issue)

### User Roles
- **Librarian**: Full catalog management, issue/return processing, fine management, reports
- **Library Assistant**: Book issue/return, basic catalog search, membership management
- **Student**: Search catalog, view borrowed books, request reservation, view fines
- **Teacher/Staff**: Extended borrowing privileges, bulk request, reservation
- **Administrator**: Library settings, fine configuration, report access

### Business Rules & Constraints
- Each book copy must have a unique accession number following format `ACC-[YEAR]-[SEQUENCE]`.
- Maximum books issued: Students = 3, Teachers = 5 (configurable).
- Issue period: Students = 14 days, Teachers = 30 days (configurable).
- Maximum renewals per book: 2; each renewal extends due date by the original issue period.
- Fine calculation: `Fine = max(0, DaysOverdue - GraceDays) * FinePerDay`, capped at `max_fine`.
- Users with outstanding fines exceeding a threshold (configurable, default $10) cannot issue new books.
- Reservation expires 48 hours after availability notification if not collected.
- Lost book replacement cost = Book purchase price + 50% processing fee.
- Damaged book assessment follows a 4-point scale: Good, Fair, Poor, Lost; Poor condition triggers replacement.
- Duplicate ISBN entries must be flagged; new copies should be added to existing book records.
- Book deletion is not allowed; status changes to `Archived` or `Lost`.
- Auto-reminder emails sent 2 days before due date and on the due date.

---

## 8. Transport Management

### Core Features

#### 8.1 Route Management
- Route creation with start point, end point, and waypoints
- Route distance and estimated time calculation
- Route optimization and modification
- Route-vehicle assignment
- Stop/station management with sequence ordering
- Route fare calculation
- Route coverage area mapping

#### 8.2 Vehicle Management
- Vehicle registration with RC details
- Vehicle type and capacity management
- Insurance and fitness certificate tracking with expiry alerts
- Maintenance schedule and log
- Fuel consumption tracking
- Vehicle assignment to routes
- GPS device integration
- Vehicle status tracking (Active, In Maintenance, Retired)

#### 8.3 Driver Management
- Driver profile with license details
- License expiry tracking and renewal alerts
- Driver-vehicle assignment
- Driver attendance and duty roster
- Driver performance and incident tracking
- Background verification documentation

#### 8.4 Student Transport Assignment
- Student-route assignment based on pickup/drop location
- Transport fee calculation based on distance
- Transport fee waiver/concession support
- Change request processing (route change, stop change)
- Student transport ID card generation
- Sibling route consolidation

#### 8.5 Transport Tracking
- Real-time GPS tracking of vehicles
- Route deviation alerts
- Estimated arrival time at stops
- Parent mobile app tracking interface
- Over-speed alerts
- Route history playback
- Emergency/SOS alert system

### Data Entities
- `TransportRoute` (id, route_name, route_code, start_location, end_location, total_distance, estimated_time, fare_amount, status, created_by)
- `RouteStop` (id, route_id, stop_name, stop_sequence, latitude, longitude, estimated_arrival_time, distance_from_start)
- `Vehicle` (id, vehicle_no, vehicle_type, make, model, year, capacity, chassis_no, engine_no, rc_no, rc_expiry, insurance_no, insurance_expiry, fitness_cert_expiry, gps_device_id, status)
- `Driver` (id, staff_id, license_no, license_type, license_expiry, badge_no, assigned_vehicle_id, status)
- `VehicleMaintenance` (id, vehicle_id, maintenance_type, description, cost, service_date, next_service_date, service_center, status)
- `StudentTransport` (id, student_id, route_id, pickup_stop_id, drop_stop_id, transport_fee, fee_concession, effective_from, effective_to, status)
- `TransportFee` (id, student_id, month, year, amount, concession, fine, paid_amount, status, due_date)
- `GpsTrackingLog` (id, vehicle_id, latitude, longitude, speed, direction, recorded_at, device_id)
- `TransportAttendance` (id, student_id, route_id, date, pickup_time, drop_time, pickup_status, drop_status, vehicle_id, driver_id)

### User Roles
- **Transport Manager**: Route management, vehicle management, driver management, student assignment
- **Driver**: View route, mark student pickup/drop, report incidents
- **Administrator**: Transport configuration, fee approval, report access
- **Student**: View assigned route and stops
- **Parent**: View child's transport details, real-time tracking, receive alerts
- **Accountant**: Transport fee collection and management

### Business Rules & Constraints
- Vehicle capacity must not be exceeded; overloading triggers automatic alert.
- Route stops must have unique sequence numbers within a route.
- Transport fees are calculated based on the distance from school to the farthest stop the student uses.
- Insurance and fitness certificate expiry alerts must be sent 30, 15, and 7 days before expiry.
- Driver license expiry must trigger alert 30 days before expiry; expired license prevents duty assignment.
- Vehicle maintenance must be scheduled every 5,000 km or 3 months, whichever is earlier.
- GPS tracking data must be retained for minimum 90 days.
- Student route changes require 5 working days processing time.
- Over-speed threshold: 40 km/h within city limits, 60 km/h on highways (configurable).
- Each route must have a backup vehicle assigned for emergencies.
- Transport fee is collected in advance for the month; non-payment by the 10th triggers fine.
- Student pickup/drop attendance must be marked in real-time via driver mobile app.

---

## 9. Hostel/Dormitory Management

### Core Features

#### 9.1 Hostel & Room Management
- Hostel building and wing/floor creation
- Room creation with room number, type, and capacity
- Bed/berth management within rooms
- Room categorization (single, double, triple, dormitory)
- Room amenities and facility tracking
- Room status management (available, occupied, under maintenance, reserved)
- Room condition inspection log

#### 9.2 Student Allocation
- Student room/bed assignment based on preferences and availability
- Room change request and approval workflow
- Visitor/guest registration and tracking
- Night attendance and roll call management
- Leave application for hostel residents (day leave, weekend leave, vacation leave)
- Check-in and check-out processing
- Roommate preference and compatibility consideration

#### 9.3 Hostel Fees & Billing
- Hostel fee structure (room rent, mess charges, amenities, security deposit)
- Monthly/quarterly/annual billing cycle
- Mess fee calculation (fixed or consumption-based)
- Security deposit collection and refund on checkout
- Late payment fine
- Fee concession for hostel residents
- Checkout clearance and final settlement

#### 9.4 Amenities & Facilities
- Common facility management (common room, study room, gym, laundry)
- Equipment and furniture inventory per room
- Complaint registration and resolution tracking
- Maintenance request workflow
- Cleaning and housekeeping schedule
- Inventory tracking (linen, utensils, furniture)

#### 9.5 Hostel Reports
- Occupancy report (current and historical)
- Room availability forecast
- Fee collection and outstanding report
- Student leave register
- Visitor log report
- Complaint resolution report
- Damage and penalty report

### Data Entities
- `Hostel` (id, name, code, type, address, warden_id, total_rooms, total_capacity, status)
- `HostelRoom` (id, hostel_id, room_no, floor, wing, room_type, capacity, occupied_beds, amenities, monthly_rent, status, condition)
- `HostelBed` (id, room_id, bed_no, bed_type, status, current_occupant_id)
- `HostelAllocation` (id, student_id, hostel_id, room_id, bed_id, allocation_date, expected_deallocation_date, actual_deallocation_date, status, allocated_by)
- `HostelFeeStructure` (id, hostel_id, room_type, fee_category, amount, frequency, academic_year_id, effective_from, status)
- `HostelFee` (id, student_id, allocation_id, month, year, room_rent, mess_charges, amenities_charges, other_charges, total_amount, paid_amount, status, due_date)
- `HostelLeave` (id, student_id, leave_type, from_date, to_date, reason, destination, contact_no, applied_on, status, approved_by, approved_at, actual_return_date)
- `HostelVisitor` (id, hostel_id, student_id, visitor_name, relationship, phone, visit_date, in_time, out_time, purpose, approved_by)
- `HostelComplaint` (id, hostel_id, room_id, student_id, category, description, priority, status, assigned_to, resolved_at, resolution_notes, created_at)
- `HostelAttendance` (id, student_id, date, status, marked_by, marked_at, remarks)
- `HostelInventory` (id, hostel_id, room_id, item_name, quantity, condition, last_replaced, replacement_cost)

### User Roles
- **Hostel Warden**: Room management, student allocation, attendance, complaint management, visitor approval
- **Hostel Supervisor**: Allocation management, fee collection, leave approval, night attendance
- **Administrator**: Hostel configuration, fee structure, report access
- **Student**: Room view, leave application, complaint registration, fee view
- **Parent**: View child's hostel details, leave notifications, fee updates
- **Accountant**: Hostel fee billing, collection, and reconciliation
- **Housekeeping Staff**: Maintenance updates, cleaning schedule, inventory

### Business Rules & Constraints
- Room capacity must not be exceeded; over-allocation is prevented at the system level.
- Single-gender occupancy per room; mixed-gender floors require separate wings.
- Minimum age for hostel admission follows institutional policy (typically Grade 5 and above).
- Security deposit is refundable only after room condition inspection and damage assessment.
- Room change requests require warden approval and are processed on the 1st of each month.
- Night attendance must be marked between 9:00 PM and 10:00 PM daily.
- Students must apply for leave at least 24 hours in advance (except emergencies).
- Visitors are allowed only during visiting hours (configurable, default 4:00 PM - 7:00 PM).
- Mess fee is charged for the full month regardless of actual days stayed (fixed plan).
- Complaints must be acknowledged within 4 hours and resolved within 72 hours for standard priority.
- Damage to hostel property is charged at replacement cost + 20% administrative fee.
- Checkout clearance requires no pending dues, no damage charges, and library clearance.

---

## 10. Communication & Notifications

### Core Features

#### 10.1 Announcements & Notices
- Notice/announcement creation with rich text editor
- Target audience selection (school-wide, class-wise, group-wise, individual)
- Attachment support (documents, images)
- Priority levels (Urgent, High, Normal, Low)
- Scheduled publishing and auto-expiry
- Digital notice board display
- Acknowledgment tracking
- Pin important announcements

#### 10.2 Messaging System
- Internal messaging between users
- Group messaging (class groups, department groups, custom groups)
- Message templates for common communications
- Attachment support in messages
- Message read receipts
- Conversation threading
- Message search and archiving

#### 10.3 SMS Integration
- Bulk SMS to students, parents, staff
- SMS template management
- Automated SMS triggers (attendance absence, fee due, exam schedule, results)
- Delivery status tracking
- SMS provider integration (Twilio, MSG91, Textlocal, etc.)
- Unicode/multi-language SMS support
- Opt-out management

#### 10.4 Email Communication
- Bulk email campaigns
- Email template designer
- Automated email triggers
- Attachment support
- Email delivery tracking (opened, bounced, clicked)
- SMTP configuration per school
- CC/BCC support

#### 10.5 Push Notifications & In-App Notifications
- Real-time push notification to mobile app
- In-app notification center
- Notification preference management per user
- Notification scheduling
- Rich notifications with actions
- Unread notification badges

#### 10.6 Parent-Teacher Communication
- Dedicated parent-teacher messaging channel
- PTM (Parent-Teacher Meeting) scheduling
- Discussion thread per student
- Teacher availability display
- Meeting notes and action items
- Communication history per student

#### 10.7 Notice Board & Digital Display
- Digital notice board for common areas
- Auto-scrolling announcements
- Emergency alert override
- Display scheduling (time-based content)
- Multi-screen support

### Data Entities
- `Announcement` (id, title, content, attachment_url, target_type, target_ids, priority, published_by, published_at, expiry_date, is_pinned, requires_acknowledgment, created_at, updated_at)
- `AnnouncementAcknowledgment` (id, announcement_id, user_id, acknowledged_at, ip_address)
- `Message` (id, sender_id, receiver_id, subject, content, attachment_url, is_read, read_at, parent_message_id, thread_id, created_at)
- `MessageGroup` (id, name, description, created_by, type, member_count, created_at)
- `MessageGroupMember` (id, group_id, user_id, joined_at, is_admin)
- `SmsTemplate` (id, name, template_body, variables, category, status)
- `SmsLog` (id, template_id, recipient_phone, message_body, provider, provider_message_id, status, sent_at, delivered_at, failed_reason)
- `EmailTemplate` (id, name, subject, body_html, body_text, variables, category, status)
- `EmailLog` (id, template_id, recipient_email, subject, body, sent_at, opened_at, bounced_at, status)
- `Notification` (id, user_id, type, title, message, data_payload, is_read, read_at, action_url, created_at)
- `NotificationPreference` (id, user_id, notification_type, email_enabled, sms_enabled, push_enabled, in_app_enabled)
- `PtmSchedule` (id, academic_year_id, term_id, date, start_time, end_time, slot_duration, status)
- `PtmBooking` (id, ptm_schedule_id, teacher_id, parent_id, student_id, slot_time, status, meeting_notes, action_items, created_at)
- `CommunicationLog` (id, sender_id, receiver_type, receiver_id, channel, message_type, content, reference_id, sent_at, status)

### User Roles
- **Administrator**: All communication features, bulk messaging, template management
- **Academic Coordinator**: School-wide announcements, PTM scheduling
- **Class Teacher**: Class announcements, parent messaging, PTM participation
- **Subject Teacher**: Subject-related communication, parent messaging
- **Student**: Receive announcements, internal messaging, notification viewing
- **Parent**: Receive all communications, PTM booking, teacher messaging
- **System**: Automated trigger-based communications

### Business Rules & Constraints
- Announcements marked as `Urgent` bypass user quiet hours and send immediate notifications.
- Bulk SMS sending rate must not exceed provider limits (typically 10 messages/second).
- Users must be able to opt out of non-essential SMS; critical alerts cannot be opted out.
- Message retention policy: Messages retained for 2 years; archived messages accessible via search.
- Announcements requiring acknowledgment must track who has/has not acknowledged.
- PTM slots are available on first-come-first-served basis; maximum 2 slots per parent per PTM.
- Each user can belong to maximum 50 message groups.
- Failed SMS/Email notifications must be retried up to 3 times with exponential backoff.
- Notification preferences must be respected; system cannot override user preferences for non-critical notifications.
- Communication to minors (students under 18) must be CC'd to their registered parent/guardian.
- All bulk communications require admin approval if recipient count exceeds 100.
- Emergency alerts override all notification settings and are delivered via all channels simultaneously.

---

## 11. User Authentication & Authorization

### Core Features

#### 11.1 User Management
- User account creation (manual, bulk import, self-registration)
- User profile management
- Account activation/deactivation
- Password management (reset, change, strength enforcement)
- Account lockout after failed attempts
- Session management and timeout
- Multi-factor authentication (MFA/2FA)
- Passwordless login (magic link, OTP)
- Social login integration (Google, Microsoft)

#### 11.2 Role-Based Access Control (RBAC)
- Predefined roles: Super Admin, School Admin, Principal, Academic Coordinator, Teacher, Class Teacher, Student, Parent, Accountant, Librarian, Hostel Warden, Transport Manager, HR Manager, Admission Officer, System
- Custom role creation
- Permission matrix (module-level, feature-level, action-level)
- Role assignment with effective date and expiry
- Role hierarchy and inheritance
- Permission auditing and reporting

#### 11.3 Multi-Role Support
- Single user with multiple roles (e.g., Teacher + Class Teacher + Department Head)
- Context switching between roles
- Role-specific dashboard and navigation
- Permission intersection/union logic for multi-role users

#### 11.4 Single Sign-On (SSO)
- SAML 2.0 support
- OAuth 2.0 / OpenID Connect support
- LDAP/Active Directory integration
- Custom identity provider support
- SSO session management
- Just-in-time user provisioning

#### 11.5 API Authentication
- JWT token-based authentication
- Refresh token mechanism
- API key management for integrations
- OAuth 2.0 client credentials flow
- Token expiry and revocation
- Scope-based API access

#### 11.6 Security Features
- Account lockout policy (5 failed attempts = 30 min lockout)
- Password complexity requirements
- Password expiry policy (90 days)
- Concurrent session limits
- Login history and IP tracking
- Suspicious activity detection
- Force password reset on first login
- Secure password storage (bcrypt/Argon2)

### Data Entities
- `User` (id, username, email, phone, password_hash, user_type, status, email_verified, phone_verified, mfa_enabled, last_login_at, last_login_ip, login_count, created_at, updated_at)
- `Role` (id, name, code, description, is_system, hierarchy_level, status, created_at)
- `Permission` (id, name, code, module, description, action_type)
- `RolePermission` (id, role_id, permission_id, granted, created_by)
- `UserRole` (id, user_id, role_id, school_id, assigned_by, assigned_at, effective_from, effective_to, is_primary)
- `UserSession` (id, user_id, token_jti, device_info, ip_address, login_at, expires_at, logout_at, is_active)
- `LoginAttempt` (id, username, ip_address, attempted_at, success, failure_reason)
- `PasswordHistory` (id, user_id, password_hash, changed_at, changed_by)
- `MfaConfiguration` (id, user_id, mfa_type, secret, backup_codes, enabled_at, last_used_at)
- `ApiKey` (id, user_id, key_name, key_hash, scopes, expires_at, last_used_at, created_at, revoked_at)
- `SsoConfiguration` (id, school_id, provider, protocol, metadata_url, client_id, client_secret, enabled)

### User Roles
- **Super Admin**: Cross-school management, system configuration, user management across schools
- **School Admin**: School-level configuration, all modules within a school
- **Principal**: Academic oversight, staff management, approvals
- **Academic Coordinator**: Timetable, curriculum, examination management
- **Teacher**: Subject teaching, marks entry, lesson plans
- **Class Teacher**: Class management, student attendance, parent communication
- **Student**: View academic info, attendance, fees, library
- **Parent**: View linked student(s) information
- **Accountant**: Fee management, financial reports
- **Librarian**: Library management
- **Hostel Warden**: Hostel management
- **Transport Manager**: Transport management
- **HR Manager**: Staff recruitment, payroll, attendance
- **Admission Officer**: Admission processing
- **System**: Automated processes, integrations

### Business Rules & Constraints
- Username must be unique across the entire system.
- Email must be unique; phone number must be unique per school.
- Password must be minimum 8 characters with at least 1 uppercase, 1 lowercase, 1 number, and 1 special character.
- Password history: last 5 passwords cannot be reused.
- Account lockout after 5 consecutive failed login attempts; lockout duration 30 minutes.
- Maximum concurrent sessions per user: 3 (configurable).
- Session timeout: 30 minutes of inactivity (configurable).
- JWT access token expiry: 15 minutes; refresh token expiry: 7 days.
- API keys expire after 1 year unless renewed.
- Role assignment changes take effect on next login.
- System roles (Super Admin, System) cannot be modified or deleted.
- Permission changes require audit logging with before/after values.
- SSO users bypass local password but must complete profile on first login.
- Deactivated accounts cannot login; data access is read-only for 30 days before archival.
- MFA is mandatory for Admin, Accountant, and HR Manager roles.

---

## 12. Reports & Analytics

### Core Features

#### 12.1 Academic Reports
- Student performance report (subject-wise, term-wise, cumulative)
- Class performance comparison report
- Subject-wise pass/fail analysis
- Grade distribution report
- Top performer report (class-wise, school-wise)
- Result analysis report
- Exam-wise marks comparison
- Student progression tracking report

#### 12.2 Financial Reports
- Daily fee collection report
- Outstanding fee report with aging analysis
- Fee category-wise collection summary
- Scholarship disbursement report
- Salary expenditure report
- Transport fee collection report
- Hostel fee collection report
- Revenue vs expense summary
- Budget vs actual analysis

#### 12.3 Attendance Analytics
- Daily attendance summary
- Monthly attendance register
- Attendance trend analysis (individual, class, school)
- Absenteeism pattern detection
- Late arrival analysis
- Leave utilization report
- Attendance correlation with academic performance

#### 12.4 Admission & Enrollment Reports
- Admission statistics (applications, admissions, rejections)
- Enrollment trend analysis
- Class-wise strength report
- Category-wise enrollment distribution
- Gender-wise enrollment distribution
- Transfer in/out report
- Student attrition analysis

#### 12.5 Staff Reports
- Staff strength and distribution
- Department-wise staff report
- Teacher workload report
- Attendance summary report
- Leave balance report
- Payroll summary report
- Contract expiry report
- Recruitment pipeline report

#### 12.6 Library Reports
- Book inventory report
- Circulation statistics
- Popular books report
- Overdue books report
- Fine collection report
- Member activity report

#### 12.7 Transport Reports
- Route utilization report
- Vehicle occupancy report
- Transport fee collection
- Vehicle maintenance report
- Driver performance report
- Student transport assignment report

#### 12.8 Hostel Reports
- Occupancy report
- Room availability forecast
- Fee collection and outstanding
- Leave register
- Visitor log
- Complaint resolution

#### 12.9 Communication Reports
- Message delivery status
- SMS usage and cost
- Email delivery analytics
- Announcement reach and acknowledgment
- PTM participation report

#### 12.10 Custom Report Builder
- Drag-and-drop report builder interface
- Multi-source data selection
- Filter and condition configuration
- Column selection and ordering
- Aggregation functions (sum, count, average, min, max)
- Chart visualization (bar, line, pie, table)
- Report scheduling and auto-generation
- Export formats (PDF, Excel, CSV, Word)
- Saved report templates
- Scheduled email delivery of reports

#### 12.11 Dashboards
- Admin dashboard with KPI widgets
- Principal dashboard with academic overview
- Teacher dashboard with class summary
- Student dashboard with personal academic summary
- Parent dashboard with child summary
- Finance dashboard with collection trends
- Real-time data refresh
- Configurable dashboard layout

### Data Entities
- `ReportTemplate` (id, name, description, category, query_config, filter_config, column_config, chart_config, created_by, is_shared, created_at)
- `ScheduledReport` (id, template_id, frequency, day_of_week, day_of_month, time, recipients, format, last_run_at, next_run_at, is_active)
- `ReportExecution` (id, scheduled_report_id, executed_at, status, file_url, record_count, execution_time_ms)
- `DashboardWidget` (id, name, widget_type, data_source, config, position_x, position_y, width, height, refresh_interval)
- `UserDashboard` (id, user_id, layout_config, created_at, updated_at)
- `AnalyticsCache` (id, metric_name, metric_value, dimensions, calculated_at, expires_at)

### User Roles
- **Administrator**: All reports, custom report builder, dashboard configuration
- **Principal/Headmaster**: Academic reports, staff reports, financial summary
- **Academic Coordinator**: Academic analytics, examination reports, attendance reports
- **Finance Manager**: All financial reports, revenue analytics
- **Class Teacher**: Class-level academic and attendance reports
- **Department Head**: Department-wise academic reports
- **HR Manager**: Staff reports, payroll reports, attendance reports
- **Accountant**: Financial reports, collection reports
- **Librarian**: Library reports
- **Transport Manager**: Transport reports
- **Hostel Warden**: Hostel reports

### Business Rules & Constraints
- Reports containing financial data require Finance Manager or Admin role access.
- Reports with student personal data are subject to FERPA/GDPR access controls.
- Custom report queries must timeout after 60 seconds to prevent database overload.
- Scheduled reports cannot be generated more frequently than once per hour.
- Dashboard widgets refresh maximum every 5 minutes for real-time data.
- Report exports are limited to 100,000 records per export; larger datasets require scheduled report generation.
- Analytics cache expires after 1 hour for real-time metrics, 24 hours for summary metrics.
- Report templates can be shared across users of the same or lower role hierarchy.
- Deleted records must be excluded from all reports unless explicitly requested via archival filter.
- All report generation activities must be logged with user ID, timestamp, and report type for audit purposes.
- Financial reports use the accrual basis of accounting unless cash basis is explicitly configured.
- Year-over-year comparison reports require minimum 2 completed academic years of data.

---

## 13. System Administration

### Core Features

#### 13.1 General Settings
- School profile and branding configuration
- Academic calendar settings
- Session and timeout configuration
- Date, time, timezone, and locale settings
- Currency and number format settings
- Notification settings (default channels, frequency)
- Grade scale and passing criteria configuration
- Attendance rules configuration
- Fee rules and late fine configuration
- Leave rules configuration
- Email/SMS gateway configuration
- Payment gateway configuration
- API integration settings

#### 13.2 Data Management
- Data import via CSV/Excel (students, staff, subjects, marks, attendance, fees)
- Import template download with validation rules
- Import preview and error reporting
- Batch data correction tools
- Data export (selective, full, filtered)
- Data archival and purging
- Database backup scheduling (daily, weekly, monthly)
- Backup encryption and storage management
- Point-in-time recovery capability
- Data migration tools

#### 13.3 Audit Logs
- Comprehensive audit trail for all CRUD operations
- User action logging with IP address and timestamp
- Data change tracking (before/after values)
- Login/logout tracking
- Failed attempt logging
- Sensitive data access logging
- Audit log search and filtering
- Audit log retention policy management
- Tamper-proof audit log storage

#### 13.4 Multi-School Support
- School creation and onboarding
- School-level configuration isolation
- Cross-school user management (Super Admin)
- School-level subscription/plan management
- White-labeling and branding per school
- Data isolation between schools (strict tenant separation)
- School-level report aggregation
- Inter-school student transfer support

#### 13.5 System Health & Monitoring
- Application performance monitoring
- Database performance metrics
- API endpoint health checks
- Error logging and alerting
- Disk space and resource monitoring
- Background job monitoring
- Integration health status
- System status page

#### 13.6 Notification & Communication Settings
- Email template management
- SMS template management
- Notification trigger configuration
- Communication channel priority settings
- Automated reminder schedules
- Communication log archival

#### 13.7 Security Settings
- Password policy configuration
- Session management settings
- IP whitelist/blacklist
- Two-factor authentication enforcement per role
- API rate limiting configuration
- CORS policy management
- SSL/TLS certificate management
- Security audit scheduling

### Data Entities
- `School` (id, name, code, address, phone, email, website, logo_url, board_type, established_year, registration_no, status, subscription_plan, subscription_expiry, created_at)
- `SchoolSettings` (id, school_id, category, key, value, description, modified_by, modified_at)
- `SystemSetting` (id, category, key, value, description, is_editable, modified_by, modified_at)
- `AuditLog` (id, school_id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, performed_at)
- `BackupLog` (id, school_id, backup_type, file_path, file_size, status, started_at, completed_at, error_message)
- `DataImportLog` (id, school_id, import_type, file_name, total_records, success_count, failure_count, error_details, imported_by, imported_at, status)
- `DataExportLog` (id, school_id, export_type, file_name, record_count, filters_applied, exported_by, exported_at, status)
- `ScheduledJob` (id, name, description, cron_expression, job_type, last_run_at, next_run_at, status, failure_count, last_error)
- `IntegrationConfig` (id, school_id, integration_type, provider, config_json, credentials_encrypted, enabled, last_tested_at, status)
- `ErrorLog` (id, school_id, error_code, message, stack_trace, severity, module, user_id, created_at)
- `SystemHealth` (id, check_name, status, response_time_ms, checked_at, details)

### User Roles
- **Super Admin**: Cross-school management, system configuration, user management, subscription management
- **School Admin**: School-level settings, data import/export, backup management, audit log viewing
- **System**: Automated jobs, backup, monitoring, notifications
- **Support Staff**: Limited access for troubleshooting, view-only on most modules

### Business Rules & Constraints
- School data must be strictly isolated; no cross-school data access except for Super Admin.
- Audit logs must be immutable; no modification or deletion allowed by any role.
- Audit log retention: Minimum 7 years for financial transactions, 3 years for academic data, 1 year for system logs.
- Database backups must be automated daily with 30-day retention, weekly with 90-day retention, monthly with 1-year retention.
- Backup files must be encrypted with AES-256 before storage.
- Data import files must be validated before processing; invalid records must be reported without partial import.
- System settings changes require confirmation and are logged with before/after values.
- Multi-school mode must support minimum 1,000 schools per deployment without performance degradation.
- Scheduled jobs must have a maximum execution window; jobs exceeding the window are flagged and killed.
- SSL/TLS certificates must be auto-renewed 30 days before expiry.
- Failed login attempts from the same IP exceeding 20 per hour trigger automatic IP block for 1 hour.
- Data export of more than 10,000 records requires admin approval.
- System health checks run every 5 minutes; alerts trigger after 2 consecutive failures.

---

## 14. API Design Requirements

### Core Features

#### 14.1 RESTful API Design
- Resource-oriented URL structure (`/api/v1/students`, `/api/v1/students/:id`)
- Standard HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Proper HTTP status codes (200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500)
- JSON request/response format
- HATEOAS support for discoverability
- Request validation and sanitization
- Consistent error response format with error codes and messages
- Request ID tracking for debugging

#### 14.2 Authentication & Security
- JWT-based authentication
- Token refresh mechanism
- API key authentication for integrations
- OAuth 2.0 authorization code flow
- Request signing for webhooks
- HTTPS enforcement
- CORS configuration
- Content Security Policy headers
- Input validation and SQL injection prevention
- XSS protection
- CSRF token validation for state-changing operations

#### 14.3 Rate Limiting & Throttling
- Tiered rate limits by user role (Admin: 10,000/hr, Teacher: 5,000/hr, Student: 1,000/hr)
- Endpoint-specific rate limits
- Burst allowance configuration
- Rate limit headers in responses (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
- Rate limit exceeded response (429 status with Retry-After header)
- IP-based rate limiting for unauthenticated endpoints

#### 14.4 API Versioning
- URL-based versioning (`/api/v1/`, `/api/v2/`)
- Version deprecation strategy (minimum 6 months notice)
- Backward compatibility maintenance
- Version migration documentation
- Sunset headers for deprecated versions

#### 14.5 Pagination & Filtering
- Cursor-based pagination for large datasets
- Offset-based pagination for smaller datasets
- Default page size: 20, maximum: 100
- Sorting support (`sort=-created_at` for descending)
- Field selection support (`fields=id,name,email`)
- Advanced filtering operators (eq, ne, gt, gte, lt, lte, in, contains, startsWith, between)
- Search query parameter support
- Filter combination with AND/OR logic

#### 14.6 API Documentation
- OpenAPI 3.0 specification
- Interactive Swagger UI documentation
- Request/response examples
- Authentication instructions
- Error code reference
- Rate limit documentation
- Changelog tracking

#### 14.7 Webhook Support
- Webhook subscription management
- Event-based webhook triggers
- Webhook retry mechanism (exponential backoff, max 5 retries)
- Webhook signature verification
- Delivery status tracking
- Webhook payload format standardization

#### 14.8 API Endpoints Summary (By Module)

##### Student Management
- `GET /api/v1/students` — List students with pagination and filters
- `GET /api/v1/students/:id` — Get student details
- `POST /api/v1/students` — Create new student
- `PUT /api/v1/students/:id` — Update student details
- `PATCH /api/v1/students/:id/status` — Update student status
- `GET /api/v1/students/:id/guardians` — List student guardians
- `POST /api/v1/students/:id/guardians` — Add guardian
- `GET /api/v1/students/:id/documents` — List student documents
- `POST /api/v1/students/:id/documents` — Upload document
- `GET /api/v1/students/:id/attendance` — Get student attendance
- `GET /api/v1/students/:id/fees` — Get student fee details
- `GET /api/v1/students/:id/marks` — Get student marks
- `POST /api/v1/students/bulk-import` — Bulk import students
- `GET /api/v1/students/:id/report-card` — Get report card

##### Teacher/Staff Management
- `GET /api/v1/staff` — List staff members
- `GET /api/v1/staff/:id` — Get staff details
- `POST /api/v1/staff` — Create staff record
- `PUT /api/v1/staff/:id` — Update staff details
- `GET /api/v1/staff/:id/attendance` — Get staff attendance
- `POST /api/v1/staff/:id/leave` — Apply for leave
- `GET /api/v1/staff/:id/leaves` — Get leave history
- `GET /api/v1/staff/:id/payslips` — Get payslip history
- `GET /api/v1/staff/:id/salary-structure` — Get salary structure
- `POST /api/v1/staff/bulk-import` — Bulk import staff

##### Academic Management
- `GET /api/v1/classes` — List classes
- `GET /api/v1/classes/:id/sections` — Get class sections
- `GET /api/v1/sections/:id/students` — Get section students
- `GET /api/v1/sections/:id/timetable` — Get section timetable
- `GET /api/v1/subjects` — List subjects
- `GET /api/v1/academic-years` — List academic years
- `GET /api/v1/academic-years/:id/terms` — Get terms
- `POST /api/v1/timetables` — Create timetable
- `GET /api/v1/timetables/:id` — Get timetable
- `GET /api/v1/lesson-plans` — List lesson plans
- `POST /api/v1/lesson-plans` — Create lesson plan
- `POST /api/v1/promotions` — Process student promotions

##### Attendance Management
- `POST /api/v1/attendance/students` — Mark student attendance (bulk)
- `GET /api/v1/attendance/students` — Get student attendance records
- `POST /api/v1/attendance/staff` — Mark staff attendance
- `GET /api/v1/attendance/staff` — Get staff attendance records
- `GET /api/v1/attendance/summary` — Get attendance summary
- `POST /api/v1/attendance/regularize` — Request attendance regularization
- `GET /api/v1/attendance/defaulters` — Get attendance defaulters list

##### Examination & Grading
- `GET /api/v1/exams` — List exams
- `POST /api/v1/exams` — Create exam
- `GET /api/v1/exams/:id/schedule` — Get exam schedule
- `POST /api/v1/exams/:id/marks` — Enter marks
- `GET /api/v1/exams/:id/marks` — Get marks
- `GET /api/v1/grade-scales` — List grade scales
- `GET /api/v1/report-cards` — List report cards
- `GET /api/v1/report-cards/:id` — Get report card
- `POST /api/v1/report-cards/generate` — Generate report cards
- `POST /api/v1/reevaluation` — Request re-evaluation

##### Fee & Finance Management
- `GET /api/v1/fee-categories` — List fee categories
- `GET /api/v1/fee-structures` — List fee structures
- `POST /api/v1/fee-structures` — Create fee structure
- `GET /api/v1/students/:id/fee-invoices` — Get student invoices
- `POST /api/v1/fee-payments` — Record fee payment
- `GET /api/v1/fee-receipts/:id` — Get receipt
- `GET /api/v1/fee-reports/collection` — Fee collection report
- `GET /api/v1/fee-reports/outstanding` — Outstanding fees report
- `GET /api/v1/scholarships` — List scholarships
- `POST /api/v1/scholarships` — Create scholarship scheme

##### Library Management
- `GET /api/v1/books` — Search books
- `GET /api/v1/books/:id` — Get book details
- `POST /api/v1/books` — Add book
- `POST /api/v1/book-issues` — Issue book
- `POST /api/v1/book-issues/:id/return` — Return book
- `GET /api/v1/book-issues` — List issued books
- `POST /api/v1/book-reservations` — Reserve book
- `GET /api/v1/library/fines` — Get fine details
- `POST /api/v1/library/fines/:id/pay` — Pay fine
- `GET /api/v1/library/reports/circulation` — Circulation report

##### Transport Management
- `GET /api/v1/transport-routes` — List routes
- `POST /api/v1/transport-routes` — Create route
- `GET /api/v1/vehicles` — List vehicles
- `POST /api/v1/vehicles` — Add vehicle
- `GET /api/v1/vehicles/:id/gps-tracking` — Get GPS tracking
- `POST /api/v1/student-transport` — Assign transport
- `GET /api/v1/student-transport/:id` — Get transport assignment
- `GET /api/v1/transport/reports/utilization` — Route utilization report

##### Hostel Management
- `GET /api/v1/hostels` — List hostels
- `GET /api/v1/hostels/:id/rooms` — Get hostel rooms
- `POST /api/v1/hostel-allocations` — Allocate room
- `GET /api/v1/hostel-allocations` — List allocations
- `POST /api/v1/hostel-leaves` — Apply for hostel leave
- `GET /api/v1/hostel-fees` — Get hostel fee details
- `POST /api/v1/hostel-complaints` — Register complaint
- `GET /api/v1/hostel/reports/occupancy` — Occupancy report

##### Communication
- `GET /api/v1/announcements` — List announcements
- `POST /api/v1/announcements` — Create announcement
- `GET /api/v1/messages` — Get messages
- `POST /api/v1/messages` — Send message
- `POST /api/v1/sms/send` — Send SMS
- `POST /api/v1/emails/send` — Send email
- `GET /api/v1/notifications` — Get notifications
- `PUT /api/v1/notifications/:id/read` — Mark notification as read
- `GET /api/v1/ptm-schedules` — Get PTM schedules
- `POST /api/v1/ptm-bookings` — Book PTM slot

##### Authentication & Authorization
- `POST /api/v1/auth/login` — User login
- `POST /api/v1/auth/register` — User registration
- `POST /api/v1/auth/refresh` — Refresh token
- `POST /api/v1/auth/logout` — User logout
- `POST /api/v1/auth/forgot-password` — Forgot password
- `POST /api/v1/auth/reset-password` — Reset password
- `POST /api/v1/auth/verify-email` — Verify email
- `POST /api/v1/auth/mfa/setup` — Setup MFA
- `POST /api/v1/auth/mfa/verify` — Verify MFA
- `GET /api/v1/auth/me` — Get current user
- `PUT /api/v1/auth/me` — Update profile

##### Reports & Analytics
- `GET /api/v1/reports` — List available reports
- `POST /api/v1/reports/execute` — Execute report
- `GET /api/v1/reports/:id` — Get report result
- `GET /api/v1/reports/templates` — List report templates
- `POST /api/v1/reports/templates` — Create report template
- `GET /api/v1/dashboard` — Get dashboard data
- `GET /api/v1/dashboard/widgets` — Get dashboard widgets

##### Administration
- `GET /api/v1/settings` — Get settings
- `PUT /api/v1/settings` — Update settings
- `POST /api/v1/data/import` — Import data
- `POST /api/v1/data/export` — Export data
- `GET /api/v1/audit-logs` — Get audit logs
- `GET /api/v1/backups` — List backups
- `POST /api/v1/backups` — Trigger backup
- `GET /api/v1/schools` — List schools (Super Admin)
- `POST /api/v1/schools` — Create school

### Business Rules & Constraints
- All API requests must include valid authentication headers; unauthenticated requests return 401.
- API rate limits are enforced per user per hour; exceeding limits returns 429 with Retry-After.
- Data returned is filtered by the user's school context; cross-school data access requires Super Admin role.
- Bulk operations are limited to 1,000 records per request.
- File uploads are limited to 10MB per file; allowed types: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX.
- DELETE operations on core entities perform soft delete; hard delete requires Super Admin and is logged.
- API responses must not expose sensitive fields (password hashes, secret keys, full card numbers).
- Webhook payloads must be signed with HMAC-SHA256 for integrity verification.
- API versioning must maintain backward compatibility for at least 2 major versions.
- All POST/PUT/PATCH requests must include CSRF token for browser-based clients.
- API endpoints for student data require student-specific authorization or parent/guardian linkage.
- Batch imports must be processed asynchronously with status tracking endpoint.
- File download endpoints must support range requests for resumable downloads.

---

## 15. Database Requirements

### Core Features

#### 15.1 Database Design Principles
- Normalized schema (3NF) for transactional data
- Denormalized views/materialized views for reporting
- Soft delete pattern for data retention
- Optimistic locking for concurrent updates
- Multi-tenancy support (school_id isolation)
- Audit columns on all tables (created_at, updated_at, created_by, updated_by)
- Comprehensive indexing strategy
- Partitioning for large tables (attendance, audit logs)

#### 15.2 Core Schema Structure

##### Student Domain Tables
- `students` — Core student information
- `student_addresses` — Address history
- `guardians` — Parent/guardian information
- `student_documents` — Uploaded documents
- `admission_applications` — Admission workflow
- `student_transfers` — Transfer records
- `student_withdrawals` — Withdrawal records

##### Staff Domain Tables
- `staff` — Core staff information
- `staff_qualifications` — Educational qualifications
- `staff_experience` — Work history
- `staff_contracts` — Employment contracts
- `staff_attendance` — Daily attendance
- `staff_leaves` — Leave applications
- `salary_structures` — Salary configurations
- `salary_slips` — Monthly payslips

##### Academic Domain Tables
- `classes` — Class definitions
- `sections` — Section definitions
- `subjects` — Subject catalog
- `class_subjects` — Class-subject-teacher mapping
- `academic_years` — Academic year definitions
- `terms` — Term/semester definitions
- `curriculums` — Curriculum documents
- `lesson_plans` — Teacher lesson plans
- `timetables` and `timetable_entries` — Schedule data
- `promotions` — Student promotion records

##### Attendance Domain Tables
- `student_attendance` — Daily attendance records
- `attendance_summaries` — Pre-calculated summaries
- `attendance_regularizations` — Change requests
- `attendance_threshold_alerts` — Alert records

##### Examination Domain Tables
- `exam_types` — Exam type definitions
- `exam_sessions` — Exam period definitions
- `exam_schedules` — Exam timetable
- `exam_results` — Student marks
- `grade_scales` — Grade configuration
- `report_cards` and `report_card_details` — Report card data
- `reevaluation_requests` — Re-evaluation workflow

##### Fee Domain Tables
- `fee_categories` — Fee type definitions
- `fee_structures` — Fee amounts
- `student_fees` — Student fee assignments
- `fee_invoices` and `fee_invoice_items` — Invoice data
- `fee_receipts` — Payment records
- `fee_concessions` — Discounts/concessions
- `scholarship_schemes` and `student_scholarships` — Scholarship data

##### Library Domain Tables
- `books` and `book_copies` — Catalog data
- `book_categories` — Classification
- `book_issues` — Circulation records
- `book_reservations` — Reservation queue
- `library_fine_configs` and `library_fine_transactions` — Fine data

##### Transport Domain Tables
- `transport_routes` and `route_stops` — Route definitions
- `vehicles` — Vehicle fleet
- `drivers` — Driver assignments
- `student_transport` — Student assignments
- `transport_fees` — Fee records
- `gps_tracking_logs` — Location data

##### Hostel Domain Tables
- `hostels` and `hostel_rooms` — Infrastructure
- `hostel_beds` — Bed inventory
- `hostel_allocations` — Student assignments
- `hostel_fees` — Fee records
- `hostel_leaves` — Leave records
- `hostel_visitors` — Visitor log
- `hostel_complaints` — Maintenance requests

##### Communication Domain Tables
- `announcements` and `announcement_acknowledgments` — Notice data
- `messages` and `message_groups` — Internal messaging
- `sms_templates` and `sms_logs` — SMS data
- `email_templates` and `email_logs` — Email data
- `notifications` — In-app notifications
- `ptm_schedules` and `ptm_bookings` — PTM data

##### Auth Domain Tables
- `users` — Authentication accounts
- `roles` and `permissions` — RBAC definitions
- `user_roles` — Role assignments
- `user_sessions` — Active sessions
- `login_attempts` — Security tracking
- `api_keys` — Integration keys

##### System Domain Tables
- `schools` — Multi-tenancy
- `school_settings` and `system_settings` — Configuration
- `audit_logs` — Activity tracking
- `backup_logs` — Backup history
- `scheduled_jobs` — Background tasks
- `error_logs` — Error tracking

#### 15.3 Relationships
- One School -> Many Students, Staff, Classes, Users
- One Student -> Many Guardians, Addresses, Documents, AttendanceRecords, FeeInvoices, ExamResults
- One Staff -> Many Qualifications, ExperienceRecords, AttendanceRecords, LeaveRecords, SalarySlips
- One Class -> Many Sections
- One Section -> Many Students (via enrollment), Many TimetableEntries
- One Subject -> Many ClassSubjects, Many ExamSchedules, Many ExamResults
- One Academic Year -> Many Terms, Many Classes, Many Sections, Many FeeStructures
- One Student -> One HostelAllocation (active), One TransportAssignment (active)
- One User -> Many Roles, Many Sessions, Many Notifications
- One Role -> Many Permissions
- One Book -> Many BookCopies
- One BookCopy -> Many BookIssues

#### 15.4 Performance Considerations
- Read replicas for reporting queries
- Connection pooling (minimum 10, maximum 100 connections)
- Query timeout: 30 seconds for web requests, 5 minutes for reports
- Indexing on all foreign keys, search fields, and frequently filtered columns
- Composite indexes on common query patterns (school_id + status + created_at)
- Materialized views for dashboard aggregates refreshed every 15 minutes
- Database partitioning by school_id for large installations
- Archive tables for data older than 2 academic years
- Full-text search indexes on student names, book titles, staff names
- Redis caching for frequently accessed data (sessions, settings, lookups)
- Cache invalidation strategy for real-time data

#### 15.5 Data Integrity & Constraints
- Foreign key constraints on all relationships
- Unique constraints on natural keys (email, phone, roll_no, admission_no, employee_id)
- Check constraints on numeric ranges (percentage 0-100, marks >= 0)
- Not null constraints on required fields
- Default values for optional fields
- Cascade rules: soft delete propagates, hard delete blocks if children exist
- Trigger-based audit logging on sensitive tables
- Database-level validation for critical business rules

### Business Rules & Constraints
- All tables must include `school_id` for multi-tenancy isolation.
- Soft delete is implemented via `deleted_at` timestamp; records with non-null `deleted_at` are excluded from normal queries.
- No orphaned records: Foreign key relationships enforce referential integrity.
- Audit logs are written asynchronously to prevent performance impact on transactions.
- Database migrations must be backward-compatible; no destructive changes in production without data migration scripts.
- Read-heavy tables (attendance, exam results) should have read replicas configured.
- Backup must be taken before any schema migration in production.
- Maximum row size must not exceed 8KB for InnoDB tables.
- JSON columns used sparingly only for truly schemaless data (settings, configurations).
- Enum types used for status fields with defined valid values.
- All monetary amounts stored as DECIMAL(12,2) to prevent floating-point errors.
- Date/time stored in UTC; converted to local timezone at application layer.
- Text search uses database full-text indexes; complex search delegated to Elasticsearch for advanced use cases.

---

## 16. Frontend Requirements

### Core Features

#### 16.1 React Component Architecture
- Component-based architecture with functional components
- Custom hooks for reusable logic (useAuth, useFetch, useForm, usePagination, useSearch)
- Higher-Order Components (HOCs) for role-based rendering
- Compound component patterns for complex UI (DataTable, FormWizard, FilterPanel)
- Reusable UI component library (Button, Card, Modal, Table, Form, Tabs, Accordion, Breadcrumbs, Pagination, Toast)
- Layout components (Sidebar, Navbar, Footer, ContentArea)
- Page-specific component organization
- Lazy loading and code splitting for route-based chunks
- Error boundary components for graceful error handling

#### 16.2 State Management
- Redux Toolkit for global state (auth, user, school, settings, notifications)
- RTK Query for server state management and caching
- React Context for theme, locale, and UI state
- Local component state with useState/useReducer
- Form state management with React Hook Form
- Optimistic updates for better UX
- State persistence for critical data (auth tokens in httpOnly cookies, preferences in localStorage)
- State hydration after SSR/page reload

#### 16.3 Responsive Design
- Mobile-first responsive design approach
- Breakpoints: xs (<576px), sm (576px), md (768px), lg (992px), xl (1200px), xxl (1400px)
- Responsive grid system
- Collapsible sidebar for mobile view
- Touch-friendly interface elements (minimum 44px touch targets)
- Responsive tables with horizontal scroll and card view for mobile
- Adaptive forms (single column mobile, multi-column desktop)
- Responsive image handling
- Print-friendly stylesheet for reports and receipts

#### 16.4 Role-Based Views & Navigation
- Dynamic navigation menu based on user roles and permissions
- Route guards for unauthorized access prevention
- Conditional rendering of UI elements based on permissions
- Role-specific dashboards
- Feature flags for module enable/disable
- School-specific customization support
- White-labeling support (logo, colors, branding)

#### 16.5 Dashboards
- **Admin Dashboard**: Total students, staff count, fee collection chart, attendance summary, pending approvals, recent activities, announcements
- **Principal Dashboard**: Academic performance overview, exam results summary, staff attendance, admission statistics, complaint summary
- **Teacher Dashboard**: Class strength, today's timetable, pending attendance, pending marks entry, leave balance, messages
- **Student Dashboard**: Today's timetable, attendance percentage, upcoming exams, fee status, recent marks, announcements
- **Parent Dashboard**: Child summary cards, attendance, fee dues, exam results, teacher communications, announcements
- **Accountant Dashboard**: Daily collection, outstanding fees, recent transactions, bank reconciliation status
- **Librarian Dashboard**: Books issued today, overdue books, fine collection, popular books, new arrivals
- **HR Dashboard**: Staff count, attendance summary, pending leaves, contract expiries, payroll status

#### 16.6 Forms & Data Entry
- Form validation with real-time feedback
- Multi-step wizards for complex flows (admission, payroll)
- Auto-save for long forms
- Duplicate detection alerts
- Bulk data entry interfaces
- CSV/Excel upload with preview and validation
- Rich text editor for announcements and lesson plans
- Date picker with academic year context
- Searchable dropdowns for large datasets
- File upload with drag-and-drop and preview

#### 16.7 Data Visualization
- Charts: Line (trends), Bar (comparisons), Pie (distributions), Area (cumulative), Radar (multi-dimensional)
- Tables: Sortable, filterable, paginated, column visibility toggle, export to Excel/PDF
- Calendar views: Academic calendar, timetable view, event calendar
- Kanban boards: Task/status tracking
- Gantt charts: Project/timeline views
- Maps: Route visualization, stop locations
- Real-time widgets: GPS tracking, attendance counters
- Chart library: Chart.js / Recharts with responsive sizing

#### 16.8 User Experience (UX)
- Loading skeletons and spinners
- Toast notifications for action feedback
- Confirmation dialogs for destructive actions
- Keyboard shortcuts for power users
- Auto-complete and search-as-you-type
- Breadcrumb navigation
- Contextual help and tooltips
- Empty states with actionable guidance
- Error pages (404, 403, 500) with helpful messaging
- Accessibility: ARIA labels, keyboard navigation, screen reader support, color contrast (WCAG 2.1 AA)

#### 16.9 Internationalization (i18n)
- Multi-language support framework (react-i18next)
- RTL language support (Arabic, Urdu, Hebrew)
- Date, time, number, and currency formatting per locale
- Dynamic language switching without page reload
- Language preference persistence
- Translation management system integration

#### 16.10 PWA & Mobile App Support
- Progressive Web App configuration
- Service worker for offline capability
- Push notification support
- Home screen installation
- Responsive mobile interface
- Touch gesture support
- Offline data sync for critical features

### Business Rules & Constraints
- All API calls must include authentication token; expired tokens trigger silent refresh.
- Client-side route guards must align with server-side permission checks.
- Forms must validate before submission; server validation results displayed inline.
- File uploads show progress bar and cancel option.
- Bulk operations show progress indicator and allow cancellation.
- Session timeout warning shown 5 minutes before expiry with option to extend.
- Unsaved form changes trigger browser beforeunload warning.
- Print layouts must include school header, date, and page numbers.
- Dashboard data refreshes automatically every 5 minutes for real-time widgets.
- Mobile interface must support all core features available on desktop.
- Maximum 100 items per page in tables; larger datasets require filtering.
- Search results must return within 2 seconds; debounce search input by 300ms.
- All CRUD operations must show success/error feedback within 3 seconds.
- The application must load initial page within 3 seconds on standard broadband.
- Offline mode allows viewing cached data; data entry queued for sync.

---

## 17. Non-Functional Requirements

### 17.1 Security Requirements

#### Data Protection
- All data in transit encrypted using TLS 1.3
- Sensitive data at rest encrypted using AES-256
- Password hashing using bcrypt with cost factor 12
- API keys and credentials stored encrypted
- Personal data minimization and purpose limitation
- Data anonymization for analytics and reporting
- Secure session management with httpOnly, secure, SameSite cookies
- CSRF protection on all state-changing operations
- XSS prevention through output encoding and Content Security Policy
- SQL injection prevention through parameterized queries

#### Access Control
- Role-based access control (RBAC) with principle of least privilege
- Multi-factor authentication for privileged roles
- Account lockout after failed login attempts
- Concurrent session limits per user
- IP-based access restrictions configurable
- API key rotation policy (minimum every 90 days)
- Privileged operation approval workflows
- Regular access review and recertification

#### Audit & Compliance
- Comprehensive audit logging of all data access and modifications
- Immutable audit trail with integrity verification
- Regular security audits and penetration testing (annually)
- Vulnerability scanning (monthly automated, quarterly manual)
- Security incident response plan
- Data breach notification procedures

#### FERPA Compliance (US)
- Student education records protected from unauthorized disclosure
- Directory information management with opt-out support
- Parent/guardian access rights to student records
- Consent management for third-party data sharing
- Record amendment request workflow
- Annual FERPA notification to parents/students
- Training for staff on FERPA requirements

#### GDPR Compliance (EU)
- Lawful basis identification for all data processing
- Consent management with granular options
- Right to access: Data export in machine-readable format
- Right to rectification: Profile and data correction
- Right to erasure: Account deletion with data purging
- Right to restrict processing: Opt-out mechanisms
- Data portability: Export in standard formats
- Privacy by design and default
- Data Protection Impact Assessment (DPIA) for high-risk processing
- Data Processing Agreements (DPA) with subprocessors
- Appointment of Data Protection Officer (if applicable)
- Cross-border data transfer safeguards

### 17.2 Performance Requirements
- **Page Load Time**: Initial page load under 3 seconds; subsequent navigations under 1 second
- **API Response Time**: 95th percentile under 500ms for standard queries; under 2 seconds for complex reports
- **Concurrent Users**: Support minimum 5,000 concurrent users per school
- **Database Queries**: Simple queries under 100ms; complex joins under 500ms
- **File Upload**: Support uploads up to 10MB with progress tracking
- **Report Generation**: Standard reports under 10 seconds; complex reports under 60 seconds
- **Search Results**: Return within 2 seconds for all search types
- **Bulk Operations**: Process 1,000 records per batch within 30 seconds
- **Image Processing**: Thumbnail generation under 2 seconds
- **PDF Generation**: Single report card under 3 seconds; bulk generation 100 records per minute
- **Notification Delivery**: SMS delivery within 5 minutes; email within 10 minutes; push within 1 minute
- **Cache Hit Ratio**: Minimum 80% for cached data
- **Uptime**: 99.9% availability (maximum 8.76 hours downtime per year)

### 17.3 Scalability Requirements
- **Horizontal Scaling**: Application servers scale horizontally with load balancer
- **Database Scaling**: Read replicas for query distribution; sharding support for multi-tenant growth
- **Caching Layer**: Redis cluster for session storage and data caching
- **CDN**: Static assets served via CDN for global performance
- **Auto-scaling**: Automatic resource scaling based on CPU/memory/load metrics
- **Microservices Readiness**: Modular architecture allowing future decomposition
- **Message Queue**: Background job processing via message queue (Redis/RabbitMQ)
- **Storage Scaling**: Cloud storage (S3/MinIO) for files with unlimited capacity
- **Multi-tenant Architecture**: Support 1,000+ schools per deployment
- **Student Capacity**: Support 100,000+ students per school
- **Data Growth**: Handle 10TB+ data per deployment with archiving strategy

### 17.4 Availability & Reliability
- **Uptime SLA**: 99.9% uptime guarantee
- **Scheduled Maintenance**: Maximum 4-hour maintenance window monthly, announced 7 days in advance
- **Disaster Recovery**: RPO (Recovery Point Objective) of 1 hour; RTO (Recovery Time Objective) of 4 hours
- **Backup Strategy**: Daily automated backups with 30-day retention; point-in-time recovery
- **Failover**: Automatic failover to standby systems within 5 minutes
- **Health Monitoring**: Continuous health checks with automated alerting
- **Incident Response**: 24/7 monitoring with escalation procedures
- **Graceful Degradation**: Non-critical features degrade gracefully under high load
- **Circuit Breaker**: API integrations use circuit breaker pattern for resilience

### 17.5 Maintainability Requirements
- **Code Quality**: ESLint/Prettier enforced; minimum 80% test coverage
- **Documentation**: API documentation (OpenAPI), code comments, architecture diagrams
- **Logging**: Structured logging with correlation IDs; 3 log levels (INFO, WARN, ERROR)
- **Monitoring**: Application Performance Monitoring (APM) with distributed tracing
- **Error Tracking**: Centralized error tracking with alerting
- **Deployment**: CI/CD pipeline with automated testing and deployment
- **Environment Management**: Separate dev, staging, production environments
- **Feature Flags**: Feature toggle system for gradual rollout
- **Version Control**: Git-based with branch protection and code review
- **Dependency Management**: Regular dependency updates with vulnerability scanning

### 17.6 Usability Requirements
- **Browser Support**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Device Support**: Desktop, tablet, and mobile responsive
- **Accessibility**: WCAG 2.1 AA compliance
- **Keyboard Navigation**: Full functionality accessible via keyboard
- **Screen Reader**: Compatible with NVDA, JAWS, VoiceOver
- **Color Contrast**: Minimum 4.5:1 for normal text, 3:1 for large text
- **Font Size**: Scalable up to 200% without content loss
- **Language Support**: English default; support for major languages
- **Onboarding**: Guided tour for first-time users
- **Help System**: Contextual help, FAQ, user manual
- **Error Messages**: Clear, actionable error messages in user language

### 17.7 Interoperability Requirements
- **API Standards**: RESTful API with JSON format
- **Authentication Standards**: OAuth 2.0, OpenID Connect, SAML 2.0
- **Data Exchange**: CSV, Excel, PDF export; CSV, Excel import
- **Calendar Integration**: iCal export for timetables and events
- **SMS Gateway**: Pluggable provider architecture (Twilio, MSG91, etc.)
- **Email Service**: SMTP, SendGrid, AWS SES support
- **Payment Gateway**: Pluggable (Stripe, Razorpay, PayPal, etc.)
- **Biometric Integration**: Standard API for biometric devices
- **GPS Integration**: Standard GPS device protocol support
- **SSO Integration**: Active Directory, Google Workspace, Azure AD
- **LMS Integration**: LTI/LIS compatibility)
- **Government Portal Integration**: UDISE+, CBSE portal, State board portals (where applicable)
- **Third-party App Integration**: Webhook-based event notifications
- **Data Standards**: Support for standard education data formats

### 17.8 Deployment & Infrastructure Requirements
- **Containerization**: Docker containers for all services
- **Orchestration**: Kubernetes for container orchestration
- **Reverse Proxy**: Nginx for load balancing and SSL termination
- **Web Server**: Node.js with PM2 process management
- **Database**: PostgreSQL 14+ (primary), Redis (cache/sessions)
- **File Storage**: MinIO/S3-compatible object storage
- **Message Queue**: Redis/RabbitMQ for background jobs
- **Search Engine**: Elasticsearch for advanced search capabilities
- **Monitoring**: Prometheus + Grafana for metrics; ELK stack for logging
- **CI/CD**: Jenkins/GitHub Actions for automated pipelines
- **GitOps**: Infrastructure as Code with Terraform/Ansible

### 17.9 Backup & Recovery Requirements
- **Automated Backups**: Daily full database backup at 2:00 AM local time
- **Incremental Backups**: Hourly incremental backups during business hours
- **Backup Retention**: Daily backups retained for 30 days; weekly for 90 days; monthly for 1 year
- **Backup Encryption**: AES-256 encryption for all backup files
- **Offsite Storage**: Backups replicated to geographically separate storage
- **Backup Verification**: Automated restore testing weekly
- **Point-in-Time Recovery**: Support recovery to any point within 24 hours
- **Data Archival**: Automatic archival of data older than 2 academic years
- **Disaster Recovery Plan**: Documented and tested DR plan with quarterly drills
- **Business Continuity**: Critical functions operational within 4 hours of major incident

### 17.10 Data Retention & Privacy Requirements
- **Active Data**: Current academic year + 1 previous year readily accessible
- **Archived Data**: Data older than 2 years moved to archive storage; retrievable within 24 hours
- **Student Records**: Retained for minimum duration as per local education regulations (typically 7 years after graduation)
- **Financial Records**: Retained for minimum 7 years as per accounting standards
- **Audit Logs**: Retained for minimum 7 years
- **Communication Logs**: Retained for 2 years
- **Deleted Accounts**: Soft deleted for 30 days, then hard deleted with anonymization option
- **Consent Records**: Retained for duration of relationship + applicable legal period
- **Data Minimization**: Only collect data necessary for stated purposes
- **Anonymization**: Analytics data anonymized within 30 days of academic year closure
- **Cross-border Transfers**: Adequacy decisions or Standard Contractual Clauses for GDPR compliance

### 17.11 Testing Requirements
- **Unit Testing**: Minimum 80% code coverage for business logic
- **Integration Testing**: API endpoint testing with realistic data
- **End-to-End Testing**: Critical user journeys automated with Cypress/Playwright
- **Performance Testing**: Load testing for 5,000 concurrent users; stress testing for 10,000 users
- **Security Testing**: Annual penetration testing; quarterly vulnerability scanning
- **Accessibility Testing**: Automated a11y testing with axe-core; manual testing with screen readers
- **Cross-browser Testing**: Verified on latest 2 versions of major browsers
- **Mobile Testing**: Tested on iOS Safari and Android Chrome
- **Regression Testing**: Full regression suite executed before each release
- **User Acceptance Testing**: Staged rollout with beta user feedback

### 17.12 Legal & Regulatory Compliance
- **FERPA** (US): Family Educational Rights and Privacy Act compliance for student records
- **GDPR** (EU): General Data Protection Regulation compliance
- **COPPA** (US): Children's Online Privacy Protection Act compliance for under-13 users
- **PCI DSS**: Payment Card Industry Data Security Standard for payment processing
- **SOX** (if applicable): Sarbanes-Oxley compliance for financial reporting
- **Local Education Regulations**: Compliance with respective state/national education board requirements
- **Data Localization**: Support for data residency requirements (data stored in user's country/region)
- **Accessibility Laws**: Section 508 (US), EN 301 549 (EU) compliance
- **Tax Regulations**: GST/VAT compliance for invoicing based on jurisdiction

---

## Appendix A: Data Entity Relationship Summary

### Primary Entities and Their Relationships

```
School (1) ----< (N) Student
School (1) ----< (N) Staff
School (1) ----< (N) Class
School (1) ----< (N) AcademicYear
School (1) ----< (N) User
School (1) ----< (N) Hostel
School (1) ----< (N) TransportRoute
School (1) ----< (N) Book (Library)

Student (1) ----< (N) Guardian
Student (1) ----< (N) StudentDocument
Student (1) ----< (N) StudentAttendance
Student (1) ----< (N) ExamResult
Student (1) ----< (N) FeeInvoice
Student (1) ----< (1) HostelAllocation (active)
Student (1) ----< (1) StudentTransport (active)
Student (1) ----< (N) BookIssue
Student (N) ---- (N) Subject (via ClassSubject)

Staff (1) ----< (N) StaffQualification
Staff (1) ----< (N) StaffAttendance
Staff (1) ----< (N) StaffLeave
Staff (1) ----< (N) SalarySlip
Staff (1) ----< (N) LessonPlan
Staff (1) ----< (N) ClassSubject (as teacher)

Class (1) ----< (N) Section
Section (1) ----< (N) Student (enrollment)
Section (1) ----< (N) TimetableEntry
Section (1) ----< (N) ClassSubject

Subject (1) ----< (N) ClassSubject
Subject (1) ----< (N) ExamSchedule
Subject (1) ----< (N) ExamResult

AcademicYear (1) ----< (N) Term
AcademicYear (1) ----< (N) FeeStructure
AcademicYear (1) ----< (N) Section

User (1) ----< (N) UserRole
User (1) ----< (N) UserSession
User (1) ----< (N) Notification
User (1) ----< (1) Student (if user_type = student)
User (1) ----< (1) Staff (if user_type = staff)

Role (1) ----< (N) RolePermission
Role (N) ----< (N) Permission (via RolePermission)
Role (N) ----< (N) User (via UserRole)

Book (1) ----< (N) BookCopy
BookCopy (1) ----< (N) BookIssue
BookCopy (1) ----< (N) BookReservation

TransportRoute (1) ----< (N) RouteStop
TransportRoute (1) ----< (N) StudentTransport
Vehicle (1) ----< (1) Driver
Vehicle (1) ----< (N) VehicleMaintenance

Hostel (1) ----< (N) HostelRoom
HostelRoom (1) ----< (N) HostelBed
HostelBed (1) ----< (1) HostelAllocation (active)
```

---

## Appendix B: Glossary of Terms

| Term | Definition |
|------|------------|
| Academic Year | The annual period during which the school operates, typically from June/July to March/April |
| Accession Number | A unique identifier assigned to each book copy in the library |
| CCE | Continuous and Comprehensive Evaluation — an assessment approach focusing on holistic student development |
| CGPA | Cumulative Grade Point Average — average of grade points across all terms/years |
| FERPA | Family Educational Rights and Privacy Act — US federal law protecting student education records |
| GDPR | General Data Protection Regulation — EU regulation on data protection and privacy |
| GPA | Grade Point Average — weighted average of grade points |
| HOD | Head of Department |
| Hostel | Residential accommodation facility for students |
| MFA | Multi-Factor Authentication |
| PTM | Parent-Teacher Meeting |
| RBAC | Role-Based Access Control |
| RFID | Radio-Frequency Identification |
| RPO | Recovery Point Objective — maximum acceptable data loss |
| RTO | Recovery Time Objective — maximum acceptable downtime |
| SSO | Single Sign-On |
| TC | Transfer Certificate |
| TLS | Transport Layer Security |
| UDISE | Unified District Information System for Education |
| WCAG | Web Content Accessibility Guidelines |

---

## Appendix C: Requirement Traceability Matrix (Summary)

### Module to User Role Mapping

| Module | Admin | Principal | Teacher | Student | Parent | Accountant | Librarian | HR | Warden | Transport Mgr |
|--------|-------|-----------|---------|---------|--------|------------|-----------|-----|--------|---------------|
| Student Management | CRUD | View | View (class) | View (self) | View (child) | - | - | - | View (hostel) | - |
| Staff Management | CRUD | View/Approve | View (self) | - | - | - | - | CRUD | - | - |
| Academic Management | CRUD | View/Approve | CR (limited) | View | View | - | - | - | - | - |
| Attendance Management | CRUD | View | Mark/View | View (self) | View (child) | - | - | - | Mark (hostel) | - |
| Examination & Grading | CRUD | View/Approve | Enter/View | View (self) | View (child) | - | - | - | - | - |
| Fee & Finance | Config | View | - | View/Pay | View/Pay | CRUD | - | - | - | - |
| Library Management | Config | - | Issue/View | Search/Issue | View (child) | - | CRUD | - | - | - |
| Transport Management | Config | - | - | View | View/Track | Fee Coll | - | - | - | CRUD |
| Hostel Management | Config | - | - | View/Apply | View (child) | Fee Coll | - | - | CRUD | - |
| Communication | CRUD | CRUD | CRUD | View | View | - | - | - | CRUD | CRUD |
| Reports & Analytics | All | Academic | Class-level | Self | Child | Financial | Library | Staff | Hostel | Transport |
| System Admin | Full | - | - | - | - | - | - | - | - | - |

### Requirement Priority Classification

| Priority | Count | Description |
|----------|-------|-------------|
| P0 (Critical) | ~120 | Core functionality required for MVP; system cannot operate without these |
| P1 (High) | ~150 | Important features significantly impacting user experience; should be in v1 |
| P2 (Medium) | ~100 | Enhancement features; can be deferred to v2 |
| P3 (Low) | ~50 | Nice-to-have features; future roadmap items |

---

## Appendix D: Technology Stack Specification

### Backend (Node.js)
- **Runtime**: Node.js 18+ LTS
- **Framework**: Express.js / NestJS (recommended for enterprise structure)
- **Language**: TypeScript
- **ORM**: Prisma / TypeORM
- **Database**: PostgreSQL 14+
- **Cache**: Redis 7+
- **Search**: Elasticsearch 8+
- **Message Queue**: Redis (Bull Queue) / RabbitMQ
- **Authentication**: Passport.js with JWT, OAuth 2.0, SAML
- **Validation**: class-validator, Joi
- **API Documentation**: Swagger/OpenAPI 3.0
- **Testing**: Jest (unit), Supertest (integration)
- **Logging**: Winston / Pino
- **Process Management**: PM2

### Frontend (React)
- **Framework**: React 18+
- **Language**: TypeScript
- **State Management**: Redux Toolkit + RTK Query
- **Routing**: React Router v6
- **UI Components**: Material-UI / Ant Design / Chakra UI
- **Forms**: React Hook Form + Zod/Yup validation
- **Charts**: Chart.js / Recharts
- **Tables**: TanStack Table (React Table)
- **Testing**: Jest + React Testing Library + Cypress (E2E)
- **Build Tool**: Vite
- **Styling**: CSS-in-JS (Styled Components / Emotion) + Tailwind CSS
- **i18n**: react-i18next
- **PWA**: Workbox

### DevOps & Infrastructure
- **Containers**: Docker + Docker Compose
- **Orchestration**: Kubernetes
- **CI/CD**: GitHub Actions / Jenkins
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **APM**: Jaeger / New Relic
- **Cloud**: AWS / Azure / GCP (cloud-agnostic)
- **Reverse Proxy**: Nginx
- **SSL**: Let's Encrypt / Cert Manager

---

*End of Requirements Document*

**Total Requirements Catalogued**: 17 major domains, 80+ feature areas, 150+ data entities, 200+ API endpoints, 300+ business rules, and 50+ non-functional requirements.
