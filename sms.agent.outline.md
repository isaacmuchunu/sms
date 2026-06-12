# School Management System — Full-Stack Technical Document (Node.js & React)

## 1. Introduction & Project Overview (~800 words, 1 table, 1 diagram)
### 1.1 Purpose and Scope
#### 1.1.1 Problem statement: inefficiencies in paper-based school administration including fragmented records, manual attendance, delayed communication, and error-prone fee tracking
#### 1.1.2 Scope boundaries: modules covered (student, teacher, academic, attendance, examination, fee, library, transport, hostel, communication, reports) and explicit exclusions (learning management, payroll tax filing, government regulatory submission)
#### 1.1.3 Target user personas: School Administrator, Principal, Teacher, Student, Parent/Guardian, Accountant, Librarian, Transport Manager, Hostel Warden

### 1.2 Functional Requirements Overview
#### 1.2.1 Core module inventory: 11 functional modules with priority classification (Critical/High/Medium)
#### 1.2.2 User role matrix: 8 primary roles with module access permissions (table: Role x Module permissions)
#### 1.2.3 Feature comparison with open-source and commercial alternatives (Fedena, OpenSIS, Google Classroom)

### 1.3 Non-Functional Requirements
#### 1.3.1 Performance benchmarks: API response time < 200ms (p95), page load < 3s, support for 5,000+ concurrent users
#### 1.3.2 Scalability: horizontal scaling via stateless API servers, database read replicas, CDN for static assets
#### 1.3.3 Browser compatibility: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+; responsive design for tablet and mobile

## 2. System Architecture & Technology Stack (~1,500 words, 1 table, 2 diagrams, 2 code samples)
### 2.1 High-Level Architecture
#### 2.1.1 Monolithic layered architecture: Presentation Layer (React SPA), API Gateway Layer (Express.js), Business Logic Layer (Services), Data Access Layer (Mongoose/Sequelize)
#### 2.1.2 Client-server communication: RESTful API over HTTPS, WebSocket for real-time notifications, JWT stateless authentication
#### 2.1.3 Three-tier architecture diagram: request flow from browser through Nginx reverse proxy to Node.js application server to MongoDB/PostgreSQL database

### 2.2 Technology Stack Selection
#### 2.2.1 Backend stack: Node.js 20 LTS with Express.js 4.x — non-blocking I/O, JSON-native, npm ecosystem maturity
#### 2.2.2 Frontend stack: React 18 with functional components and hooks, React Router v6, Vite build tool
#### 2.2.3 Database selection: MongoDB 7.x with Mongoose ODM (NoSQL flexibility for evolving school schemas); PostgreSQL alternative with Sequelize for relational consistency (table: comparison)
#### 2.2.4 Supporting libraries: JWT (jsonwebtoken), bcrypt (password hashing), Multer (file upload), Nodemailer (email), Socket.io (real-time), Winston (logging), Joi (validation)

### 2.3 Project Structure
#### 2.3.1 Monorepo organization vs. separate repositories: recommendation for separate client/ and server/ folders in single repo
#### 2.3.2 Backend directory structure: config/, controllers/, models/, routes/, middleware/, services/, utils/, uploads/ (code sample: tree)
#### 2.3.3 Frontend directory structure: src/components/, src/pages/, src/hooks/, src/context/, src/services/, src/utils/ with feature-based organization

### 2.4 Development Environment Setup
#### 2.4.1 Prerequisites: Node.js 20+, npm 10+, MongoDB 7+ or PostgreSQL 15+, Redis 7+ for caching and session store
#### 2.4.2 Environment variables template: PORT, DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN, REFRESH_TOKEN_SECRET, EMAIL_HOST, EMAIL_PORT, SMS_API_KEY, REDIS_URL (code sample: .env.example)
#### 2.4.3 Development workflow: npm run dev for concurrent frontend and backend startup, nodemon for auto-restart, seed scripts for test data

## 3. Database Design & Schema (~1,500 words, 1 table, 2 diagrams, 4 code samples)
### 3.1 Database Configuration
#### 3.1.1 MongoDB connection setup with Mongoose: connection pooling (poolSize: 10), retry logic with exponential backoff, deprecation warnings suppression
#### 3.1.2 Database seeding strategy: seed.js script for academic years, classes, subjects, admin user, sample students for development environment
#### 3.1.3 Migration strategy for schema evolution: mongoose-migrate or node-migrate for production schema changes

### 3.2 Core Entity Schema Definitions
#### 3.2.1 User schema: fields (_id, email, password, role, status, lastLogin), role enum (super_admin, admin, teacher, student, parent, accountant, librarian, transport_manager, warden), pre-save password hashing hook, indexes on email and role (code sample)
#### 3.2.2 Student schema: personal details (firstName, lastName, dob, gender, bloodGroup, address), enrollment (admissionNo, rollNo, classId, sectionId, academicYearId), parent linkage (guardianIds[]), status enum (active, inactive, transferred, withdrawn, alumni) (code sample)
#### 3.2.3 Teacher schema: staffId, qualifications[], subjectSpecializations[], department, joiningDate, employmentType, salaryDetails, assignedClasses[], biometricId (code sample)
#### 3.2.4 Parent/Guardian schema: relationship enum (father, mother, guardian), studentIds[] for multi-child linkage, occupation, phone, email, isEmergencyContact, priorityOrder

### 3.3 Academic Entity Schemas
#### 3.3.1 Class schema: name (Grade 1-12), sections[] sub-document (name, capacity, classTeacherId), academicYearId, status (code sample)
#### 3.3.2 Subject schema: name, code, type enum (core, elective, co-curricular), credits, description, classIds[] for applicable classes
#### 3.3.3 Timetable schema: entries[] sub-document (dayOfWeek, periodNo, startTime, endTime, subjectId, teacherId, classId, sectionId), with compound index on classId+sectionId+academicYearId for fast queries

### 3.4 Transactional and Auxiliary Schemas
#### 3.4.1 Attendance schema: studentId, date, status enum (present, absent, late, half-day, excused), subjectId (optional for subject-wise), markedBy, remarks (code sample)
#### 3.4.2 Examination schema: Exam (name, type, startDate, endDate, academicYearId), ExamSchedule (examId, subjectId, date, startTime, endTime, maxMarks), Marks (studentId, examScheduleId, marksObtained, grade, remarks)
#### 3.4.3 Fee schema: FeeHead (name, description, type), FeeStructure (classId, feeHeadId, amount, academicYearId), FeePayment (studentId, feeStructureId, amountPaid, paymentMode, transactionId, status, receiptNo)
#### 3.4.4 Library schema: Book (title, author, isbn, category, shelfLocation, totalCopies, availableCopies), BookTransaction (bookId, studentId, issueDate, dueDate, returnDate, fineAmount, status)

### 3.5 Schema Relationships and Indexing
#### 3.5.1 Referencing vs. embedding decisions: embed for 1:1 and 1:few (addresses within student), reference for 1:many and many:many (teacher to classes) (table: decision matrix)
#### 3.5.2 Critical indexes: compound index on Attendance (studentId+date), unique on Student (admissionNo), compound on FeePayment (studentId+status), text index on Book (title+author+isbn)
#### 3.5.3 Cascade delete and data integrity: soft delete pattern with deletedAt timestamp, pre-remove hooks for dependency checking, transaction wrapping for multi-document operations

## 4. Backend Architecture & API Design (~2,000 words, 1 table, 3 diagrams, 5 code samples)
### 4.1 Node.js Application Architecture
#### 4.1.1 Express.js bootstrap: server.js with app initialization, middleware mounting, route registration, error handling, and server.listen (code sample)
#### 4.1.2 Middleware pipeline: express.json(), cors(), helmet(), compression(), morgan(logging), custom requestId injection (code sample: app.js)
#### 4.1.3 Centralized error handling: AppError class extending Error, global error middleware with operational vs. programming error distinction, error response formatting (code sample)
#### 4.1.4 Async handler wrapper: catchAsync utility eliminating try-catch boilerplate, unhandled rejection and uncaught exception handlers (code sample)

### 4.2 Modular Routing Structure
#### 4.2.1 Route aggregation: index.js mounting all module routes under /api/v1/ prefix, route-per-module pattern (code sample: routes/index.js)
#### 4.2.2 Controller-service-repository pattern: thin controllers for HTTP handling, services for business logic, models for data access (code sample)
#### 4.2.3 Route protection: authentication middleware (verify JWT), authorization middleware (check role permissions), validation middleware (Joi schema) applied per route

### 4.3 RESTful API Endpoint Design
#### 4.3.1 Resource naming convention: plural nouns (/students, /teachers), nested resources (/classes/:id/sections), HTTP method mapping (GET/POST/PUT/PATCH/DELETE)
#### 4.3.2 Student endpoints: GET /students (list, filter, paginate), GET /students/:id, POST /students, PUT /students/:id, DELETE /students/:id, GET /students/:id/attendance, GET /students/:id/fees (table: endpoint reference)
#### 4.3.3 Teacher endpoints: CRUD + GET /teachers/:id/classes, GET /teachers/:id/timetable, POST /teachers/:id/assign-class
#### 4.3.4 Academic endpoints: /classes, /sections, /subjects, /timetables with full CRUD and nested operations for class-section-subject mappings
#### 4.3.5 Attendance endpoints: POST /attendance/mark (bulk), GET /attendance/report, PUT /attendance/:id, GET /attendance/student/:studentId
#### 4.3.6 Fee endpoints: /fee-structures, /fee-payments, POST /fee-payments/record, GET /fee-payments/receipt/:receiptNo, GET /fees/reports/outstanding
#### 4.3.7 Auxiliary module endpoints: /library/books, /library/transactions, /transport/routes, /transport/vehicles, /hostel/rooms, /hostel/allocations

### 4.4 Request Validation & Sanitization
#### 4.4.1 Joi validation schemas: studentCreateSchema with .required() chains, .email(), .min(), .max(), custom .custom() validators for phone numbers (code sample)
#### 4.4.2 Input sanitization: express-mongo-sanitize for NoSQL injection prevention, XSS-clean middleware for script tag removal, trim() on all string inputs
#### 4.4.3 File upload with Multer: diskStorage configuration, fileFilter for images and PDFs, size limits (5MB), filename hashing to prevent collisions (code sample)

### 4.5 Response Standardization
#### 4.5.1 Unified response envelope: { success: boolean, data: object|null, message: string, meta: { page, limit, total } } (code sample: response utility)
#### 4.5.2 Pagination pattern: page/limit query params, skip/limit in MongoDB, total count query, metadata in response
#### 4.5.3 HTTP status code conventions: 200 (GET success), 201 (created), 204 (deleted), 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 409 (conflict), 500 (server error)

### 4.6 WebSocket Integration
#### 4.6.1 Socket.io server setup: integration with Express HTTP server, CORS configuration for WebSocket, connection event handling (code sample)
#### 4.6.2 Event namespaces: notification:* for alerts, attendance:* for real-time marking, chat:* for messaging, presence:* for online status
#### 4.6.3 Room-based broadcasting: students join rooms by userId and role for targeted notifications, emit vs. broadcast patterns

## 5. Frontend Architecture — React (~1,500 words, 1 table, 2 diagrams, 4 code samples)
### 5.1 React Application Structure
#### 5.1.1 Vite project setup: scaffolding with npm create vite@latest, absolute imports via jsconfig.json paths, environment variable handling with import.meta.env
#### 5.1.2 Atomic Design methodology: Atoms (Button, Input), Molecules (SearchBar, FormField), Organisms (DataTable, Sidebar), Templates (DashboardLayout), Pages (StudentList, ClassDetail)
#### 5.1.3 Feature-based folder structure: features/students/, features/teachers/, features/academics/ each containing components/, hooks/, services/, and utils/ sub-folders

### 5.2 Routing and Navigation
#### 5.2.1 React Router v6: BrowserRouter with nested route definitions, Outlet for layout composition, useParams and useSearchParams hooks (code sample: AppRoutes.jsx)
#### 5.2.2 Role-based route guards: ProtectedRoute component checking auth context + role permissions, redirect to /login or /unauthorized (code sample)
#### 5.2.3 Dynamic navigation: Sidebar menu items filtered by user role, breadcrumb generation from route hierarchy, active state highlighting
#### 5.2.4 Code splitting: React.lazy() for route-level components, Suspense with fallback loading spinner, prefetching for likely next routes

### 5.3 State Management
#### 5.3.1 AuthContext: global authentication state (user, role, token, login, logout), localStorage persistence, token expiration handling (code sample: AuthContext.jsx)
#### 5.3.2 useReducer for complex state: form state management, multi-step wizard flows, table state (sorting, filtering, pagination)
#### 5.3.3 Custom hooks: useFetch for data fetching with loading/error states, useLocalStorage for persistent UI preferences, useDebounce for search inputs, usePermission for role-based UI (code sample)
#### 5.3.4 Form handling: controlled components with useState, form validation with custom validators, reusable FormField component wrapping input + error message

### 5.4 Reusable Component Library
#### 5.4.1 Layout components: Sidebar (collapsible, role-based menu), TopBar (user profile, notifications, logout), PageContainer (title + breadcrumbs + content slot), Footer (code sample: DashboardLayout.jsx)
#### 5.4.2 Data display: DataTable (sortable, paginated, selectable rows with useTable hook), StatCard (icon + number + label + trend), StatusBadge (color-coded enums), Avatar with fallback initials
#### 5.4.3 Form components: InputField (text/number/email with validation), SelectDropdown (single/multi with search), DatePicker (wrapper around native or react-datepicker), FileUploader (drag-drop + preview)
#### 5.4.4 Feedback components: Toast notification system with auto-dismiss, Modal dialog with focus trap and ESC close, ConfirmDialog for destructive actions, Skeleton screens for loading states

### 5.5 API Integration Layer
#### 5.5.1 Axios instance: baseURL configuration, request interceptor attaching Authorization header, response interceptor handling 401 for token refresh (code sample: api.js)
#### 5.5.2 Automatic token refresh: queueing requests during refresh, retrying with new token, redirect to login on refresh failure
#### 5.5.3 Service modules: studentService.js, teacherService.js, feeService.js encapsulating all API calls for their domain, returning standardized responses
#### 5.5.4 Error handling: API error to user-friendly message mapping, field-level validation errors from server, global error boundary for React component crashes

### 5.6 UI/UX Implementation
#### 5.6.1 Tailwind CSS integration: utility-first approach, custom color palette (primary: indigo-600, secondary: emerald-500, danger: red-500), custom spacing scale
#### 5.6.2 Responsive design: mobile-first breakpoints (sm:640px, md:768px, lg:1024px), collapsible sidebar on md, stacked tables on mobile with card view
#### 5.6.3 Theme system: CSS custom properties for colors, dark mode toggle with class-based switching, consistent typography (Inter font family)
#### 5.6.4 State patterns: empty states with illustrations, loading skeletons matching content shape, error states with retry action, optimistic updates for immediate feedback

## 6. Authentication & Authorization (~1,200 words, 1 table, 2 diagrams, 4 code samples)
### 6.1 Authentication System Design
#### 6.1.1 Authentication flow: registration (admin-only for staff), login (email+password), token issuance, authenticated request handling, logout with token invalidation (diagram: sequence)
#### 6.1.2 Password hashing: bcrypt with 12 salt rounds, hash stored in password field, compare method for login verification (code sample)
#### 6.1.3 JWT strategy: access token (15-min expiry, stored in memory), refresh token (7-day expiry, httpOnly cookie), token payload containing userId, role, schoolId (code sample)
#### 6.1.4 Token blacklisting: logout inserts token into Redis blacklist with TTL matching expiry, middleware checks blacklist on every request

### 6.2 Role-Based Access Control (RBAC)
#### 6.2.1 Role hierarchy: super_admin (cross-school), admin (single school), principal, teacher, student, parent, accountant, librarian, transport_manager, warden
#### 6.2.2 Permission matrix: 10 roles x 11 modules with CRUD permission levels (table: Role vs. Module permissions)
#### 6.2.3 Backend authorization: requireRole() middleware factory accepting role array, checking req.user.role against allowed roles, 403 response for unauthorized (code sample)
#### 6.2.4 Frontend route guards: ProtectedRoute component with role prop, usePermission hook for conditional UI rendering, Redirect to /unauthorized for insufficient permissions (code sample)

### 6.3 Session Management
#### 6.3.1 Token storage strategy: httpOnly cookies for refresh tokens (XSS protection), in-memory variable for access tokens, localStorage NOT used for security
#### 6.3.2 Automatic refresh: Axios 401 interceptor triggers /auth/refresh, updates memory token, retries original request seamlessly
#### 6.3.3 Session timeout: 30-minute idle detection (mouse/keyboard listeners), warning prompt at 25 minutes, auto-logout at 30 minutes
#### 6.3.4 Concurrent session handling: max 3 active sessions per user, new login invalidates oldest session, session list in user profile for manual revocation

### 6.4 Password Recovery & Account Security
#### 6.4.1 Forgot password: POST /auth/forgot-password generates crypto random token (32 bytes), stores hash in DB with 1-hour expiry, sends email with reset link
#### 6.4.2 Reset password: GET /auth/reset-password/:token validates token hash, renders form; POST updates password and invalidates token (code sample)
#### 6.4.3 Password policy: minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number, 1 special character, rejection of common passwords, no reuse of last 3 passwords

## 7. Student & Teacher Management Modules (~1,500 words, 2 tables, 3 diagrams, 4 code samples)
### 7.1 Student Management Module
#### 7.1.1 Student registration flow: multi-step form (personal info > guardian info > academic info > document upload), validation at each step, auto-roll number generation (code sample)
#### 7.1.2 Student profile: view mode (all details with photo gallery), edit mode (inline editing), archive soft-delete, profile photo upload with crop (code sample: StudentProfile.jsx)
#### 7.1.3 Class assignment: assign student to class+section for academic year, validate capacity constraints, prevent duplicate enrollment in same year, handle transfers between sections
#### 7.1.4 Student search and filter: full-text search by name/ID, filter by class, section, status, admission date range, server-side pagination with debounced input (code sample)
#### 7.1.5 Bulk import: CSV/Excel template download, parse-upload-validate pattern, row-by-row validation with error report, preview before commit, success/failure summary
#### 7.1.6 Student dashboard: academic summary card, attendance percentage, fee due status, upcoming exams, recent marks, downloadable ID card
#### 7.1.7 Parent portal: parent login linked to student(s), view-only access to profile/attendance/marks/fees, parent-teacher messaging, notification preferences

### 7.2 Teacher Management Module
#### 7.2.1 Teacher onboarding: profile creation with qualifications and documents, subject specialization selection, department assignment, class teacher designation, account activation email
#### 7.2.2 Teacher profile: qualifications timeline, experience history, assigned classes and subjects, timetable view, contract details (code sample: TeacherProfile.jsx)
#### 7.2.3 Department management: CRUD for departments (Science, Mathematics, Languages, Arts), hierarchical reporting structure, department head assignment
#### 7.2.4 Teacher-class-subject assignment matrix: visual grid showing teacher rows, class-section columns, subject cells, conflict detection for double-booking (table: assignment view)
#### 7.2.5 Workload calculation: periods per week aggregation, min/max period constraints per teacher, workload distribution analytics, overload alerts

### 7.3 Staff Management Module
#### 7.3.1 Staff categories: administrative (reception, clerk), support (peons, security), specialized (librarian, accountant, transport manager), employment type (permanent, contract, probation)
#### 7.3.2 Staff registration: simplified flow for non-teaching staff, role-based access assignment, ID card generation, account setup
#### 7.3.3 Employment lifecycle: status transitions (probation -> active -> on-leave -> resigned -> terminated), exit checklist with asset return and clearance

### 7.4 User Directory & Search
#### 7.4.1 Unified directory: all users (students, teachers, staff) in single searchable list, role badges, quick actions (view, edit, message, deactivate)
#### 7.4.2 Advanced filters: search by name, ID, class, department, status, employment type; combined filter queries; saved filter presets
#### 7.4.3 Profile export: PDF generation with photo and full details, print-friendly CSS, bulk export to Excel for reports

## 8. Academic Management (~1,500 words, 2 tables, 2 diagrams, 3 code samples)
### 8.1 Academic Year & Session Management
#### 8.1.1 Academic year creation: define start/end dates, term structure (semester/trimester), exam schedules, promotion criteria, overlap prevention with previous year
#### 8.1.2 Session rollover: year-end process archiving current data, promoting students to next class, creating new academic year, rolling forward fee structures and timetables
#### 8.1.3 Student progression: auto-promote based on exam results, identify detained students, handle class capacity overflow, alumni conversion for graduating class

### 8.2 Class & Section Management
#### 8.2.1 Class hierarchy: grade levels (Nursery to Grade 12), sections (A, B, C, D), per-section capacity with waitlist, strength overview dashboard
#### 8.2.2 Section CRUD: create section with name and capacity, assign class teacher, set room number, manage student list with drag-drop reorder (code sample)
#### 8.2.3 Student allocation: assign student to section respecting capacity, handle re-allocation mid-year, view section-wise student list with search
#### 8.2.4 Class teacher assignment: one primary teacher per section, co-teacher support, teacher change workflow with audit trail

### 8.3 Subject Management
#### 8.3.1 Subject catalog: name, code (MATH-101), type (core/elective/co-curricular), credits, passing marks, description, applicable grade levels
#### 8.3.2 Subject creation and editing: form with validation, unique code enforcement, soft delete preventing in-use subjects from removal (code sample)
#### 8.3.3 Class-wise subject allocation: assign subjects to class-section combinations, set periods per week, assign primary teacher, specify exam applicability (table: subject allocation)
#### 8.3.4 Elective selection: publish elective options to students, first-come-first-serve or preference-based allocation, deadline enforcement, finalize and lock selections

### 8.4 Timetable Management
#### 8.4.1 Period configuration: period duration (45 min), number of periods per day, break slots, working days (Mon-Sat), assembly time
#### 8.4.2 Timetable generation: constraint-based algorithm — teacher availability, subject period requirements, no teacher clashes, no consecutive heavy subjects (diagram: algorithm flow)
#### 8.4.3 Conflict detection: real-time validation during manual entry, highlight teacher double-booking, classroom conflicts, teacher availability indicators
#### 8.4.4 Timetable views: class-wise (all sections), teacher-wise (personal schedule), room-wise, weekly grid with period numbers (code sample: TimetableGrid.jsx)
#### 8.4.5 Substitution management: mark teacher absence, suggest available substitutes based on free periods, assign substitute with notification, record substitution history

### 8.5 Curriculum & Syllabus Tracking
#### 8.5.1 Syllabus upload: chapter-wise topic listing per subject, estimated periods per topic, document attachment support, version control for updates
#### 8.5.2 Lesson planning: teacher creates lesson plans linked to syllabus topics, topics covered/completed status, notes and resources attachment
#### 8.5.3 Progress tracking: curriculum completion percentage per subject, visual progress bar, overdue topic alerts, completion report for administration

## 9. Attendance & Examination System (~1,500 words, 2 tables, 2 diagrams, 4 code samples)
### 9.1 Attendance Management
#### 9.1.1 Marking interface: daily class attendance grid (students as rows, statuses as columns), single-click status toggle, subject-wise attendance option, bulk mark-all-present (code sample)
#### 9.1.2 Attendance API: POST /attendance/bulk-mark accepting array of {studentId, status}, validation of class+date uniqueness, atomic insert with transaction (code sample)
#### 9.1.3 Status definitions: Present, Absent, Late (after threshold time), Half-Day, Excused (with approved leave application), On-Duty (table: status types with codes)
#### 9.1.4 Attendance analytics: percentage calculation per student per month, below-threshold alerts (75% minimum), class-wise daily summary, defaulter list generation
#### 9.1.5 Monthly report: calendar view with daily status, summary statistics (present/absent/late counts), PDF export with signatures, parent copy generation
#### 9.1.6 Parent notification: automatic SMS/email on absent or late marking, configurable notification time delay (e.g., 30 min after marking), delivery status tracking
#### 9.1.7 Leave application: student/parent submits leave request with reason and dates, teacher approval workflow, attendance record update to Excused on approval

### 9.2 Examination Management
#### 9.2.1 Exam types: Unit Test (monthly), Mid-Term, Final Exam, Quiz (class test), Practical, Oral — configurable weightage for final grade calculation
#### 9.2.2 Exam schedule: create exam with date range, add subject-wise schedules with date/time/max-marks, publish to students and parents, generate hall tickets (code sample)
#### 9.2.3 Exam timetable: calendar view of all scheduled exams, filter by class/section, clash detection (two exams same day), seating arrangement generation
#### 9.2.4 Hall ticket: auto-generated with student photo, exam schedule, rules and instructions, verification barcode, PDF download and print

### 9.3 Marks Entry & Processing
#### 9.3.1 Marks entry interface: teacher's portal showing assigned subjects and students, grid input with validation (0 to max-marks), auto-save draft mode (code sample)
#### 9.3.2 Validation rules: range check (0 <= marks <= max), duplicate prevention per student-exam-subject, grace marks configuration by admin, remark codes for absent/cheating
#### 9.3.3 Marks workflow: teacher enters -> saves as draft -> submits for verification -> admin approves -> locks for editing (code sample: marksController.js)
#### 9.3.4 Lock mechanism: once published marks are read-only, correction requires admin-initiated unlock with reason audit, version history for changes

### 9.4 Grading System
#### 9.4.1 Grade scale: configurable percentage-to-grade mapping (A+: 90-100, A: 80-89, B+: 70-79, B: 60-69, C: 50-59, D: 40-49, F: below 40) (table: grade scale)
#### 9.4.2 Grade calculation: total marks aggregation across subjects, percentage computation, rank calculation within class-section, division (First/Second/Third) assignment
#### 9.4.3 Result processing: subject-wise marks + grade, overall total/percentage/grade/rank, pass/fail determination (all subjects above minimum), distinction criteria
#### 9.4.4 Report card generation: template with school header, student details, subject-wise table, attendance summary, co-curricular grades, teacher remarks, principal signature (code sample)

### 9.5 Result Publication & Analysis
#### 9.5.1 Publication workflow: marks review by class teacher, principal approval, publish to students/parents on scheduled date, time-bound release
#### 9.5.2 Student result view: individual marksheet with subject breakdown, comparison with class average, historical performance graph
#### 9.5.3 Class analytics: pass/fail ratio, subject-wise average marks, grade distribution histogram, top 10 and bottom 10 lists
#### 9.5.4 Performance insights: identify weak subjects for class, compare section-wise performance, generate improvement recommendations, parent-teacher meeting triggers for weak students

## 10. Fee & Finance Management (~1,200 words, 2 tables, 1 diagram, 3 code samples)
### 10.1 Fee Structure Configuration
#### 10.1.1 Fee head management: Tuition, Admission, Registration, Examination, Transport, Hostel, Library, Laboratory, Sports, Late Fee — CRUD with description and default amounts
#### 10.1.2 Fee structure assignment: class-wise and category-wise (general/SC/ST/OBC) fee amounts, academic year binding, one-time vs. recurring (monthly/quarterly/annual) (table: fee structure template)
#### 10.1.3 Concessions and scholarships: percentage or fixed amount waiver, sibling discount, staff child discount, merit-based scholarship, orphan/student-in-need category
#### 10.1.4 Fine rules: late fee percentage or fixed amount per day after due date, maximum fine cap, waiver approval workflow for special cases

### 10.2 Fee Collection Workflow
#### 10.2.1 Student fee ledger: opening balance, monthly/periodic dues, payment history, running balance, filter by academic year and status (code sample)
#### 10.2.2 Payment recording: cash, cheque (with cheque number and bank), online (UPI/card/net banking with transaction ID), partial payment acceptance, installment tracking (code sample)
#### 10.2.3 Receipt generation: unique receipt number (REC-YYYY-XXXXX), fee breakup by head, payment mode details, digital signature, PDF generation and auto-email (code sample)
#### 10.2.4 Payment status tracking: Paid (full), Partial (partial payment), Pending (unpaid within due date), Overdue (past due date) with color coding (table: status definitions)

### 10.3 Financial Reporting
#### 10.3.1 Daily collection report: date-wise total collection, payment mode breakdown (cash/cheque/online), cashier-wise summary, deposit reconciliation
#### 10.3.2 Monthly/annual analytics: collection vs. target comparison, month-over-month trend graph, class-wise collection summary, year-end financial summary
#### 10.3.3 Outstanding dues: class-wise aging analysis (0-30, 31-60, 61-90, 90+ days), student-wise defaulter list with contact details, total outstanding amount dashboard
#### 10.3.4 Automated reminders: fee due reminder 3 days before, overdue notice on due date + weekly thereafter, SMS/email with payment link, reminder log for tracking

### 10.4 Expense & Budget Tracking
#### 10.4.1 Expense management: expense categories (salaries, utilities, maintenance, supplies, events), expense entry with receipt upload, approval workflow for large expenses
#### 10.4.2 Income summary: fee collection, donations, grants, other income sources, monthly income statement
#### 10.4.3 Budgeting: annual budget allocation by category, actual vs. budget variance report, overspend alerts, budget revision workflow

## 11. Library, Transport & Hostel Management (~1,200 words, 3 tables, 2 diagrams, 3 code samples)
### 11.1 Library Management Module
#### 11.1.1 Book catalog: ISBN, title, author, publisher, edition, category, shelf location, total copies, available copies, book cover image, MARC record support (table: catalog fields)
#### 11.1.2 Book operations: add new book with barcode/QR generation, edit metadata, mark as lost/damaged, bulk import from CSV/ISBN lookup API, delete with circulation check
#### 11.1.3 Book issue workflow: search student/teacher, scan book barcode, check availability and existing dues, calculate due date (issueDuration + holidays), record transaction (code sample)
#### 11.1.4 Return processing: scan barcode, check overdue days, auto-calculate fine (finePerDay * overdueDays), mark returned, update availability, fine receipt generation
#### 11.1.5 Reservation and renewal: reserve when all copies issued, queue position notification, renew if no pending reservation, max renewals limit
#### 11.1.6 Library reports: currently issued books, overdue list with fine amounts, most borrowed titles, never borrowed books, category-wise inventory

### 11.2 Transport Management Module
#### 11.2.1 Vehicle fleet: bus registration number, model, capacity, insurance expiry, fitness certificate, GPS device ID, driver assignment, condition status
#### 11.2.2 Route management: route name, stops list (stop name, sequence, arrival time), route fare based on distance tiers, route map visualization (table: route structure)
#### 11.2.3 Student transport allocation: assign student to route and pickup/drop stop, link transport fee to fee structure, route-wise student list, stop-wise count (code sample)
#### 11.2.4 Transport fee: distance-based slab pricing (0-5km, 5-10km, 10+km), monthly/quarterly billing, fine for pass cancellation, refund policy
#### 11.2.5 Vehicle maintenance: service schedule (every 5,000 km or monthly), maintenance log (date, type, cost, vendor), expense tracking, alert for upcoming service
#### 11.2.6 Transport attendance: morning pickup verification, evening drop verification, absent student alert to driver, route deviation logging

### 11.3 Hostel Management Module
#### 11.3.1 Room inventory: building/block, floor, room number, room type (single/double/triple/dormitory), capacity, amenities, rent per bed, current occupancy
#### 11.3.2 Room allocation: student application, vacancy check, room assignment with roommate preference, fee linking, allocation letter generation (code sample)
#### 11.3.3 Warden management: warden assignment per block, duty roster, complaint resolution workflow, visitor approval authority
#### 11.3.4 Hostel fee: room-type based pricing, mess charges (monthly), laundry/other amenities, billing cycle, late payment fine
#### 11.3.5 Visitor log: visitor name, relation, student visited, entry/exit time, purpose, photo ID capture, approval status
#### 11.3.6 Hostel operations: daily attendance (roll call), leave request (weekend/home leave), complaint registration (maintenance/disciplinary), mess menu management

## 12. Communication, Reports & Analytics (~1,200 words, 1 table, 2 diagrams, 3 code samples)
### 12.1 Internal Communication System
#### 12.1.1 Announcements: role-targeted (teacher-only, parent-only, school-wide) and class-specific broadcasts, rich text editor, attachment support, publish scheduling, expiry date
#### 12.1.2 Notice board: digital notice board with categorized notices (academic, events, urgent), pin important notices, read receipt tracking, archive old notices
#### 12.1.3 Messaging: teacher-to-parent direct messaging, admin-to-staff broadcasts, message threading, file attachments, read receipts, inbox/outbox/sent organization
#### 12.1.4 Parent-teacher meetings: schedule PTM slots, parent booking system, calendar integration, reminders, meeting notes and action items

### 12.2 Notification System
#### 12.2.1 Multi-channel architecture: in-app notification bell with badge count, email via Nodemailer (SMTP), SMS via Twilio/MSG91, browser push with Service Worker (diagram: architecture)
#### 12.2.2 Email integration: SMTP configuration, HTML email templates with school branding, bulk email for announcements, delivery status tracking, bounce handling (code sample)
#### 12.2.3 SMS gateway: REST API integration, template-based messages with variable substitution ({{studentName}}, {{amount}}), Unicode support for regional languages, delivery report callback
#### 12.2.4 Notification templates: template management UI, variable injection, template categories (fee_reminder, attendance_alert, exam_result, general_announcement), multi-language support
#### 12.2.5 Trigger-based notifications: fee due (3 days before + on due date), absent alert (30 min after marking), exam schedule publish, result publish, emergency broadcast (table: trigger types)
#### 12.2.6 Real-time delivery: Socket.io for instant in-app notifications, browser push for off-site alerts, retry mechanism for failed deliveries, notification preference center per user

### 12.3 Report Generation Engine
#### 12.3.1 Template system: parameterized HTML templates with {{variable}} placeholders, header/footer with school branding, page break control, template versioning
#### 12.3.2 ID card generation: student photo + barcode + details + school logo, standard card size (CR80), PVC print-ready PDF, bulk generation for entire class
#### 12.3.3 Certificates: bonafide certificate, character certificate, transfer certificate (TC), achievement certificate with template selection and auto-fill
#### 12.3.4 Export formats: PDF generation with Puppeteer/wkhtmltopdf, Excel export with formatting (xlsx library), CSV for data portability, print-friendly CSS

### 12.4 Analytics Dashboard
#### 12.4.1 Dashboard layout: KPI cards (total students, present today, fee collected this month, pending dues), charts section, recent activity feed, quick action buttons (diagram: layout)
#### 12.4.2 Student analytics: enrollment trend (line chart), gender ratio (pie chart), class distribution (bar chart), new admissions vs. withdrawals comparison
#### 12.4.3 Fee analytics: collection vs. target (gauge chart), monthly collection trend, payment mode distribution, top defaulters table, collection growth rate
#### 12.4.4 Academic analytics: class-wise attendance heatmap, exam result distribution (histogram), subject-wise performance comparison, year-over-year improvement tracking (code sample: Recharts component)
#### 12.4.5 Drill-down capabilities: from summary KPI to detailed list, date range selector affecting all widgets, role-based dashboard customization, scheduled report emails

## 13. Security Implementation & Deployment (~1,400 words, 1 table, 2 diagrams, 3 code samples)
### 13.1 Application Security
#### 13.1.1 OWASP mitigation: parameterized queries (NoSQL injection), output encoding (XSS), CSRF tokens, secure cookies, path traversal prevention, dependency auditing (table: checklist)
#### 13.1.2 Helmet.js configuration: contentSecurityPolicy, xssFilter, noSniff, hsts, frameguard, referrerPolicy settings (code sample)
#### 13.1.3 Rate limiting: express-rate-limit for general API (100 req/15min), stricter for auth endpoints (10 req/15min), IP-based with skip for internal IPs (code sample)
#### 13.1.4 CORS policy: whitelist of allowed origins, credentials support, preflight handling, strict origin validation in production
#### 13.1.5 File upload security: type validation (whitelist: jpg, png, pdf), size limits, virus scanning integration (ClamAV), random filename with original extension stripped, serve via controller not direct access

### 13.2 Data Security & Compliance
#### 13.2.1 Encryption at rest: AES-256 for sensitive documents (birth certificates, marksheets), field-level encryption for Aadhaar/SSN, MongoDB Client-Side Field Level Encryption
#### 13.2.2 TLS/SSL: HTTPS enforcement, HSTS header, valid SSL certificate (Let's Encrypt), secure cipher suites, redirect HTTP to HTTPS
#### 13.2.3 Backup strategy: automated daily database dumps at 2 AM, 7-day local retention, 30-day cloud retention (S3), quarterly archive, restore testing monthly
#### 13.2.4 Data privacy: GDPR compliance for international students (consent tracking, data portability, right to erasure), FERPA compliance for US (education records protection), data anonymization for analytics

### 13.3 Logging & Monitoring
#### 13.3.1 Application logging: Winston with rotating file transport, log levels (error, warn, info, debug), structured JSON format, correlation ID per request (code sample)
#### 13.3.2 Audit logging: immutable audit trail for all data mutations (who, what, when, old value, new value), separate audit collection/table, tamper detection
#### 13.3.3 API monitoring: request/response logging middleware, slow query detection (>500ms), error rate alerting, daily API usage report
#### 13.3.4 Health checks: /health endpoint (database connectivity, disk space, memory usage), /ready for Kubernetes readiness probe, uptime monitoring with UptimeRobot/Pingdom

### 13.4 Containerization & CI/CD
#### 13.4.1 Docker configuration: multi-stage Dockerfile for backend (node:20-alpine, dependency install, build, production stage), separate Dockerfile for frontend (nginx:alpine serve) (code sample)
#### 13.4.2 Docker Compose: local development stack with app, MongoDB, Redis, Nginx services, volume mounts for hot reload, network configuration
#### 13.4.3 CI/CD pipeline: GitHub Actions workflow — lint > test > build > push Docker image > deploy to staging > manual approval > production deploy (diagram: pipeline)
#### 13.4.4 Testing stages: unit tests (Jest), integration tests (Supertest), frontend tests (React Testing Library), code coverage threshold (80%), security scan (npm audit)
#### 13.4.5 Environment management: dev (local Docker), staging (cloud single-instance), production (multi-instance with load balancer), environment-specific config injection

### 13.5 Production Deployment
#### 13.5.1 Cloud deployment: AWS (EC2/ECS/EKS), DigitalOcean Droplets, or Heroku comparison with cost estimates for 10,000 student institution
#### 13.5.2 Nginx reverse proxy: SSL termination, gzip compression, rate limiting at edge, static file serving, upstream to Node.js app servers, WebSocket upgrade support (code sample)
#### 13.5.3 Process management: PM2 cluster mode (instances: max), auto-restart on crash, log aggregation, memory limit restart, deployment with zero-downtime reload
#### 13.5.4 Post-deployment: smoke test checklist, rollback strategy (blue-green or previous Docker image), database migration verification, CDN cache invalidation, monitoring dashboard confirmation

# References
## sms_requirements.md
- **Type**: Requirements analysis
- **Description**: Comprehensive requirements covering all 17 domains of school management
- **Path**: /mnt/agents/output/sms_requirements.md

## sms_structure.md
- **Type**: Structure design
- **Description**: Chapter hierarchy with word counts, required elements, and section breakdown
- **Path**: /mnt/agents/output/sms_structure.md

## sms.agent.outline.md
- **Type**: Report outline
- **Description**: This unified outline file
- **Path**: /mnt/agents/output/sms.agent.outline.md
