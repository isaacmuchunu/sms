## 1. Introduction & Project Overview

Educational institutions manage vast structured data — admissions, attendance, examination results, fee ledgers, transport schedules, hostel records. Most schools under five thousand students still rely on paper registers or disconnected spreadsheets. The School Management System (SMS) consolidates these fragmented workflows into a unified platform built on **Node.js** backend and **React** frontend.

### 1.1 Purpose and Scope

#### 1.1.1 Problem Statement

Paper-based administration creates compounding inefficiencies. Physical student files resist search and archival. Attendance manually keyed into spreadsheets invites transcription errors. Fee ledgers lack automated reconciliation. Critical communications — exam schedules, fee reminders, absence alerts — arrive late or are lost. These delays inflate clerical workload and deny parents visibility into their child's progress.

#### 1.1.2 Scope Boundaries

The SMS covers eleven modules: **Student Management**, **Teacher/Staff Management**, **Academic Management**, **Attendance Management**, **Examination & Grading**, **Fee & Finance Management**, **Library Management**, **Transport Management**, **Hostel Management**, **Communication & Notifications**, and **Reporting & Analytics**.

Explicit exclusions: **LMS** features (video lectures, SCORM); **payroll tax filing** and government submission (payslip generation is included); **multi-tenant federation** for multi-branch chains.

#### 1.1.3 Target User Personas

| Persona | Responsibilities | System Interaction |
|---|---|---|
| **School Administrator** | System config, user management, admission decisions | Full CRUD across all modules |
| **Principal** | Academic policy, staff approvals, discipline | Review and approval workflows |
| **Teacher** | Lesson planning, marks entry, attendance | Daily academic data entry |
| **Student** | Profile, timetable, results, fee payment | Read-heavy self-service |
| **Parent/Guardian** | Fee payment, attendance monitoring | Notification-driven |
| **Accountant** | Fee collection, reconciliation, reporting | Finance module only |
| **Librarian** | Catalog, issuance/return, fines | Library module only |
| **Transport Manager** | Routes, vehicles, stop assignment | Transport module only |
| **Hostel Warden** | Room allocation, night attendance | Hostel module only |

### 1.2 Functional Requirements Overview

#### 1.2.1 Core Module Inventory

| Priority | Modules |
|---|---|
| **Critical** | Student, Academic, Attendance, Authentication & Authorization |
| **High** | Examination, Fee & Finance, Teacher/Staff, Communication |
| **Medium** | Library, Transport, Hostel, Reporting & Analytics |

#### 1.2.2 User Role Matrix

RBAC defines fifteen predefined roles. **C** = Create/Write, **R** = Read, **–** = no access.

| Module | Admin | Principal | Teacher | Student | Parent | Accountant | Librarian |
|---|---|---|---|---|---|---|---|
| Student Mgmt | C/R | R | R (class) | R (self) | R (child) | – | – |
| Academic Mgmt | C/R | R | C/R (subject) | R | R | – | – |
| Attendance | C/R | R | C/R | R (self) | R (child) | – | – |
| Examination | C/R | C/R | C/R (marks) | R (self) | R (child) | – | – |
| Fee & Finance | C/R | R | – | R (self) | R (child) | C/R | – |
| Library | R | – | C/R | C/R (self) | – | – | C/R |
| Communication | C/R | C/R | C/R | R/C | R/C | – | – |
| Reports | C/R | C/R | R | R (self) | R (child) | C/R | C/R |

#### 1.2.3 Feature Comparison

| Capability | SMS | Fedena | OpenSIS | Google Classroom |
|---|---|---|---|---|
| Multi-stage admission workflow | Yes | Basic | Form-based | No |
| Auto timetable (constraint-based) | Yes | Manual | Manual | No |
| Fee invoicing & reconciliation | Full | Basic | Tracking only | No |
| Library circulation & fines | Full | Add-on | Basic | No |
| Transport GPS tracking | Yes | No | No | No |
| Hostel room/bed management | Full | Limited | No | No |
| Parent-teacher messaging | Threaded | Notice board | Email only | Summaries |
| Self-hosted deployment | Docker | Self-hosted | Self-hosted | SaaS only |

SMS differentiates through fee reconciliation, transport tracking, and hostel management — areas where alternatives offer minimal support.

### 1.3 Non-Functional Requirements

#### 1.3.1 Performance Benchmarks

**p95 API reads under 200ms**; complex writes under 5 seconds. Page loads under 3s on 4G. Supports **5,000 concurrent users**.

#### 1.3.2 Scalability

Stateless API instances behind a load balancer enable horizontal scaling. PostgreSQL read replicas isolate reporting from writes. CDN serves static assets; Redis caches reference data.

#### 1.3.3 Browser Compatibility

**Chrome 90+**, **Firefox 88+**, **Safari 14+**, **Edge 90+**. Responsive layout for tablet and mobile. PWA service workers enable offline reads and push notifications.

```mermaid
graph TB
    subgraph "Client Layer"
        A[React Frontend PWA]
        B[Browser]
    end
    subgraph "Edge & Distribution"
        D[CDN]
        E[Load Balancer]
    end
    subgraph "Application Layer"
        F[Node.js API]
        G[Node.js API]
        H[WebSocket Server]
    end
    subgraph "Data Layer"
        I[(PostgreSQL Primary)]
        J[(PostgreSQL Replica)]
        K[(Redis)]
        L[Object Store]
    end
    subgraph "External Services"
        M[SMS Gateway]
        N[Payment Gateway]
        O[Email Service]
        P[GPS Tracking API]
    end
    A --> D
    B --> E
    E --> F & G & H
    F --> I & J & K & L
    G --> I & J & K & L
    H --> K
    F --> M & N & O
    G --> P
```

Clients access the React frontend via CDN and APIs through the load balancer. Stateless Node.js instances serve REST and WebSocket traffic backed by PostgreSQL, Redis, and an object store. External integrations use provider-agnostic adapters.
## 2. System Architecture & Technology Stack

### 2.1 High-Level Architecture

#### 2.1.1 Monolithic Layered Architecture

The School Management System (SMS) adopts a **monolithic layered architecture** organized into four distinct layers. The **Presentation Layer** is a React Single Page Application (SPA) rendered in the browser, handling all UI rendering, form validation, and client-side state. The **API Gateway Layer** runs on Express.js and serves as the sole entry point for HTTP requests, managing routing, JWT verification, rate limiting, and request logging before forwarding to internal services. The **Business Logic Layer** contains domain-specific service modules — student management, attendance tracking, fee calculation, examination grading — isolating core rules from transport and storage concerns. The **Data Access Layer** uses Mongoose ODM (or Sequelize ORM) to abstract all database interactions, providing schema-validated queries and connection pooling without exposing raw driver APIs upstream.

School management domains share tightly coupled data relationships that would incur excessive inter-service communication overhead in a microservices layout, favoring a single deployable unit.

#### 2.1.2 Client-Server Communication

All client-server communication uses **HTTPS**. The API follows RESTful conventions with JSON payloads. **JSON Web Tokens (JWT)** provide stateless authentication: the server issues a signed access token after credential verification, and the client attaches it via the `Authorization: Bearer <token>` header on every subsequent request. This eliminates server-side session storage, enabling horizontal scaling without sticky-session requirements.

Real-time functionality — attendance notifications to parents, fee due reminders, admin announcements — uses **WebSocket connections via Socket.io**. The Socket.io server shares the Express HTTP instance and authenticates connections using the same JWT tokens passed during the handshake. Bidirectional events target specific rooms (`student:{id}`, `class:{id}`, `role:teacher`) to minimize broadcast overhead.

#### 2.1.3 Three-Tier Architecture Diagram

The following diagram illustrates the request flow from browser to database.

```mermaid
flowchart TD
    subgraph "Presentation Tier"
        Browser["Browser (React SPA)"]
    end

    subgraph "Application Tier"
        Nginx["Nginx Reverse Proxy"]
        NodeAPI["Express.js API Server"]
        SocketIO["Socket.io Server"]
        Redis[("Redis Cache")]
    end

    subgraph "Data Tier"
        MongoDB[("MongoDB 7.x")]
        PostgreSQL[("PostgreSQL 15 (alt.)")]
    end

    Browser -->|"HTTPS / REST + WS"| Nginx
    Nginx -->|"/api/*"| NodeAPI
    Nginx -->|"/ws"| SocketIO
    NodeAPI -->|"Query / Cache"| Redis
    NodeAPI -->|"Mongoose ODM"| MongoDB
    NodeAPI -->|"Sequelize ORM"| PostgreSQL
    SocketIO -.->|"Shared HTTP"| NodeAPI
```

### 2.2 Technology Stack Selection

#### 2.2.1 Backend Stack: Node.js 20 LTS with Express.js 4.x

The server runtime is **Node.js 20 LTS**, selected for its non-blocking event-driven architecture that handles the I/O-bound workloads typical of school management systems — concurrent database queries, file uploads, and third-party API calls. Node.js processes requests on a lightweight event loop rather than consuming OS threads, enabling thousands of concurrent connections on modest hardware. **Express.js 4.x** provides a minimal routing and middleware layer; its middleware pattern allows composable addition of authentication, validation, logging, and error handling across all routes. The npm ecosystem supplies battle-tested libraries for every subsystem requirement.

#### 2.2.2 Frontend Stack: React 18 with Functional Components and Hooks

The client application is built on **React 18**, leveraging concurrent rendering features (Automatic Batching, Transitions, Suspense boundaries) for responsive performance during data-heavy operations. All components use the **functional component pattern with Hooks** — `useState` for local state, `useEffect` for side effects, and custom hooks for reusable data-fetching logic. **React Router v6** handles client-side navigation with nested routes, route guards, and lazy-loaded components to reduce initial bundle size. The build toolchain uses **Vite**, providing sub-second development server startup and optimized production builds via Rollup with tree-shaking and code splitting.

#### 2.2.3 Database Selection: MongoDB vs. PostgreSQL

The primary deployment target is **MongoDB 7.x** with **Mongoose 8.x** as the ODM. MongoDB's document-oriented model accommodates evolving school data schemas: student records accumulate fields over time (transfer history, disciplinary notes, extracurricular achievements), eliminating costly migration scripts when requirements change. The architecture retains PostgreSQL 15 compatibility via Sequelize ORM for deployments requiring strict relational consistency or ACID compliance across financial transactions.

| Criterion | MongoDB 7.x + Mongoose | PostgreSQL 15 + Sequelize |
|-----------|------------------------|---------------------------|
| **Data Model** | Document-oriented, schema-flexible collections | Relational, strictly typed tables |
| **Schema Evolution** | Native — add fields without migration | Requires ALTER TABLE migrations |
| **Query Pattern** | Embedded subdocuments reduce joins | SQL JOINs for complex relationships |
| **ACID Transactions** | Multi-document transactions (since 4.0) | Full ACID compliance, row-level locking |
| **Scaling** | Horizontal sharding built-in | Read replicas; vertical scaling primary |
| **Use Case Fit** | Rapid iteration, nested data (student profiles) | Financial records, reporting, compliance |
| **Recommended For** | Primary SMS deployment | Fee/finance module, audit reporting |
| **Learning Curve** | Low for JavaScript developers | Requires SQL proficiency |

For most deployments, MongoDB handles the core workload while PostgreSQL serves as a secondary read replica for financial reporting where relational integrity is paramount.

#### 2.2.4 Supporting Libraries

Key production-grade npm packages include `jsonwebtoken` and `bcrypt` for authentication, `multer` for file uploads, `nodemailer` and `socket.io` for communication, `joi` for validation, `winston` for logging, `helmet` and `express-rate-limit` for security, and `dotenv` with `nodemon` for process management.

### 2.3 Project Structure

#### 2.3.1 Monorepo Organization

The project uses a **single-repository monorepo** with separate `client/` and `server/` directories at the root level. This balances the isolation benefits of separate repositories with the coordination advantages of a unified codebase: atomic commits spanning both layers, simplified CI/CD configuration, and consistent code review. Each directory contains its own `package.json` for independent dependency management. A root-level `package.json` defines workspace scripts for concurrent development startup and shared linting.

#### 2.3.2 Backend Directory Structure

The server directory separates configuration, routing, business logic, and data access into distinct folders.

```
server/
├── config/
│   ├── db.js                  # MongoDB connection
│   └── env.js                 # Env validator
├── controllers/               # HTTP request handlers
│   ├── authController.js
│   ├── studentController.js
│   ├── teacherController.js
│   └── feeController.js
├── models/                    # Mongoose schemas
│   ├── User.js
│   ├── Student.js
│   └── Class.js
├── routes/
│   ├── index.js               # Route aggregator
│   ├── authRoutes.js
│   └── studentRoutes.js
├── middleware/
│   ├── auth.js                # JWT verification
│   ├── errorHandler.js
│   ├── validate.js            # Joi wrapper
│   └── upload.js              # Multer config
├── services/                  # Business logic
│   ├── studentService.js
│   ├── feeCalculationService.js
│   └── notificationService.js
├── utils/
│   ├── ApiResponse.js
│   ├── logger.js              # Winston instance
│   └── helpers.js
├── uploads/                   # File storage
├── .env.example
├── package.json
└── server.js
```

Controllers handle HTTP concerns exclusively; services encapsulate domain rules independent of transport, enabling unit testing without an HTTP server; middleware contains cross-cutting concerns applied via Express's `app.use()` pattern.

#### 2.3.3 Frontend Directory Structure

The client directory organizes React components by feature domain while maintaining shared infrastructure in top-level folders.

```
client/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── common/            # Buttons, Modals, Tables
│   │   ├── layout/            # Sidebar, Header, Footer
│   │   └── dashboard/         # KPI cards, Charts
│   ├── pages/                 # Route-level components
│   │   ├── students/
│   │   ├── teachers/
│   │   └── fees/
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useFetch.js
│   │   └── useForm.js
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── services/
│   │   ├── api.js             # Axios instance
│   │   └── studentService.js
│   ├── utils/
│   │   ├── constants.js
│   │   └── formatters.js
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── package.json
└── vite.config.js
```

The feature-based organization under `src/pages/` mirrors the backend module structure. The `src/services/api.js` file configures a single Axios instance with request interceptors for JWT attachment and response interceptors for global error handling and token refresh.

### 2.4 Development Environment Setup

#### 2.4.1 Prerequisites

Verify the following dependencies are installed. Version compatibility is enforced via the `engines` field in `package.json`.

- **Node.js** 20 LTS or newer (`node --version`). Node.js 20 provides the native `fetch` API, built-in Test Runner, and V8 performance improvements.
- **npm** 10+ (bundled with Node.js 20).
- **MongoDB** 7.x Community Edition locally, or a MongoDB Atlas cluster.
- **PostgreSQL** 15+ (optional — for relational deployments only).
- **Redis** 7+ for caching, session token blacklisting, and Socket.io adapter storage.
- **Git** 2.40+.

All database services can alternatively run via Docker Compose.

#### 2.4.2 Environment Variables Template

The application externalizes all configuration through environment variables. Copy `.env.example` to `.env` and populate with deployment-specific values.

```env
# .env.example — server-side configuration
# Copy to .env and fill in deployment-specific values.

# Server
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL=mongodb://localhost:27017/school_management
# DATABASE_URL=postgresql://user:pass@localhost:5432/school_db

# JWT Authentication
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your_refresh_secret_key
REFRESH_TOKEN_EXPIRES_IN=7d

# Email (Nodemailer SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_smtp_username
EMAIL_PASS=your_smtp_app_password
EMAIL_FROM=noreply@yourschool.edu

# SMS Gateway
SMS_API_KEY=your_sms_api_key
SMS_API_URL=https://api.smsprovider.com/send
SMS_SENDER_ID=SCHOOL

# Redis
REDIS_URL=redis://localhost:6379

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Client URL (CORS, email links)
CLIENT_URL=http://localhost:5173
```

The `JWT_SECRET` and `REFRESH_TOKEN_SECRET` must be cryptographically random strings of at least 32 characters, generated via `openssl rand -base64 64`. Separate secrets for access and refresh tokens prevent a compromised access token secret from invalidating the refresh token infrastructure.

#### 2.4.3 Development Workflow

The development environment uses `concurrently` to start both the backend API server and the Vite development server from a single terminal command. The root `package.json` defines the following workspace scripts:

```json
{
  "name": "school-management-system",
  "private": true,
  "workspaces": ["client", "server"],
  "scripts": {
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "server": "cd server && npm run dev",
    "client": "cd client && npm run dev"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

Running `npm run dev` from the project root starts the Express server with `nodemon` (auto-restart on file changes) and the Vite client dev server with Hot Module Replacement (HMR). The backend serves the REST API on `http://localhost:5000`; the React dev server runs on `http://localhost:5173` with API requests proxied via Vite's `server.proxy` configuration.

Database seed scripts in `server/config/seed.js` populate the development database with realistic test data — sample students, teachers, class sections, and fee structures — enabling immediate frontend development. Execute via `npm run seed` in the server directory. The seed script truncates existing collections before insertion.

```mermaid
flowchart LR
    subgraph "Internet"
        Users["Users / Parents / Staff"]
    end

    subgraph "Edge Layer"
        CDN["Cloudflare CDN"]
        NginxProd["Nginx Reverse Proxy"]
    end

    subgraph "Application Layer"
        PM2["PM2 Process Manager"]
        Node1["Node.js :5001"]
        Node2["Node.js :5002"]
        Node3["Node.js :5003"]
    end

    subgraph "Data Layer"
        MongoRepl["MongoDB Replica Set"]
        RedisProd["Redis Cluster"]
    end

    subgraph "Storage"
        S3["S3 Object Storage"]
    end

    Users --> CDN
    CDN --> NginxProd
    NginxProd -->|"Load Balance"| PM2
    PM2 --> Node1 & Node2 & Node3
    Node1 & Node2 & Node3 -->|"Read/Write"| MongoRepl
    Node1 & Node2 & Node3 -->|"Cache"| RedisProd
    MongoRepl -->|"Snapshots"| S3
    Node1 -->|"Uploads"| S3
```
# 3. Database Design & Schema

This chapter defines the MongoDB configuration, entity schemas, and indexing strategy using Mongoose ODM.

## 3.1 Database Configuration

### 3.1.1 MongoDB Connection Setup

The `config/database.js` connection configures pooling (`poolSize: 10`), exponential backoff retry (1s start, 30s cap, 5 attempts), and `strictQuery: true` for Mongoose 8.x compatibility. Production uses replica sets with `readPreference=secondaryPreferred`.

### 3.1.2 Database Seeding Strategy

The `scripts/seed.js` bootstrap creates academic years, classes Grade 1–12 with sections A–D, core subjects, a `super_admin` user, and 200 sample students via `insertMany` with `ordered: false`.

### 3.1.3 Migration Strategy

Schema evolution uses `migrate-mongo` with state stored in a `changelog` collection. Migrations export `up` and `down` functions following the `YYYYMMDDHHMMSS-descriptive-name.js` convention, wrapping multi-document changes in transactions.

## 3.2 Core Entity Schema Definitions

### 3.2.1 User Schema

All schemas include `createdAt`/`updatedAt` timestamps and `.trim()` on String fields. The User schema anchors authentication with a restricted `role` enum.

```javascript
// src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema({
  email: {
    type: String, required: [true, 'Email is required'],
    unique: true, lowercase: true, trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format']
  },
  password: {
    type: String, required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'teacher', 'student', 'parent',
           'accountant', 'librarian', 'transport_manager', 'warden'],
    required: true, index: true
  },
  status: {
    type: String, enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  lastLogin: { type: Date, default: null }
}, { timestamps: true });

userSchema.index({ role: 1, status: 1 });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  next();
});

userSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
```

The `select: false` option prevents password leakage unless explicitly requested with `.select('+password')`. The `{ role: 1, status: 1 }` compound index optimizes active user lookups.

### 3.2.2 Student Schema

The Student schema stores personal and enrollment data, referencing Class, Section, and AcademicYear rather than embedding them.

```javascript
// src/models/Student.js
const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  addressType: { type: String, enum: ['permanent', 'correspondence'], required: true },
  street: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  postalCode: { type: String, required: true, trim: true },
  country: { type: String, default: 'India', trim: true },
  isPrimary: { type: Boolean, default: false }
}, { _id: true });

const studentSchema = new mongoose.Schema({
  admissionNo: { type: String, required: true, unique: true, immutable: true, trim: true },
  rollNo: { type: String, required: true, trim: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  dob: { type: Date, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
  photoUrl: { type: String, default: null },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true, index: true },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  addresses: [addressSchema],
  guardianIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Guardian' }],
  enrollmentDate: { type: Date, default: Date.now },
  admissionType: { type: String, enum: ['new', 'transfer', 'readmission'], default: 'new' },
  previousSchool: { type: String, trim: true },
  medicalNotes: { type: String, default: '', trim: true },
  specialNeeds: { type: String, default: '', trim: true },
  status: {
    type: String, enum: ['active', 'inactive', 'transferred', 'withdrawn', 'alumni'],
    default: 'active', index: true
  }
}, { timestamps: true });

studentSchema.index({ rollNo: 1, classId: 1, sectionId: 1, academicYearId: 1 }, { unique: true });
studentSchema.index({ status: 1, classId: 1, sectionId: 1 });

module.exports = mongoose.model('Student', studentSchema);
```

Addresses embed (cardinality bounded at two, always queried with student). Guardian IDs reference (guardians link to multiple students). `immutable: true` on `admissionNo` prevents changes; the unique compound index `{ rollNo, classId, sectionId, academicYearId }` enforces roll uniqueness per class-section-year.

### 3.2.3 Teacher and Guardian Schemas

The **Teacher** schema (`Staff`) extends User via `userId`. Fields: `staffId` (`EMP-YYYY-SEQUENCE`), `qualifications`, `subjectSpecializations`, `department`, `joiningDate`, `employmentType` enum, `salaryDetails` (embedded), `assignedClasses`, and `biometricId`. Salary embeds because it is always accessed with the staff record.

The **Guardian** schema links to multiple students via `studentIds`. The `relationship` enum is `['father', 'mother', 'guardian']`, `priorityOrder` sets notification precedence, and `isEmergencyContact` flags the crisis contact. A unique index on `phone` enforces distinct numbers.

## 3.3 Academic Entity Schemas

### 3.3.1 Class Schema

Classes represent grade levels; sections embed as sub-documents (typically A–D) because they belong exclusively to one class. Each section stores `name`, `capacity` (default 40), `classTeacherId`, `roomNumber`, and `status`.

### 3.3.2 Subject and Timetable Schemas

The **Subject** schema defines `name`, `code`, `type` enum (`core`, `elective`, `co-curricular`), `credits`, and `classIds`. Core subjects require 5 periods per week, electives 3, co-curricular 2.

The **Timetable** schema stores entries as sub-documents with `dayOfWeek`, `periodNo`, `startTime`, `endTime`, `subjectId`, `teacherId`, `classId`, `sectionId`, and `isSubstitution`. A compound index on `{ classId: 1, sectionId: 1, academicYearId: 1 }` optimizes lookups.

## 3.4 Transactional and Auxiliary Schemas

### 3.4.1 Attendance Schema

Attendance records daily and subject-wise records. `subjectId` is null for daily tracking, populated for subject-wise.

```javascript
// src/models/Attendance.js
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  date: { type: Date, required: true, index: true },
  status: { type: String, enum: ['present', 'absent', 'late', 'half-day', 'excused'], required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  markedVia: { type: String, enum: ['manual', 'biometric', 'rfid', 'mobile_app', 'bulk_upload'], default: 'manual' },
  remarks: { type: String, maxlength: 500, trim: true },
  isRegularized: { type: Boolean, default: false },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true }
}, { timestamps: true });

attendanceSchema.index({ studentId: 1, date: -1 });
attendanceSchema.index({ classId: 1, sectionId: 1, date: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
```

The `{ studentId: 1, date: -1 }` compound index optimizes attendance history lookups. `isRegularized` tracks corrections requiring admin approval.

### 3.4.2 Examination Schemas

The examination module uses three schemas: **Exam** (session definition), **ExamSchedule** (subject-wise scheduling), and **Marks** (student results). Exam defines `name`, `type` enum, `startDate`, `endDate`, and `academicYearId`. ExamSchedule links exams to subjects with `examId`, `subjectId`, `date`, `startTime`, `endTime`, `maxMarks`, and `passingMarks`. Marks stores `studentId`, `examScheduleId`, `marksObtained`, `grade`, `gradePoint`, `status` (`entered`, `verified`, `finalized`), and audit fields. A unique index on `{ studentId: 1, examScheduleId: 1 }` prevents duplicates.

### 3.4.3 Fee Schema

The fee module uses three schemas. **FeeHead** defines categories (`name`, `type` enum, `frequency`). **FeeStructure** links FeeHead to a class (`classId`, `feeHeadId`, `amount`, effective dates). **FeePayment** records transactions:

```javascript
// src/models/FeePayment.js
const mongoose = require('mongoose');

const feePaymentSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  feeStructureId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeStructure', required: true },
  amountPaid: { type: Number, required: true, min: 0 },
  paymentMode: { type: String, enum: ['cash', 'cheque', 'dd', 'upi', 'card', 'bank_transfer'], required: true },
  transactionId: { type: String, trim: true, default: null },
  receiptNo: { type: String, required: true, unique: true, trim: true },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'], default: 'pending' },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  remarks: { type: String, trim: true, maxlength: 500 }
}, { timestamps: true });

feePaymentSchema.index({ studentId: 1, status: 1 });
feePaymentSchema.index({ createdAt: -1, status: 1 });

module.exports = mongoose.model('FeePayment', feePaymentSchema);
```

The unique `receiptNo` index enforces sequential numbering for audit compliance. The `{ studentId: 1, status: 1 }` compound index accelerates outstanding fee queries. `transactionId` stores payment gateway references for reconciliation.

### 3.4.4 Library Schemas

The **Book** schema stores `title`, `authors`, `isbn`, `publisher`, `publicationYear`, `categoryId`, `classificationNo`, `totalCopies`, `availableCopies`, and `keywords`. A text index on `title`, `authors`, `isbn`, and `keywords` powers `$text` search. The **BookIssue** schema tracks circulation with `bookCopyId`, `userId`, `issueDate`, `dueDate`, `returnDate`, `fineAmount`, and `status`. An index on `{ userId: 1, status: 1 }` finds active loans to enforce issue limits.

## 3.5 Schema Relationships and Indexing

### 3.5.1 Referencing vs. Embedding Decision Matrix

| Relationship Pattern | Strategy | Example | Rationale |
|---|---|---|---|
| 1:1 | **Embed** | Address within Student | Always accessed together; limited cardinality |
| 1:few (< 10) | **Embed** | Sections within Class | Bounded growth; atomic updates with parent |
| 1:many (> 10) | **Reference** | Attendance records → Student | Unbounded growth; avoids document bloat |
| Many:many | **Reference** | Teachers ↔ Classes via Timetable | Both sides query independently |
| Audit/history | **Reference (separate)** | FeePayment → Student | Immutable records; separate access patterns |
| Hierarchical | **Reference with parentId** | BookCategory tree | Self-referencing for arbitrary depth |

This framework is illustrated by addresses (embed, max two) versus guardians (reference, link to multiple students).

### 3.5.2 Critical Indexes and Entity Relationships

The following ER diagram shows the primary relationships across all modules:

```mermaid
erDiagram
    USER ||--o{ STUDENT : "authenticates"
    USER ||--o{ STAFF : "authenticates"
    USER ||--o{ GUARDIAN : "authenticates"
    STUDENT ||--o{ ATTENDANCE : "has"
    STUDENT ||--o{ FEE_PAYMENT : "pays"
    STUDENT ||--o{ MARKS : "receives"
    STUDENT }o--o{ GUARDIAN : "linked via guardianIds"
    STUDENT }o--|| CLASS : "enrolled in"
    STUDENT }o--|| SECTION : "assigned to"
    CLASS ||--o{ SECTION : "contains"
    CLASS ||--o{ FEE_STRUCTURE : "charged"
    TIMETABLE ||--o{ TIMETABLE_ENTRY : "entries"
    TIMETABLE_ENTRY }o--|| SUBJECT : "teaches"
    TIMETABLE_ENTRY }o--|| STAFF : "assigned"
    EXAM ||--o{ EXAM_SCHEDULE : "schedules"
    EXAM_SCHEDULE ||--o{ MARKS : "records"
    EXAM_SCHEDULE }o--|| SUBJECT : "tests"
    BOOK ||--o{ BOOK_ISSUE : "circulates"
    STUDENT ||--o{ BOOK_ISSUE : "borrows"
    ACADEMIC_YEAR ||--o{ CLASS : "hosts"
```

Student sits at the center connecting to attendance, fees, marks, library, and guardian records. Crow's feet denote one-to-many; circles on both ends indicate many-to-many associations.

```mermaid
graph TD
    A[Student Collection] -->|unique| A1[admissionNo_1]
    A -->|compound| A2[status_1_classId_1_sectionId_1]
    A -->|compound unique| A3[rollNo_1_classId_1_sectionId_1_academicYearId_1]
    B[Attendance Collection] -->|compound| B1[studentId_1_date_-1]
    B -->|compound| B2[classId_1_sectionId_1_date_-1]
    C[FeePayment Collection] -->|compound| C1[studentId_1_status_1]
    C -->|unique| C2[receiptNo_1]
    D[Book Collection] -->|text| D1[title_authors_isbn_keywords]
```

Critical cross-cutting indexes include: Attendance `{ studentId: 1, date: -1 }` for monthly percentage calculations; Student unique `admissionNo`; FeePayment `{ studentId: 1, status: 1 }` for defaulters reports; and Book text index for catalog search. Production indexes use `background: true`.

### 3.5.3 Cascade Delete and Data Integrity

MongoDB lacks foreign key constraints, so integrity is enforced at the application layer. A `deletedAt` field implements soft deletion. The `pre('remove')` hook on Student checks for dependent records and throws `DependencyError` if any exist.

Multi-document operations wrap in MongoDB transactions via `mongoose.startSession()`. Start a session, execute writes within it, commit on success, or abort on error. This ensures fee payments and receipts remain synchronized.
## 4. Backend Architecture & API Design

### 4.1 Node.js Application Architecture

The SMS backend is a monolithic Express.js application organized into four layers: HTTP handling (routes and controllers), business logic (services), data access (Mongoose models), and cross-cutting utilities (middleware, validators, helpers). This separation enforces single-responsibility principles and enables unit testing of each layer in isolation. The application bootstraps through `server.js`, which initializes the Express app, mounts the middleware pipeline, registers modular routes, attaches global error handling, and starts the HTTP listener.

#### 4.1.1 Express.js Bootstrap

The `server.js` entry point creates the Express application, establishes the MongoDB connection, mounts middleware, registers routes under `/api/v1`, and starts the server. Process-level handlers for unhandled promise rejections and uncaught exceptions trigger graceful shutdown with a non-zero exit code, preventing silent failures in production.

```javascript
// server.js
const express = require('express');
const mongoose = require('mongoose');
const { createServer } = require('http');
const config = require('./config/env');
const { mountMiddleware } = require('./middleware');
const routes = require('./routes');
const { globalErrorHandler } = require('./middleware/error.middleware');
const { logger } = require('./utils/logger');

const app = express();
const httpServer = createServer(app);

// Database connection with connection pooling
mongoose.connect(config.databaseUrl, { maxPoolSize: 10 })
  .then(() => logger.info('MongoDB connected'))
  .catch((err) => { logger.error('MongoDB connection failed', err); process.exit(1); });

// Middleware pipeline, routes, and error handler
mountMiddleware(app);
app.use('/api/v1', routes);
app.use(globalErrorHandler);

const PORT = config.port || 5000;
httpServer.listen(PORT, () => logger.info(`Server running on port ${PORT}`));

// Process-level safeguards
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason });
  httpServer.close(() => process.exit(1));
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  httpServer.close(() => process.exit(1));
});
```

#### 4.1.2 Middleware Pipeline

Every request traverses a fixed middleware chain before reaching a route handler. The sequence matters: security headers execute first, followed by request parsing and sanitization, then authentication and logging, then route handlers, and finally error handling at the end.

```mermaid
flowchart LR
    A["Helmet<br/>security headers"] --> B["Compression<br/>gzip response"]
    B --> C["CORS<br/>origin policy"] --> D["Request ID<br/>uuid injection"]
    D --> E["Morgan<br/>HTTP logging"] --> F["express.json()<br/>body parsing"]
    F --> G["mongoSanitize<br/>NoSQL injection guard"]
    G --> H["xssClean<br/>script tag removal"]
    H --> I["Route Handlers<br/>/api/v1/*"]
    I --> J["globalErrorHandler<br/>response formatting"]
    style A fill:#e8f4fd,stroke:#1976d2
    style F fill:#e8f5e9,stroke:#388e3c
    style G fill:#fce4ec,stroke:#c62828
    style I fill:#f3e5f5,stroke:#7b1fa2
    style J fill:#ffebee,stroke:#b71c1c
```

Helmet sets Content-Security-Policy, HSTS, and X-Content-Type-Options headers. Compression reduces JSON payload sizes for large collection responses. CORS restricts cross-origin access to whitelisted domains. A custom request-ID middleware injects a `x-request-id` header for distributed tracing. `express-mongo-sanitize` removes `$` and `.` characters from request bodies to prevent NoSQL injection, and `xss-clean` strips script tags to mitigate XSS attacks.

#### 4.1.3 Centralized Error Handling

The backend distinguishes **operational errors** (expected conditions such as invalid input or missing resources) from **programming errors** (unexpected bugs such as null dereferences). The `AppError` class extends `Error` and carries an HTTP status code and an `isOperational` flag. The global error middleware intercepts all thrown errors, checks the error type, and formats a consistent JSON response. Mongoose-specific errors — ValidationError, duplicate key (code 11000), CastError — are converted to operational errors with appropriate status codes.

```javascript
// utils/AppError.js & middleware/error.middleware.js
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;

  if (err.isOperational) {
    return res.status(err.statusCode).json({ success: false, message: err.message, status: err.status });
  }
  // Mongoose error translations
  if (err.name === 'ValidationError') {
    const msgs = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, message: `Validation failed: ${msgs.join('. ')}` });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ success: false, message: `Duplicate value for ${field}` });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: `Invalid ${err.path}: ${err.value}` });
  }
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
  res.status(500).json({ success: false, message: 'Internal server error' });
};

module.exports = { AppError, globalErrorHandler };
```

#### 4.1.4 Async Handler Wrapper

The `catchAsync` utility wraps async route handlers, automatically catching rejected promises and forwarding errors to the global error middleware via `next(err)`. This eliminates repetitive `try-catch` blocks across every controller function.

```javascript
// utils/catchAsync.js
const catchAsync = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const handleAsync = (fn, statusCode = 200) => (req, res, next) => {
  fn(req, res, next).then((data) => {
    res.status(statusCode).json({ success: true, data, message: data?.message || 'Success', meta: data?.meta || null });
  }).catch(next);
};

module.exports = { catchAsync, handleAsync };
```

### 4.2 Modular Routing Structure

The backend organizes routes by domain module — each functional area has its own route file, controller directory, service layer, and Mongoose model. All module routes aggregate through a single `routes/index.js` registry mounted under `/api/v1`.

#### 4.2.1 Route Aggregation

The index router imports every module-level router and mounts it at a logical sub-path. This central registry is the single source of truth for all API endpoints and ensures a consistent versioning strategy.

```javascript
// routes/index.js
const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/students', require('./student.routes'));
router.use('/teachers', require('./teacher.routes'));
router.use('/classes', require('./class.routes'));
router.use('/sections', require('./section.routes'));
router.use('/subjects', require('./subject.routes'));
router.use('/timetables', require('./timetable.routes'));
router.use('/attendance', require('./attendance.routes'));
router.use('/fees', require('./fee.routes'));
router.use('/exams', require('./exam.routes'));
router.use('/library', require('./library.routes'));
router.use('/transport', require('./transport.routes'));
router.use('/hostel', require('./hostel.routes'));
router.use('/announcements', require('./announcement.routes'));

module.exports = router;
```

#### 4.2.2 Controller-Service-Repository Pattern

Controllers remain thin, handling only HTTP concerns: extracting request parameters, delegating to services, and returning responses. Services encapsulate business logic and cross-model coordination. Models (through Mongoose) provide data access and schema-level constraints. For example, a student creation controller extracts the request body, calls `StudentService.create()`, and returns the result. The service validates business rules (admission number uniqueness, age requirements) before persisting via `Student.create()`.

#### 4.2.3 Route Protection

Each route applies a middleware chain of authentication, authorization, and validation. The `authenticate` middleware verifies the JWT from the `Authorization: Bearer <token>` header and attaches the decoded user to `req.user`. The `authorize(roles...)` factory checks `req.user.role` against an allowed array and returns `403 Forbidden` for unauthorized access. The `validate(schema)` middleware runs Joi validation against `req.body` and returns `400 Bad Request` with field-level errors.

### 4.3 RESTful API Endpoint Design

The SMS API follows REST conventions: plural nouns for resources (`/students`, `/teachers`), nested sub-resources (`/classes/:id/sections`), and HTTP method mapping to CRUD semantics (POST create, GET read, PUT/PATCH update, DELETE remove). Query parameters handle filtering (`?status=active`), sorting (`?sort=-createdAt`), and pagination (`?page=2&limit=25`).

#### 4.3.1 Resource Naming Conventions

Actions that do not map cleanly to CRUD use POST endpoints with descriptive sub-resource paths: `POST /attendance/mark` for bulk marking, `POST /teachers/:id/assign-class` for class assignment. Collection endpoints support list operations with filtering and pagination. Nested endpoints expose related data without requiring separate queries, reducing client round-trips.

#### 4.3.2 API Endpoint Reference

The following table catalogs the primary Student module endpoints.

| Method | Endpoint | Required Role | Description |
|--------|----------|---------------|-------------|
| GET | `/students` | Admin, Teacher, Principal | List students with pagination; filter by class, section, status, search by name or admission number |
| GET | `/students/:id` | Admin, Teacher, Student (self), Parent | Retrieve student profile with guardian and address details |
| POST | `/students` | Admin, Admission Officer | Enroll a new student; validates admission number uniqueness and age requirements |
| PUT | `/students/:id` | Admin, Teacher | Full update of student profile including address and guardian information |
| DELETE | `/students/:id` | Admin | Soft-delete; blocked if fee dues or active library transactions exist |
| GET | `/students/:id/attendance` | Admin, Teacher, Student, Parent | Monthly attendance summary with percentage calculation |
| GET | `/students/:id/fees` | Admin, Accountant, Student, Parent | Fee ledger: invoices, receipts, outstanding balance, payment history |

#### 4.3.3 Teacher Endpoints

Teacher endpoints follow the same CRUD pattern with sub-resources: `GET /teachers/:id/classes` returns assigned class-sections, `GET /teachers/:id/timetable` returns the weekly schedule, `POST /teachers/:id/assign-class` links a teacher to a section (validating no timetable conflicts), and `GET /teachers/:id/workload` aggregates periods per week.

#### 4.3.4 Academic Endpoints

The `/classes` collection supports full CRUD; `GET /classes/:id/sections` enumerates sections and `POST /classes/:id/sections` creates one with automatic class teacher assignment. `/subjects` supports category filtering (`?category=core|elective|co-curricular`). `/timetables` stores timetable headers, and `/timetables/:id/entries` manages schedule rows with teacher and room availability validation.

#### 4.3.5 Attendance Endpoints

`POST /attendance/mark` accepts a bulk array of `{ studentId, classSectionId, date, status, subjectId?, remarks? }` and enforces uniqueness per student per date. `GET /attendance/report` generates class-wise summaries with present, absent, and late counts. `PUT /attendance/:id` allows corrections within a 7-day window; later changes require admin approval.

#### 4.3.6 Fee Endpoints

`/fee-structures` manages class-wise and category-wise fee amounts. `POST /fee-payments/record` records a payment with mode, amount, and transaction reference, auto-generating a unique receipt number. `GET /fee-payments/receipt/:receiptNo` retrieves receipt details for reprinting. `GET /fees/reports/outstanding` generates aging analysis (0-30, 31-60, 61-90, 90+ days past due).

#### 4.3.7 Auxiliary Module Endpoints

Library management provides `GET /library/books` (catalog search), `POST /library/transactions/issue` (issuance with due-date calculation), and `POST /library/transactions/:id/return` (return with automatic fine computation). Transport offers `/transport/routes` and `/transport/vehicles` with stop sequencing. Hostel exposes `/hostel/rooms` (with vacancy status) and `/hostel/allocations` for room assignment.

```mermaid
graph TB
    subgraph API["API Module Structure (/api/v1)"]
        A["/auth"] --> B["/students<br/>CRUD + attendance + fees"]
        A --> C["/teachers<br/>CRUD + classes + timetable"]
        A --> D["/classes<br/>CRUD + sections"]
        A --> E["/subjects<br/>CRUD + teachers"]
        A --> F["/timetables<br/>CRUD + entries"]
        A --> G["/attendance<br/>mark + report"]
        A --> H["/fees<br/>structures + payments + reports"]
        A --> I["/exams<br/>schedules + marks + results"]
        A --> J["/library<br/>books + transactions"]
        A --> K["/transport<br/>routes + vehicles"]
        A --> L["/hostel<br/>rooms + allocations"]
    end
    style A fill:#fff3e0,stroke:#e65100
    style B fill:#e8f4fd,stroke:#1565c0
    style C fill:#e8f4fd,stroke:#1565c0
    style G fill:#f3e5f5,stroke:#6a1b9a
    style H fill:#fce4ec,stroke:#ad1457
    style J fill:#e0f2f1,stroke:#00695c
    style K fill:#e0f2f1,stroke:#00695c
    style L fill:#e0f2f1,stroke:#00695c
```

### 4.4 Request Validation & Sanitization

All incoming data passes through validation and sanitization before reaching controller logic. `express-mongo-sanitize` replaces `$` and `.` characters in request bodies to prevent NoSQL injection. `xss-clean` strips HTML script tags to mitigate XSS. All string inputs receive `.trim()` treatment through Joi to eliminate whitespace-related query failures.

#### 4.4.1 Joi Validation Schemas

Joi defines schemas for every write operation, chaining constraints such as `.required()`, `.email()`, `.min()`, `.max()`, and `.valid()`. Custom validators handle domain-specific rules: phone numbers use E.164 regex patterns, and a custom `objectIdValidator` checks MongoDB identifier format.

```javascript
// validators/student.validator.js
const Joi = require('joi');
const { objectIdValidator } = require('./customValidators');

const phoneRegex = /^\+?[1-9]\d{1,14}$/;

const studentCreateSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).required(),
  lastName: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().trim().email().lowercase().max(100),
  phone: Joi.string().trim().pattern(phoneRegex).required(),
  dateOfBirth: Joi.date().iso().max('now').required(),
  gender: Joi.string().valid('male', 'female', 'other').required(),
  bloodGroup: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
  admissionNumber: Joi.string().trim().alphanum().min(5).max(20).required(),
  rollNumber: Joi.string().trim().alphanum().max(15),
  classId: Joi.string().custom(objectIdValidator).required(),
  sectionId: Joi.string().custom(objectIdValidator).required(),
  academicYearId: Joi.string().custom(objectIdValidator).required(),
  category: Joi.string().valid('general', 'sc', 'st', 'obc', 'other').default('general'),
  address: Joi.object({
    street: Joi.string().trim().max(200).required(),
    city: Joi.string().trim().max(100).required(),
    state: Joi.string().trim().max(100).required(),
    postalCode: Joi.string().trim().pattern(/^\d{6}$/).required(),
    country: Joi.string().trim().max(50).default('India'),
  }).required(),
  guardians: Joi.array().items(Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    relationship: Joi.string().valid('father', 'mother', 'guardian').required(),
    phone: Joi.string().pattern(phoneRegex).required(),
    email: Joi.string().email().lowercase(),
    isPrimaryContact: Joi.boolean().default(false),
  })).min(1).max(5).required(),
  admissionType: Joi.string().valid('new', 'transfer', 'readmission').default('new'),
}).options({ stripUnknown: true });

module.exports = { studentCreateSchema };
```

### 4.5 Response Standardization

Every API response follows a uniform envelope: `{ success: boolean, data: object|null, message: string, meta: { page, limit, total } }`. Controllers use the `sendResponse` utility rather than calling `res.json()` directly, ensuring predictable response shapes across all endpoints. List endpoints accept `page` and `limit` query parameters (defaults: page=1, limit=25, max=100), compute `skip = (page - 1) * limit` for MongoDB queries, and include pagination metadata so the frontend can render accurate page controls.

The API adheres to strict HTTP status code conventions: `200 OK` for successful GET/PUT/PATCH, `201 Created` for resource creation via POST, `204 No Content` for successful DELETE, `400 Bad Request` for validation failures, `401 Unauthorized` for missing or invalid credentials, `403 Forbidden` for insufficient role permissions, `404 Not Found` for missing resources, `409 Conflict` for business-rule violations such as duplicate admission numbers, and `500 Internal Server Error` for unexpected failures.

### 4.6 WebSocket Integration

Real-time features — attendance notifications, fee payment status, admin announcements, and messaging — use Socket.io integrated with the Express HTTP server. The Socket.io initialization module authenticates each connection using the same JWT access token, rejecting unauthorized sockets before they join any rooms.

Each authenticated socket joins three room categories on connection: a personal room (`user:${userId}`) for targeted notifications, a role room (`role:${role}`) for broadcast messages to all teachers, parents, or administrators, and a school room (`school:${schoolId}`) for institution-wide announcements. The `emit` method sends to specific rooms, `broadcast.emit` sends to all sockets except the sender, and `io.emit` sends globally. This room architecture ensures sensitive data never leaks to unintended recipients.

Event namespaces organize real-time traffic logically: `notification:*` for system alerts and fee reminders, `attendance:*` for real-time marking updates, `chat:*` for messaging, and `presence:*` for online status tracking. Controllers emit events through a service-layer pattern — after the attendance service marks a student absent, it emits a targeted notification to the guardian's personal room, keeping WebSocket logic decoupled from business logic.

```mermaid
sequenceDiagram
    autonumber
    participant C as Client (Browser)
    participant E as Express HTTP Server
    participant S as Socket.io Server
    participant DB as MongoDB

    C->>E: GET /api/v1/students (Bearer token)
    E-->>C: HTTP 200 + JSON response
    C->>S: WS handshake (auth.token)
    S->>S: Verify JWT, join user:123, role:teacher, school:1
    S-->>C: connection established
    Note over C,S: Another client marks attendance
    C2->>E: POST /api/v1/attendance/mark
    E->>DB: Insert attendance records
    E->>S: getIO().to(user:456).emit(notification:attendance)
    S->>C: {type: "absence_alert", studentName, date}
```
## 5. Frontend Architecture — React

The School Management System frontend is a single-page application (SPA) built with React 18, Vite, and Tailwind CSS. It consumes the RESTful API from Chapter 4 and presents a role-adaptive interface for eight user personas. This chapter covers project scaffolding, component architecture, routing, state management, reusable components, API integration, and UI/UX implementation.

### 5.1 React Application Structure

#### 5.1.1 Vite Project Setup

The project is scaffolded with `npm create vite@latest sms-client -- --template react`. Absolute imports are configured via `jsconfig.json`:

```javascript
// jsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"]
}
```

Environment variables use Vite's `import.meta.env` convention — variables prefixed with `VITE_` are exposed to client-side code.

#### 5.1.2 Atomic Design Methodology

Components use Atomic Design hierarchy. **Atoms** are indivisible — `Button`, `Input`, `Icon`. **Molecules** combine atoms: `SearchBar` (Input + Button), `FormField` (Label + Input + Error). **Organisms** are self-contained sections: `DataTable`, `Sidebar`. **Templates** define layouts: `DashboardLayout`. **Pages** are domain instances: `StudentList`, `ClassDetail`.

#### 5.1.3 Feature-Based Folder Structure

```
src/
  features/students/       components/, hooks/, services/, utils/
  features/teachers/       components/, hooks/, services/, utils/
  features/academics/      components/, hooks/, services/, utils/
  components/              shared atoms, molecules, organisms
  context/                 React context providers
  hooks/                   global custom hooks
  services/                Axios instance and interceptors
  pages/                   top-level route components
  router/                  route definitions and guards
```

Adding a module means creating one folder; cross-cutting concerns live in shared directories.

### 5.2 Routing and Navigation

#### 5.2.1 React Router v6

Routing uses React Router v6 with `BrowserRouter`. Nested routes exploit `Outlet` for layout composition. `useParams` extracts path variables; `useSearchParams` manages query strings.

#### 5.2.2 Role-Based Route Guards

`ProtectedRoute` reads `AuthContext` and checks the user's role against a `requiredRoles` prop. Unauthenticated users redirect to `/login`; unauthorized users redirect to `/unauthorized`.

#### 5.2.3 Dynamic Navigation

`Sidebar` menu items are filtered by role via `useMenuItems`. Breadcrumbs derive from route hierarchy. Active highlighting uses `NavLink`'s `isActive` flag.

#### 5.2.4 Code Splitting

Route-level components load with `React.lazy()`, wrapped in `Suspense` with skeleton fallbacks. `IntersectionObserver` prefetches likely next routes on hover.

### 5.3 State Management

#### 5.3.1 AuthContext

`AuthContext` exposes `user`, `role`, `token`, `login()`, and `logout()`. On mount it hydrates from `localStorage` and schedules logout before JWT expiry.

```jsx
// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('sms_auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.expiresAt - Date.now() > 60000) {
        setUser(parsed.user);
        setToken(parsed.token);
      } else {
        localStorage.removeItem('sms_auth');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error('Invalid credentials');
    const data = await res.json();
    setUser(data.data.user);
    setToken(data.data.token);
    localStorage.setItem('sms_auth', JSON.stringify({
      user: data.data.user,
      token: data.data.token,
      expiresAt: Date.now() + data.data.expiresIn * 1000
    }));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('sms_auth');
    navigate('/login');
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, role: user?.role, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

#### 5.3.2 useReducer for Complex State

`useReducer` manages complex local state. The student wizard dispatches `{ type: 'SET_FIELD', step, field, value }`. `DataTable` state — sort, filters, pagination — uses a single reducer.

#### 5.3.3 Custom Hooks

`useFetch` abstracts data fetching with loading, error, and cancellation:

```jsx
// src/hooks/useFetch.js
import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/services/api';

export function useFetch(url, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const execute = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(url, { ...options, signal: controller.signal });
      setData(response.data.data);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.response?.data?.message || 'Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  }, [url, JSON.stringify(options)]);

  useEffect(() => { execute(); return () => abortRef.current?.abort(); }, [execute]);
  return { data, loading, error, refetch: execute };
}
```

Other hooks: `useLocalStorage` for UI preferences, `useDebounce` for 300 ms search delays, `usePermission` for role-based rendering.

#### 5.3.4 Form Handling

All forms use controlled components. Validators — `required`, `email`, `minLength` — return error strings or `null`. `FormField` wraps `Input` with label and error text.

### 5.4 Reusable Component Library

#### 5.4.1 Layout Components

`DashboardLayout` composes `Sidebar`, `TopBar`, `PageContainer`, and `Footer`:

```jsx
// src/components/layout/DashboardLayout.jsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { PageContainer } from './PageContainer';
import { Footer } from './Footer';
import { useAuth } from '@/context/AuthContext';

export function DashboardLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} userRole={user?.role} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar user={user} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <PageContainer>
            <Outlet />
          </PageContainer>
          <Footer />
        </main>
      </div>
    </div>
  );
}
```

#### 5.4.2 Data Display Components

`DataTable` accepts columns, row data, and selection state; `useTable` manages sorting and pagination. `StatCard` shows KPIs with icon, value, trend. `StatusBadge` maps enums to color-coded pills. `Avatar` shows photos or initials.

#### 5.4.3 Form Components

`InputField` wraps native inputs with validation. `SelectDropdown` supports single/multi selection via Headless UI's `Listbox`. `DatePicker` wraps `react-datepicker`. `FileUploader` provides drag-and-drop with preview.

#### 5.4.4 Feedback Components

Toasts queue in a portal and auto-dismiss after five seconds. `Modal` uses Headless UI's `Dialog` for focus trapping. `ConfirmDialog` handles destructive actions. Skeletons mirror content shape.

### 5.5 API Integration Layer

#### 5.5.1 Axios Instance Configuration

All HTTP flows through a configured Axios instance with interceptors for auth and token refresh:

```javascript
// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => error ? prom.reject(error) : prom.resolve(token));
  failedQueue = [];
};

api.interceptors.request.use((config) => {
  const auth = localStorage.getItem('sms_auth');
  if (auth) config.headers.Authorization = `Bearer ${JSON.parse(auth).token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const rs = await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });
        const newToken = rs.data.data.token;
        const stored = JSON.parse(localStorage.getItem('sms_auth'));
        stored.token = newToken;
        localStorage.setItem('sms_auth', JSON.stringify(stored));
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

#### 5.5.2 Automatic Token Refresh

The interceptor queues concurrent requests in `failedQueue` during `/auth/refresh`. On success they retry; on failure the user redirects to `/login`.

#### 5.5.3 Service Modules

`studentService.js` exports `getStudents(params)`, `getStudentById(id)`, `createStudent(data)` — each returning the standardized `{ success, data, message }` envelope.

#### 5.5.4 Error Handling

API errors map to user-friendly messages. Field-level errors attach to form fields. A React Error Boundary wraps the route tree with a fallback UI.

### 5.6 UI/UX Implementation

#### 5.6.1 Tailwind CSS Integration

Styling follows Tailwind's utility-first approach with custom brand palette: `primary: indigo-600`, `secondary: emerald-500`, `danger: red-500`.

#### 5.6.2 Responsive Design

Mobile-first breakpoints: `sm: 640px`, `md: 768px`, `lg: 1024px`. Sidebar collapses below `md`. Tables switch to card views on mobile.

#### 5.6.3 Theme System

Colors are CSS custom properties; JavaScript toggles the `dark` class for instant dark mode. Inter font family with consistent weights.

#### 5.6.4 State Patterns

Empty states show illustrations with action buttons. Skeletons match content shape. Error states include retry buttons. Optimistic updates apply for attendance; failures roll back with a toast.

### Component Inventory

| Component | Atomic Level | Key Props | Usage Context |
|-----------|-------------|-----------|---------------|
| `Button` | Atom | `variant`, `size`, `loading`, `onClick` | All forms, modals, actions |
| `Input` | Atom | `type`, `placeholder`, `error`, `disabled` | Every form field |
| `Icon` | Atom | `name`, `size`, `color` | Navigation, stats, badges |
| `SearchBar` | Molecule | `value`, `onChange`, `placeholder` | List pages, directory |
| `FormField` | Molecule | `label`, `error`, `helperText`, `children` | All forms |
| `DataTable` | Organism | `columns`, `data`, `sortable`, `selectable` | Student list, fee ledger |
| `Sidebar` | Organism | `menuItems`, `isOpen`, `userRole` | Dashboard layout |
| `DashboardLayout` | Template | — | All authenticated pages |
| `StudentList` | Page | — | `/students` route |
| `ClassDetail` | Page | — | `/classes/:id` route |

### Component Hierarchy

```mermaid
graph TD
    A[BrowserRouter] --> B[ProtectedRoute]
    B --> C[DashboardLayout]
    C --> D[Sidebar]
    C --> E[TopBar]
    C --> F[PageContainer]
    C --> G[Footer]
    F --> H[Outlet]
    H --> I[StudentList]
    H --> J[ClassDetail]
    H --> K[FeeCollection]
    I --> L[SearchBar]
    I --> M[DataTable]
    I --> N[StatCard]
    M --> O[StatusBadge]
    M --> P[Avatar]
```

### State Flow

```mermaid
sequenceDiagram
    participant U as User
    participant AC as AuthContext
    participant PR as ProtectedRoute
    participant C as Component
    participant UF as useFetch
    participant AI as Axios Instance
    participant API as Backend API

    U->>AC: Enter credentials
    AC->>API: POST /auth/login
    API-->>AC: { user, token, expiresIn }
    AC->>AC: Persist to localStorage
    AC-->>U: Redirect to /dashboard
    U->>PR: Navigate to /students
    PR->>AC: Check auth + role
    AC-->>PR: Authenticated, role: teacher
    PR-->>C: Render StudentList
    C->>UF: useFetch('/students')
    UF->>AI: GET /students
    AI->>AC: Read token from context
    AI->>API: Request with Bearer header
    API-->>AI: { data: [...] }
    AI-->>UF: Return response
    UF-->>C: Set data state
    C-->>U: Render DataTable with students
```
## 6. Authentication & Authorization

The authentication and authorization layer guards every API endpoint and UI route. The design combines password-based authentication with JWT stateless tokens, a ten-role RBAC model, and proactive session management.

### 6.1 Authentication System Design

#### 6.1.1 Authentication Flow

Staff accounts are administrator-created only; students and parents are auto-provisioned during enrollment. On login, the server validates credentials against a bcrypt hash and issues a dual-token pair: a short-lived access token and a long-lived refresh token in an httpOnly cookie.

```mermaid
sequenceDiagram
    actor U as User
    participant C as React Client
    participant A as AuthController
    participant DB as MongoDB
    participant R as Redis
    U->>C: Enter email + password
    C->>A: POST /auth/login
    A->>DB: Find user by email
    DB-->>A: User (with password hash)
    A->>A: bcrypt.compare()
    A->>A: generateAccessToken() + generateRefreshToken()
    A->>DB: Store refresh hash in sessions[]
    A-->>C: {accessToken, user} + Set-Cookie
    C->>C: Store accessToken in memory
    U->>C: Access protected page
    C->>A: GET /api/... Bearer <token>
    A->>A: Verify JWT
    A->>R: Check blacklist
    R-->>A: Valid
    A->>DB: Fetch data
    A-->>C: Response
    U->>C: Logout
    C->>A: POST /auth/logout
    A->>R: SET blacklist:<jti> EX <ttl>
    A->>DB: Remove refresh token
    A-->>C: Clear cookie
```

The refresh token travels only as an httpOnly cookie—JavaScript cannot read it. On logout, the access token's `jti` enters a Redis blacklist with TTL equal to its remaining lifetime, preventing reuse before natural expiry.

#### 6.1.2 Password Hashing

Passwords are hashed with bcrypt at 12 salt rounds. A pre-save Mongoose hook hashes automatically before persistence, and `select: false` on the password field keeps it out of query results unless explicitly requested with `.select('+password')`.

```javascript
// server/models/User.js
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'principal', 'teacher', 'student',
           'parent', 'accountant', 'librarian', 'transport_manager', 'warden'],
    required: true
  },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  sessions: [{ tokenHash: String, createdAt: Date }]
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model('User', userSchema);
```

#### 6.1.3 JWT Token Strategy

The **access token** (15-minute expiry) lives in client memory. The **refresh token** (7-day expiry) is an httpOnly cookie. This limits the blast radius of a compromised access token while avoiding repeated credential prompts.

```javascript
// server/services/tokenService.js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export function generateAccessToken(user) {
  return jwt.sign(
    { userId: user._id, role: user.role, schoolId: user.schoolId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '15m', jwtid: crypto.randomUUID() }
  );
}

export function generateRefreshToken(user) {
  return jwt.sign(
    { userId: user._id, type: 'refresh' },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d', jwtid: crypto.randomUUID() }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, { clockTolerance: 30 });
}
```

The payload carries `userId`, `role`, and `schoolId` so middleware can perform identity and school-scoped filtering without extra database queries. Each token receives a unique `jti` for precise blacklisting.

#### 6.1.4 Token Blacklisting

On logout, the system stores the access token's `jti` in Redis with TTL matching its remaining lifetime. The `authenticate` middleware checks this blacklist on every request, returning HTTP 401 if revoked. Redis TTL ensures automatic cleanup once the token expires.

### 6.2 Role-Based Access Control (RBAC)

#### 6.2.1 Role Hierarchy

Ten roles are defined, from system-wide authority to module-specific operators: **super_admin** (cross-school), **admin** (single school), **principal** (academic oversight), **teacher**, **student**, **parent**, and specialized staff—**accountant**, **librarian**, **transport_manager**, **warden**.

```mermaid
erDiagram
    SUPER_ADMIN {string name "Super Admin"}
    ADMIN {string name "Admin"}
    PRINCIPAL {string name "Principal"}
    TEACHER {string name "Teacher"}
    STUDENT {string name "Student"}
    PARENT {string name "Parent"}
    ACCOUNTANT {string name "Accountant"}
    LIBRARIAN {string name "Librarian"}
    TRANSPORT {string name "Transport Mgr"}
    WARDEN {string name "Warden"}
    SUPER_ADMIN ||--o{ ADMIN : manages
    ADMIN ||--o{ PRINCIPAL : delegates
    PRINCIPAL ||--o{ TEACHER : oversees
    ADMIN ||--o{ ACCOUNTANT : assigns
    ADMIN ||--o{ LIBRARIAN : assigns
    ADMIN ||--o{ TRANSPORT : assigns
    ADMIN ||--o{ WARDEN : assigns
    TEACHER ||--o{ STUDENT : instructs
    STUDENT ||--o{ PARENT : linked_to
```

#### 6.2.2 Permission Matrix

The matrix maps ten roles to eleven modules using CRUD notation. **—** means no access; **R** on student/parent rows denotes self-scoped or child-scoped read; teacher attendance CRU is class-scoped only.

| Role | Student Mgmt | Teacher/Staff | Academic | Attendance | Examination | Fee/Finance | Library | Transport | Hostel | Communication | Reports |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **super_admin** | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD |
| **admin** | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | RU |
| **principal** | RU | R | RU | R | RU | R | R | R | R | RU | R |
| **teacher** | R | — | R | CRU | RU | — | R | — | — | R | R |
| **student** | R | — | R | R | R | R | R | R | R | R | — |
| **parent** | R | — | R | R | R | R | — | R | R | R | — |
| **accountant** | R | — | — | — | — | CRUD | — | — | — | R | R |
| **librarian** | R | — | — | — | — | — | CRUD | — | — | R | R |
| **transport_manager** | R | — | — | — | — | — | — | CRUD | — | R | R |
| **warden** | R | — | — | R | — | — | — | — | CRUD | R | R |

#### 6.2.3 Backend Authorization Middleware

The `requireRole` factory accepts an array of permitted roles, compares `req.user.role`, and returns HTTP 403 for unauthorized requests.

```javascript
// server/middleware/authorize.js
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user?.role) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
}
```

Usage: `router.get('/fees', authenticate, requireRole(['admin', 'accountant']), getFees)`. A `requireRoleOrOwner` variant supports self-record access without broader role permissions.

#### 6.2.4 Frontend Route Guards

The `ProtectedRoute` component wraps routes requiring authentication or specific roles, redirecting unauthenticated users to `/login` or under-authorized users to `/unauthorized`.

```jsx
// client/src/components/auth/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';

export function ProtectedRoute({ element, allowedRoles }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const { hasAnyRole } = usePermission();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (allowedRoles && !hasAnyRole(allowedRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return element;
}
```

The `usePermission` hook provides `hasRole`, `hasAnyRole(roles)`, and `hasRoleOrAbove(minRole)` for conditional UI rendering—hiding buttons or menu items when the user lacks the required role.

### 6.3 Session Management

#### 6.3.1 Token Storage Strategy

The refresh token lives in an httpOnly, Secure, SameSite=Strict cookie—invisible to JavaScript. The access token is stored in a JavaScript variable within the Axios instance. **localStorage is not used for any token**; it persists across tabs and is fully exposed to XSS. This design ensures a successful XSS exploit could only steal a 15-minute access token, not the long-lived refresh credential.

#### 6.3.2 Automatic Token Refresh

When an API request returns HTTP 401 from token expiry, the Axios response interceptor calls `POST /auth/refresh` (sending the httpOnly cookie), updates the in-memory access token, and retries the original request transparently.

#### 6.3.3 Session Timeout

Mouse and keyboard listeners track activity. After 25 minutes of inactivity, a warning modal appears. If no response arrives within 5 minutes, the system logs out and redirects to `/login`.

#### 6.3.4 Concurrent Session Handling

Each user may maintain up to three active sessions. A fourth login invalidates the oldest session by removing its refresh token hash from `User.sessions[]`. The profile page lists active sessions, and manual revocation immediately blacklists that session's access token in Redis.

### 6.4 Password Recovery & Account Security

#### 6.4.1 Forgot Password

`POST /auth/forgot-password` generates a 32-byte random token via `crypto.randomBytes(32)`, hashes it with SHA-256, and stores the hash in a `PasswordReset` collection with a 1-hour expiry. The plaintext token is emailed as a one-time reset link; only the hash is persisted, so a database breach does not expose usable tokens.

#### 6.4.2 Reset Password

`GET /auth/reset-password/:token` validates the SHA-256 hash and renders the reset form. `POST /auth/reset-password` verifies the token, updates the user's password, archives the old hash to `PasswordHistory`, deletes the reset record, and enforces the no-reuse policy by comparing against the last three `PasswordHistory` entries.

#### 6.4.3 Password Policy

Passwords must be at least 8 characters with one uppercase, one lowercase, one digit, and one special character. The server rejects common passwords from a dictionary of compromised strings and prevents reuse of the last three passwords. Admin, accountant, and HR manager accounts require 90-day expiry and mandatory MFA.
## 7. Student & Teacher Management Modules

### 7.1 Student Management Module

The Student Management Module handles the complete student lifecycle from admission through alumni conversion, providing registration workflows, profile management, class assignment, search capabilities, bulk import, and parent portal access.

#### 7.1.1 Student Registration Flow

New student registration uses a four-step wizard: **Personal Information**, **Guardian Information**, **Academic Information**, and **Document Upload**. Each step validates through Joi schemas before progression. The React frontend maintains wizard state via `useReducer`, persisting incomplete data to `localStorage` for recovery. On final submission to `POST /students`, the server generates roll numbers atomically by querying the highest existing roll for the target academic year and class-section combination, incrementing within a MongoDB transaction. Admission numbers follow the immutable format `ADM-YYYY-XXXXX`.

```mermaid
flowchart TD
    A[Application] --> B[Review]
    B --> C[Entrance Test]
    C --> D[Interview]
    D --> E{Decision}
    E -->|Approved| F[Enrollment]
    E -->|Waitlisted| G[Waitlist]
    G -->|Available| F
    F --> H[Active]
    H --> I[Promoted]
    H --> J[Withdrawn]
    H --> K[Alumni]
    I --> H
```

#### 7.1.2 Student Profile

The profile operates in dual modes: **View Mode** displays tabbed sections (Personal, Academic, Documents, Medical) with a photo gallery; **Edit Mode** activates inline editing fields on click. Deletion uses soft-delete via a `deletedAt` timestamp, preserving referential integrity with attendance and fee records.

The **Student Profile Fields** table documents the complete data model:

| Field | Category | Type | Constraints |
|---|---|---|---|
| `firstName`, `lastName` | Personal | String | Required, 2-50 chars |
| `dob` | Personal | Date | Required, grade-based age validation |
| `gender` | Personal | Enum | male, female, other |
| `bloodGroup` | Personal | Enum | A+, A-, B+, B-, AB+, AB-, O+, O- |
| `admissionNo` | Enrollment | String | Unique, immutable, ADM-YYYY-XXXXX |
| `rollNo` | Enrollment | Number | Unique per year+class+section, auto-incremented |
| `status` | Enrollment | Enum | active, inactive, transferred, withdrawn, alumni |
| `classId`, `sectionId` | Academic | ObjectId | Ref: Class, Section |
| `guardianIds` | Guardian | [ObjectId] | Max 5, Ref: Guardian |
| `allergies` | Medical | [String] | Optional |
| `deletedAt` | System | Date | Nullable, soft-delete timestamp |

Profile photo upload uses `react-cropper` for client-side cropping before server upload via Multer, which generates 300x300 and 800x800 variants stored under `uploads/students/`.

```jsx
// src/features/students/components/StudentProfile.jsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { studentService } from '../services/studentService';
import { InlineEditField } from './InlineEditField';
import { StatusBadge } from '../../../components/StatusBadge';

export const StudentProfile = () => {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentService.getById(studentId).then((res) => {
      setStudent(res.data);
      setEditData(res.data);
      setLoading(false);
    });
  }, [studentId]);

  const handleSave = async () => {
    const response = await studentService.update(studentId, editData);
    setStudent(response.data);
    setIsEditing(false);
  };

  const handleArchive = async () => {
    if (!window.confirm('Archive this student?')) return;
    await studentService.archive(studentId);
    setStudent((p) => ({ ...p, status: 'withdrawn', deletedAt: new Date() }));
  };

  if (loading) return <div className="skeleton">Loading...</div>;

  return (
    <div className="student-profile">
      <div className="profile-header">
        <img src={student.photoUrl || '/assets/default-avatar.png'}
             alt={`${student.firstName} ${student.lastName}`}
             className="profile-photo" />
        <div className="header-info">
          <h1><InlineEditField value={`${student.firstName} ${student.lastName}`}
                               isEditing={isEditing} /></h1>
          <p><StatusBadge status={student.status} />
             <span>Admission: {student.admissionNo}</span>
             <span>Roll: {student.rollNo}</span></p>
        </div>
        <div className="actions">
          <button onClick={() => isEditing ? handleSave() : setIsEditing(true)}>
            {isEditing ? 'Save' : 'Edit'}</button>
          <button className="btn-danger" onClick={handleArchive}>Archive</button>
        </div>
      </div>
      <div className="profile-tabs">
        <TabPanel label="Personal">
          <InlineEditField label="Blood Group" value={student.bloodGroup}
                           isEditing={isEditing} type="select" />
          <InlineEditField label="Address" value={student.address}
                           isEditing={isEditing} type="textarea" />
        </TabPanel>
        <TabPanel label="Academic">
          <p>Class: {student.classId?.name} — Section {student.sectionId?.name}</p>
        </TabPanel>
        <TabPanel label="Guardians">
          {(student.guardians || []).map((g) => (
            <div key={g._id} className="guardian-card">
              <p>{g.name} — {g.relationship}</p>
              <p>{g.phone}</p>
            </div>
          ))}
        </TabPanel>
      </div>
    </div>
  );
};
```

#### 7.1.3 Class Assignment

Assigning a student to a class-section enforces three constraints. The system validates section capacity through a count query against active students. It prevents duplicate enrollment by checking for existing active records with the same student and academic year combination, returning 409 Conflict if found. Mid-year transfers update `sectionId` while preserving `classId` and logging the change to the `StudentTransfer` collection within a MongoDB transaction.

#### 7.1.4 Student Search and Filter

The listing at `GET /students` implements server-side search with debounced input. The `q` parameter performs full-text search across name, admission number, and roll number using MongoDB's `$text` index. Filter parameters include `classId`, `sectionId`, `status`, and admission date ranges, all composing into a single query object.

```javascript
// server/src/controllers/studentController.js — Search & Pagination
const { Student } = require('../models/Student');
const { catchAsync } = require('../utils/catchAsync');

/**
 * GET /api/v1/students
 * Full-text search with server-side pagination and multi-field filtering.
 */
exports.searchStudents = catchAsync(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
  const skip = (page - 1) * limit;

  const filter = { deletedAt: null };
  if (req.query.q) filter.$text = { $search: req.query.q };
  if (req.query.classId) filter.classId = req.query.classId;
  if (req.query.sectionId) filter.sectionId = req.query.sectionId;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.admissionDateFrom || req.query.admissionDateTo) {
    filter.createdAt = {};
    if (req.query.admissionDateFrom) filter.createdAt.$gte = new Date(req.query.admissionDateFrom);
    if (req.query.admissionDateTo) filter.createdAt.$lte = new Date(req.query.admissionDateTo);
  }

  const [total, students] = await Promise.all([
    Student.countDocuments(filter),
    Student.find(filter)
      .populate('classId', 'name numericLevel')
      .populate('sectionId', 'name')
      .select('-__v')
      .sort({ [req.query.sortBy || 'createdAt']: req.query.sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  res.status(200).json({
    success: true, data: students,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
});
```

```javascript
// server/src/controllers/studentController.js — CRUD Operations
const { Student } = require('../models/Student');
const { catchAsync } = require('../utils/catchAsync');

/**
 * POST /api/v1/students
 * Creates a student with atomic roll number generation.
 */
exports.createStudent = catchAsync(async (req, res) => {
  const { classId, sectionId, academicYearId } = req.body;
  const session = await Student.startSession();
  let result;

  await session.withTransaction(async () => {
    const last = await Student.findOne({ classId, sectionId, academicYearId, deletedAt: null })
      .sort({ rollNo: -1 }).select('rollNo').session(session).lean();
    result = await Student.create(
      [{ ...req.body, rollNo: (last?.rollNo || 0) + 1 }],
      { session }
    );
  });

  await session.endSession();
  res.status(201).json({ success: true, data: result[0] });
});

/**
 * PUT /api/v1/students/:id
 * Updates student profile with validation.
 */
exports.updateStudent = catchAsync(async (req, res) => {
  const student = await Student.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!student) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  res.status(200).json({ success: true, data: student });
});

/**
 * DELETE /api/v1/students/:id
 * Soft-deletes a student record.
 */
exports.deleteStudent = catchAsync(async (req, res) => {
  const student = await Student.findByIdAndUpdate(
    req.params.id,
    { $set: { status: 'withdrawn', deletedAt: new Date() } },
    { new: true }
  );
  if (!student) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  res.status(204).send();
});
```

#### 7.1.5 Bulk Import

Bulk import follows a parse-upload-validate-commit pattern. Administrators download a CSV template, upload via `POST /students/bulk-import`, and the server parses using `csv-parser`. Each row validates against the Joi student schema; the response contains a preview with valid rows, error rows with field-level messages, and a summary. Committing inserts validated rows within a transaction and returns a success/failure report.

#### 7.1.6 Student Dashboard

The student dashboard displays an academic summary card, attendance percentage ring for the current month, fee due status with color coding (green/amber/red), upcoming exams within 14 days, and recent marks. Students download their ID card as a PDF generated via Puppeteer with school branding, photo, and barcode.

#### 7.1.7 Parent Portal

Parents access a view-only portal linked to students via `guardianIds`. After login, parents select a child from linked students and view profile, attendance calendar, marks, and fee statements. The messaging interface creates threaded conversations stored in the `Message` collection. All portal endpoints enforce middleware restricting access to `parent` role and validating the requested `studentId` exists in the parent's linked array.

### 7.2 Teacher Management Module

#### 7.2.1 Teacher Onboarding

Onboarding extends base staff registration with qualification entry, subject specialization selection, department assignment, and class teacher designation. The system generates an `EMP-YYYY-XXXXX` employee ID and a `teacher` role User account. An activation email with a 24-hour JWT link dispatches via Nodemailer.

```mermaid
flowchart LR
    A[Profile] --> B[Qualifications] --> C[Subjects]
    C --> D[Department] --> E[Class Teacher]
    E --> F[Documents] --> G[Activation Email]
```

#### 7.2.2 Teacher Profile

The profile renders a qualifications timeline, experience history, assigned classes and subjects grid, personal timetable view, and contract details with renewal alerts at 30, 15, and 7 days before expiry. The `isTeachingStaff` boolean distinguishes teaching from non-teaching roles.

#### 7.2.3 Department Management

Departments (Science, Mathematics, Languages, Arts, Administration) include `name`, `code`, `description`, and `headId` referencing the department head. The head gains elevated permissions for lesson plan review and staff attendance monitoring. CRUD operations require `admin` or `principal` roles; deletion mandates reassignment or soft-delete archival.

#### 7.2.4 Teacher-Class-Subject Assignment Matrix

The assignment matrix provides a visual grid for teacher allocations. The `GET /teachers/assignment-matrix` endpoint aggregates timetable entries by teacher and class-section.

The **Teacher Assignment Matrix** illustrates the structure:

| Teacher | 8-A | 8-B | 9-A | 9-B | 10-A | Weekly Total |
|---|---|---|---|---|---|---|
| R. Sharma (Math) | Math (6) | Math (6) | — | — | Math (6) | 18 |
| P. Gupta (Sci) | Sci (6) | — | Sci (6) | Sci (6) | — | 18 |
| S. Patel (Eng) | — | Eng (6) | Eng (6) | — | Eng (6) | 18 |
| A. Khan (Hindi) | Hindi (5) | Hindi (5) | — | Hindi (5) | — | 15 |
| M. Joshi (SST) | — | SST (5) | SST (5) | — | SST (5) | 15 |

```javascript
// server/src/controllers/teacherController.js
const { TimetableEntry } = require('../models/TimetableEntry');
const { catchAsync } = require('../utils/catchAsync');

exports.getAssignmentMatrix = catchAsync(async (req, res) => {
  const { academicYearId } = req.query;
  const matchStage = { academicYearId, deletedAt: null };

  const matrix = await TimetableEntry.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { teacherId: '$teacherId', classId: '$classId', sectionId: '$sectionId' },
        subjects: { $addToSet: '$subjectId' },
        periodCount: { $sum: 1 }
      }
    },
    {
      $lookup: { from: 'teachers', localField: '_id.teacherId',
                 foreignField: '_id', as: 'teacher' }
    },
    { $unwind: '$teacher' },
    {
      $lookup: { from: 'subjects', localField: 'subjects',
                 foreignField: '_id', as: 'subjectDetails' }
    },
    {
      $group: {
        _id: '$_id.teacherId',
        teacherName: { $first: { $concat: ['$teacher.firstName', ' ', '$teacher.lastName'] } },
        assignments: {
          $push: { classId: '$_id.classId', sectionId: '$_id.sectionId',
                   subjects: '$subjectDetails.name', periods: '$periodCount' }
        },
        totalPeriods: { $sum: '$periodCount' }
      }
    },
    { $sort: { teacherName: 1 } }
  ]);

  // Detect double-booking conflicts
  const conflicts = await TimetableEntry.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { teacherId: '$teacherId', dayOfWeek: '$dayOfWeek', periodNo: '$periodNo' },
        count: { $sum: 1 }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ]);

  res.status(200).json({
    success: true, data: matrix,
    meta: { conflictCount: conflicts.length }
  });
});
```

#### 7.2.5 Workload Calculation

The workload engine aggregates periods per teacher per week from Timetable entries. Each teacher stores `minPeriods` and `maxPeriods` constraints (default 20 and 40). Recalculation triggers on timetable changes, with alerts for underutilization (below minimum) or overload (above maximum). Analytics endpoints return standard deviation across departments to identify distribution imbalance.

### 7.3 Staff Management Module

#### 7.3.1 Staff Categories

Non-teaching staff occupy three categories: **Administrative** (reception, clerk), **Support** (peons, security), and **Specialized** (librarian, accountant, transport manager). Employment types are `permanent`, `contract`, and `probation` (default 6 months with mandatory review 7 days before expiry).

#### 7.3.2 Staff Registration

Non-teaching registration uses a simplified single-page form collecting personal details, designation, and role assignment. The system generates an ID card with a barcode and prints a credentials sheet. Role assignments create entries in the `UserRole` junction table mapping operational permissions.

#### 7.3.3 Employment Lifecycle

Status transitions follow a state machine: **probation** to **active** requires principal approval; **active** to **on-leave** for approved leave; **active** to **resigned** on notice submission; **active** to **terminated** for disciplinary action with administrative authorization. Exit triggers a clearance checklist: library (no outstanding books), accounting (no dues), and IT (equipment returned).

```mermaid
flowchart TD
    A[Probation] -->|Review Passed| B[Active]
    A -->|Failed| C[Terminated]
    B -->|Leave| D[On Leave]
    D -->|Return| B
    B -->|Notice| E[Resigned]
    B -->|Disciplinary| C
    E -->|Cleared| F[Exited]
    C -->|Cleared| F
```

### 7.4 User Directory & Search

#### 7.4.1 Unified Directory

The User Directory at `/directory` consolidates students, teachers, and staff through MongoDB's `$unionWith` aggregation, projecting each entity to a common shape with `name`, `role`, `status`, and avatar. Role badges render as color-coded pills. Quick actions (view, edit, message, deactivate) appear conditionally based on viewer permissions.

#### 7.4.2 Advanced Filters

The filter panel supports combined queries: a `$text` search on name fields, plus dropdowns for class, department, status, and employment type. Filter selections serialize to URL parameters for bookmarkable views. Users save presets in `UserPreference` for quick recall.

#### 7.4.3 Profile Export

Individual export generates a PDF via Puppeteer from an HTML template with photo and school branding. Bulk export uses the `xlsx` library for Excel generation. Print-friendly views apply `@media print` CSS that hides navigation and ensures 300 DPI photo quality.
## 8. Academic Management

Academic Management defines the structural backbone of the School Management System, establishing the organizational framework within which all educational activities operate. This module spans five interconnected subsystems: academic year lifecycle management, class and section hierarchy maintenance, subject catalog administration, constraint-based timetable generation, and curriculum progress tracking.

### 8.1 Academic Year & Session Management

The **academic year** is the top-level temporal container for all school data. Each record defines a named session (for example, "2024-2025") with start and end dates, a term structure, and promotion criteria. A pre-save validation hook queries existing documents and rejects any record whose date range intersects with an active session — overlap prevention is critical because student enrollments, fee structures, timetables, and attendance records all carry a foreign key to a single academic year.

The **term structure** supports semester (two terms) or trimester (three terms) configurations. Each term sub-document stores its own start and end dates and an examination session reference. The system validates that the union of all term date ranges exactly covers the parent academic year span with no gaps. Promotion criteria attach at the academic year level: minimum aggregate percentage, maximum permitted failing subjects, and minimum attendance percentage.

**Session rollover** executes as a multi-step transactional workflow. Step one archives the outgoing year by setting `isCurrent` to `false` and creating aggregate snapshots into an `AcademicYearArchive` collection. Step two promotes students based on configured criteria (see section 8.1.3). Step three generates the new academic year, rolls forward fee structures with optional increments, and seeds empty timetable shells. The entire workflow runs inside a MongoDB transaction; failure at any step triggers full rollback with an error report to the administrator.

**Student progression** evaluates each active student against three criteria: aggregate marks meet the minimum, failed subjects do not exceed the maximum (typically two), and attendance meets the threshold. Students satisfying all criteria receive `promoted` status. Students failing one or two subjects receive `conditional` status with mandatory remedial assignments. Students exceeding the failure limit receive `detained` status and remain in their current class. The engine detects class capacity overflow after promotion — when target enrollment would exceed total section capacity — and alerts administrators to create additional sections before finalizing the rollover.

### 8.2 Class & Section Management

#### 8.2.1 Class Hierarchy and Section Capacity

The class hierarchy spans Nursery through Grade 12. Each **Class** document carries a display name ("Grade 9"), numeric sort order, affiliated board, and active status. **Sections** exist as embedded sub-documents with a name ("A", "B", "C"), capacity (default 40), room number, and `classTeacherId` reference. Embedding sections within the parent class optimizes read performance since sections are almost always queried in the context of their class. When a section reaches capacity, subsequent allocations place students on a **waitlist** ordered by timestamp; available seats are automatically offered to the longest-waiting student.

#### 8.2.2 Section CRUD API

The section management API enforces capacity constraints and teacher assignment integrity. The following controller implements core endpoints:

```javascript
// server/controllers/classController.js
const Class = require('../models/Class');
const AppError = require('../utils/AppError');

/** Add a section to an existing class with uniqueness and capacity validation. */
exports.addSection = async (req, res, next) => {
  const { classId } = req.params;
  const { sectionName, capacity, roomNumber, classTeacherId } = req.body;

  const classDoc = await Class.findById(classId);
  if (!classDoc) return next(new AppError('Class not found', 404));

  if (classDoc.sections.some(s => s.name.toUpperCase() === sectionName.toUpperCase())) {
    return next(new AppError(`Section ${sectionName} already exists`, 409));
  }

  // Prevent duplicate class teacher assignment across sections in same year
  if (classTeacherId) {
    const conflict = await Class.findOne({
      'sections.classTeacherId': classTeacherId,
      academicYearId: classDoc.academicYearId,
      _id: { $ne: classId }
    });
    if (conflict) return next(new AppError('Teacher already assigned to another section', 409));
  }

  classDoc.sections.push({
    name: sectionName.toUpperCase(), capacity: capacity || 40,
    roomNumber, classTeacherId, studentList: [], waitlist: []
  });
  await classDoc.save();
  res.status(201).json({ success: true, data: classDoc });
};

/** Update section metadata. Prevents capacity reduction below current enrollment. */
exports.updateSection = async (req, res, next) => {
  const { classId, sectionId } = req.params;
  const updates = req.body;

  const classDoc = await Class.findById(classId);
  const section = classDoc?.sections.id(sectionId);
  if (!section) return next(new AppError('Section not found', 404));

  if (updates.capacity && updates.capacity < section.studentList.length) {
    return next(new AppError(`Capacity below enrollment (${section.studentList.length})`, 400));
  }
  Object.keys(updates).forEach(k => { if (section[k] !== undefined) section[k] = updates[k]; });
  await classDoc.save();
  res.status(200).json({ success: true, data: section });
};

/** Soft-delete a section only if enrollment is zero. */
exports.deleteSection = async (req, res, next) => {
  const { classId, sectionId } = req.params;
  const classDoc = await Class.findById(classId);
  const section = classDoc?.sections.id(sectionId);
  if (!section) return next(new AppError('Section not found', 404));
  if (section.studentList.length > 0) {
    return next(new AppError('Cannot delete section with enrolled students', 409));
  }
  section.status = 'inactive';
  await classDoc.save();
  res.status(204).send();
};
```

#### 8.2.3 Student Allocation and Class Teacher Assignment

Student-to-section allocation verifies target capacity before updating the student's `sectionId` reference. Mid-year re-allocation logs timestamp and reason into an `AllocationHistory` collection. Each section has exactly one **primary class teacher**; co-teacher support is implemented through a separate `coTeachers` array. Teacher change workflow creates a pending `TeacherChangeRequest` requiring principal approval, with full audit trail including effective date archiving.

### 8.3 Subject Management

#### 8.3.1 Subject Catalog

The **Subject** collection stores the master catalog with fields: unique code (`MATH-101`), name, type enum (**core**, **elective**, **co-curricular**), credits, passing marks, and `applicableClasses` array. Unique code enforcement uses a MongoDB unique index. Soft delete sets status to `inactive`; a pre-change hook queries `ClassSubject` for active allocations and rejects deletion if references exist.

#### 8.3.2 Class-Wise Subject Allocation

The `ClassSubject` collection links subjects to class-section combinations for an academic year, storing the primary teacher, periods per week, and exam applicability. The matrix below illustrates a Grade 9 allocation:

| Subject Code | Subject Name | Type | Periods/Week | Exam | Teacher |
|---|---|---|---|---|---|
| MATH-09 | Mathematics | Core | 6 | Yes | T. Sharma |
| SCI-09 | Science | Core | 6 | Yes | R. Gupta |
| ENG-09 | English | Core | 6 | Yes | P. Verma |
| SST-09 | Social Studies | Core | 5 | Yes | K. Reddy |
| HIN-09 | Hindi | Core | 4 | Yes | S. Patel |
| CMP-09 | Computer Science | Elective | 4 | Yes | A. Khan |
| ART-09 | Fine Arts | Elective | 3 | Yes | M. Joshi |
| PED-09 | Physical Education | Co-curricular | 3 | No | R. Singh |

Each row generates one `ClassSubject` document per section. The periods-per-week value feeds into timetable generation as a hard constraint — the algorithm must schedule exactly the specified number of periods. Core subjects automatically carry the exam flag; co-curricular subjects typically do not.

#### 8.3.3 Elective Selection

Elective allocation follows a two-phase process. In phase one, the coordinator publishes options with a submission deadline; students submit ranked preferences. In phase two, the system allocates using either first-come-first-serve or preference-based assignment. Each elective has minimum and maximum enrollment thresholds; if minimum is not met, the elective is cancelled and affected students are reassigned. The coordinator locks selections upon finalization, generating `ClassSubject` records that feed into timetable generation.

### 8.4 Timetable Management

#### 8.4.1 Period Configuration

The timetable system begins with period configuration — a daily schedule template defining period duration (45 minutes), periods per day (8), break slots, working days (Mon-Sat), and assembly time. The table below shows a typical weekly structure:

| Day | P1 | P2 | P3 | Break | P4 | P5 | Lunch | P6 | P7 | P8 |
|---|---|---|---|---|---|---|---|---|---|---|
| Mon-Fri | 08:00 | 08:45 | 09:30 | 10:15-10:30 | 10:30 | 11:15 | 12:00-12:45 | 12:45 | 13:30 | 14:15 |
| Sat | 08:00 | 08:45 | 09:30 | 10:15-10:30 | 10:30 | 11:15 | — | — | — | — |

Saturday runs a shortened schedule. Period configuration stores as a document linked to the academic year; multiple configurations can exist with effective date ranges. The generation algorithm reads the active configuration to determine available slots.

#### 8.4.2 Timetable Generation Algorithm

The generation engine implements a **constraint-satisfaction algorithm** with backtracking. It processes each class-section independently, placing subject periods into available slots while satisfying hard constraints: no teacher double-booked, no room double-booked, exact period requirements met, and no consecutive same-subject periods (soft constraint). The algorithm sorts subjects by period count descending — high-requirement subjects have fewer valid combinations and cause conflicts if deferred. For each subject, it queries available slots, ranks them by a scoring function, commits the highest-scoring valid placement, and updates global occupancy trackers.

```mermaid
flowchart TD
    A["Load Period Config & Allocations"] --> B["Initialize grid per section"]
    B --> C{"Sections remaining?"}
    C -->|Yes| D["Select next section"]
    C -->|No| E["Return timetables"]
    D --> F["Sort subjects by period count desc"]
    F --> G{"Subjects remaining?"}
    G -->|Yes| H["Select next subject"]
    G -->|No| I["Section complete"]
    I --> C
    H --> J["Get available slots:<br/>grid free, teacher free, room free"]
    J --> K{"Slots found?"}
    K -->|Yes| L["Score by soft constraints"]
    K -->|No| M["Add to conflict report"]
    L --> N["Select highest score"]
    N --> O["Commit placement<br/>Update occupancy"]
    O --> G
    M --> G
    E --> P{"Conflicts?"}
    P -->|Yes| Q["Summarize for coordinator"]
    P -->|No| R["Publish timetables"]
    Q --> R

    style E fill:#e8f5e9,stroke:#2e7d32
    style R fill:#e8f5e9,stroke:#2e7d32
    style M fill:#fff3e0,stroke:#ef6c00
```

The core generation service implements this logic:

```javascript
// server/services/timetableGenerator.js
const ClassSubject = require('../models/ClassSubject');
const TimetableEntry = require('../models/TimetableEntry');

/**
 * Generates timetable entries for all class-sections using constraint-satisfaction.
 * @param {string} academicYearId - Target academic year
 * @param {Object} periodConfig - Period configuration document
 * @returns {Promise<{entries: Array, conflicts: Array}>}
 */
exports.generateTimetable = async (academicYearId, periodConfig) => {
  const allocations = await ClassSubject.find({ academicYearId })
    .populate('subjectId teacherId');

  // Group by class-section
  const sectionMap = new Map();
  for (const a of allocations) {
    const key = `${a.classId}#${a.sectionId}`;
    if (!sectionMap.has(key)) sectionMap.set(key, []);
    sectionMap.get(key).push(a);
  }

  const entries = [];
  const conflicts = [];
  const teacherOcc = new Set(); // "teacherId@day#period"
  const roomOcc = new Set();    // "roomId@day#period"

  for (const [key, allocs] of sectionMap) {
    const [classId, sectionId] = key.split('#');
    allocs.sort((a, b) => b.periodsPerWeek - a.periodsPerWeek);

    const grid = new Map(); // dayIdx -> Set of occupied period numbers
    for (let d = 0; d < periodConfig.workingDays.length; d++) grid.set(d, new Set());

    for (const alloc of allocs) {
      let placed = 0;
      const needed = alloc.periodsPerWeek;
      const candidates = [];

      for (let d = 0; d < periodConfig.workingDays.length; d++) {
        for (let p = 1; p <= periodConfig.periodsPerDay; p++) {
          if (periodConfig.isBreakPeriod(p)) continue;
          const slotKey = `${d}#${p}`;
          if (grid.get(d).has(p)) continue;
          if (teacherOcc.has(`${alloc.teacherId._id}@${slotKey}`)) continue;
          if (roomOcc.has(`${alloc.roomId || 'DEF'}@${slotKey}`)) continue;

          let score = 0;
          if (!grid.get(d).has(p - 1)) score += 10; // avoid consecutive
          score -= grid.get(d).size * 2;             // spread across days
          candidates.push({ d, p, score });
        }
      }

      candidates.sort((a, b) => b.score - a.score);
      for (const c of candidates) {
        if (placed >= needed) break;
        const sk = `${c.d}#${c.p}`;
        grid.get(c.d).add(c.p);
        teacherOcc.add(`${alloc.teacherId._id}@${sk}`);
        roomOcc.add(`${alloc.roomId || 'DEF'}@${sk}`);
        entries.push({
          academicYearId, classId, sectionId,
          dayOfWeek: periodConfig.workingDays[c.d], periodNo: c.p,
          subjectId: alloc.subjectId._id, teacherId: alloc.teacherId._id,
          roomId: alloc.roomId
        });
        placed++;
      }

      if (placed < needed) {
        conflicts.push({ classId, sectionId, subject: alloc.subjectId.name,
          needed, placed });
      }
    }
  }
  await TimetableEntry.insertMany(entries, { ordered: false });
  return { entries, conflicts };
};
```

#### 8.4.3 Conflict Detection and Timetable Views

The manual editor provides real-time conflict detection: every proposed change queries teacher and room occupancy, with valid placements highlighting in green and violations in red. A teacher availability sidebar displays free periods, simplifying substitute identification. The system renders timetables through three view modes: class-wise (all sections side-by-side), teacher-wise (personal schedule), and room-wise (per-classroom schedule).

The `TimetableGrid` component implements the class-wise view:

```jsx
// client/src/features/academics/components/TimetableGrid.jsx
import React, { useMemo } from 'react';

/**
 * Renders a class-wise weekly timetable grid.
 * Rows = periods, Columns = working days.
 * @param {Object[]} entries - TimetableEntry documents
 * @param {string[]} workingDays - Ordered day names
 * @param {number} periodsPerDay - Total periods per day
 * @param {boolean} isEditable - Whether cells are clickable
 * @param {Function} onCellClick - Callback(dayOfWeek, periodNo, entry)
 */
const TimetableGrid = ({ entries, workingDays, periodsPerDay, isEditable, onCellClick }) => {
  const entryMap = useMemo(() => {
    const map = new Map();
    for (const e of entries) map.set(`${e.dayOfWeek}#${e.periodNo}`, e);
    return map;
  }, [entries]);

  const breakPeriods = [4];
  const lunchPeriod = 7;

  const getCell = (day, p) => {
    const entry = entryMap.get(`${day}#${p}`);
    if (!entry) return <span className="text-gray-400">—</span>;
    return (
      <div className="flex flex-col items-center">
        <span className="font-semibold text-indigo-700 text-xs">
          {entry.subjectId.shortName}
        </span>
        <span className="text-gray-500 text-xs">{entry.teacherId?.abbreviation}</span>
        {entry.roomId && <span className="text-gray-400 text-xs">{entry.roomId}</span>}
      </div>
    );
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full border-collapse min-w-[600px]">
        <thead>
          <tr className="bg-gray-50">
            <th className="border px-3 py-2 text-xs font-semibold w-20">Period</th>
            {workingDays.map(d => (
              <th key={d} className="border px-3 py-2 text-xs font-semibold">{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: periodsPerDay }, (_, i) => i + 1).map(p => (
            <tr key={p} className="hover:bg-gray-50">
              <td className="border px-2 py-2 text-center text-xs font-medium">P{p}</td>
              {breakPeriods.includes(p) ? (
                <td colSpan={workingDays.length} className="border bg-amber-50 text-center py-1">
                  <span className="text-xs text-amber-700">Break</span>
                </td>
              ) : p === lunchPeriod ? (
                <td colSpan={workingDays.length} className="border bg-green-50 text-center py-1">
                  <span className="text-xs text-green-700">Lunch</span>
                </td>
              ) : workingDays.map(d => (
                <td key={`${d}-${p}`} className={`border h-16 w-32 ${
                  isEditable ? 'cursor-pointer hover:bg-indigo-50' : ''
                }`} onClick={() => isEditable && onCellClick?.(d, p, entryMap.get(`${d}#${p}`))}>
                  {getCell(d, p)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TimetableGrid;
```

#### 8.4.4 Substitution Management

When a teacher is absent, the system identifies affected timetable entries and queries the teacher occupancy tracker for available substitutes — teachers with a free period in the same slot who teach the same subject elsewhere. The coordinator selects a substitute from ranked suggestions; the system creates a `Substitution` record and notifies the substitute via push and email. All substitutions log to a history collection for payroll adjustment and tracking.

### 8.5 Curriculum & Syllabus Tracking

#### 8.5.1 Syllabus Upload and Lesson Planning

The syllabus subsystem stores chapter-wise topic listings per subject-class combination. Each syllabus contains **units**, and each unit contains **topics** with estimated period requirements, learning outcomes, and optional document attachments. The system implements **version control**: modifying an approved syllabus creates a new version rather than overwriting, preserving existing lesson plan references.

**Lesson plans** link directly to syllabus topics. Teachers create plans specifying objectives, methodology, resources, assessment method, and homework. Plans carry status: `draft`, `submitted`, `reviewed`, or `completed`. Department heads review submitted plans and approve or return with feedback.

#### 8.5.2 Progress Tracking

Progress tracking aggregates topic completion to compute a **curriculum completion percentage** per subject. The dashboard displays visual progress bars with **overdue topic alerts** when the current date exceeds a topic's planned completion date and the topic remains incomplete. The administration receives a term-end completion report showing per-subject percentages, remaining topics, and variance from plan.

The academic year calendar below illustrates how terms, examinations, and curriculum milestones align:

```mermaid
gantt
    title Academic Year 2024-2025 Calendar
    dateFormat  YYYY-MM-DD
    axisFormat  %b

    section Terms
    Semester 1           :a1, 2024-04-01, 2024-09-30
    Semester 2           :a2, 2024-10-01, 2025-03-31

    section Exams
    Mid-Term S1          :crit, e1, 2024-07-15, 2024-07-25
    Final S1             :crit, e2, 2024-09-15, 2024-09-30
    Mid-Term S2          :crit, e3, 2025-01-15, 2025-01-25
    Final S2             :crit, e4, 2025-03-01, 2025-03-20

    section Milestones
    25% Complete         :milestone, m1, 2024-06-15, 0d
    50% Complete         :milestone, m2, 2024-09-01, 0d
    75% Complete         :milestone, m3, 2025-01-01, 0d
    100% Complete        :milestone, m4, 2025-03-15, 0d

    section Admin
    Rollover Prep        :2025-03-21, 2025-03-31
```

Semester 1 spans April through September, Semester 2 from October through March. Examination windows at the 50% and 100% milestones interrupt instruction. Curriculum completion checkpoints trigger automated alerts if actual progress lags behind the plan. The session rollover preparation period at the end of March executes archival, promotion, and new-year setup to ensure the next academic year commences without data continuity gaps.
## 9. Attendance & Examination System

### 9.1 Attendance Management

#### 9.1.1 Marking Interface

The daily attendance interface renders a grid with students as rows and attendance statuses as columns. Each cell is a single-click toggle cycling through available statuses. Class teachers view all students in their assigned section and mark attendance for the current or any selected working day. Subject-wise attendance allows subject teachers to mark presence for specific periods independently. A "Mark All Present" button toggles every student to **Present**, after which the teacher adjusts individual exceptions.

#### 9.1.2 Attendance Bulk Mark API

The `POST /attendance/bulk-mark` endpoint accepts an array of attendance records and performs an atomic insert within a MongoDB transaction. It validates that no attendance records exist for the same class-section-date combination before insertion, preventing double-marking.

```javascript
// server/controllers/attendanceController.js
const markBulkAttendance = catchAsync(async (req, res) => {
  const { classId, sectionId, date, subjectId, records } = req.body;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const existingQuery = { classId, sectionId, date: new Date(date) };
      if (subjectId) existingQuery.subjectId = subjectId;

      const existing = await Attendance.countDocuments(existingQuery, { session });
      if (existing > 0) {
        throw new AppError('Attendance already marked for this date', 409);
      }

      const docs = records.map((rec) => ({
        studentId: rec.studentId,
        classId,
        sectionId,
        subjectId: subjectId || null,
        date: new Date(date),
        status: rec.status,
        markedBy: req.user._id,
        remarks: rec.remarks || '',
      }));

      await Attendance.insertMany(docs, { session, ordered: true });
    });

    notifyParentsOfAbsence(records, date);
    res.status(201).json({
      success: true,
      message: `Marked attendance for ${records.length} students`,
    });
  } finally {
    await session.endSession();
  }
});
```

#### 9.1.3 Status Definitions

The system supports six attendance statuses, each with a single-character code and defined percentage contribution rules.

| Status | Code | Description | Pct. Contribution | Trigger |
|---|---|---|---|---|
| **Present** | `P` | Full session attendance | 1.0 day | Default; teacher marks or bulk |
| **Absent** | `A` | No attendance | 0.0 day | Teacher marks; triggers parent notification |
| **Late** | `L` | Arrived after threshold (default 10:00 AM) | 1.0 day | Check-in time or teacher override |
| **Half-Day** | `H` | Attended morning or afternoon only | 0.5 day | Teacher marks; biometric partial |
| **Excused** | `E` | Approved leave; equivalent to present | 1.0 day | Auto-set on leave approval |
| **On-Duty** | `O` | School-sanctioned external activity | 1.0 day | Admin marks with reason |

A **Late** threshold is stored per academic year in `lateThresholdMinutes`. Three late marks within 30 days generate a disciplinary alert. The **Excused** status bridges the leave workflow (Section 9.1.7) with attendance records: approved leave requests automatically create `Excused` entries for each date in the range.

#### 9.1.4 Attendance Analytics

Monthly attendance percentage uses the formula: `(Present + Half-Day/2 + Excused + On-Duty) / Working Days * 100`. The default minimum threshold is 75%, configurable per academic year. Students below this appear on the defaulter list reviewed weekly by class teachers. Class-wise daily summaries show present, absent, and percentage metrics. Alerts propagate via in-app notifications to teachers and principals, plus automated SMS/email to parents when attendance drops below 75% for two consecutive weeks.

#### 9.1.5 Monthly Report

The monthly report renders a calendar grid with daily status codes colored by type. Summary statistics aggregate present, absent, late, half-day, and excused counts. PDF export via `puppeteer` renders an HTML template with school header, student details, calendar grid, summary table, and signature blocks for class teacher and principal. A parent copy omits internal remarks and reduces to a single-page summary.

#### 9.1.6 Parent Notification

The notification service triggers on every `Absent` or `Late` marking with a configurable delay (default 30 minutes) to prevent redundant alerts from teacher corrections. The queue stores delivery status (`queued`, `sent`, `delivered`, `failed`) with exponential backoff retry for transient SMS failures. Parents receive the student name, date, status, and a link to the attendance detail view.

#### 9.1.7 Leave Application

Students or parents submit leave requests specifying a date range, type (medical, family, sports, other), and reason. Supporting documents upload via Multer. The workflow routes to the class teacher for approval; on approval, the system iterates each date and creates an `Excused` attendance record if no conflict exists. Rejection requires a reason logged in the application history.

```mermaid
flowchart TD
    A[Teacher Opens Grid] --> B{Already Marked?}
    B -->|Yes| C[Load Existing]
    B -->|No| D[Init All Present]
    C --> E[Adjust Statuses]
    D --> E
    E --> F[Save]
    F --> G[Validate Uniqueness]
    G -->|Fail| H[Return 409]
    G -->|Pass| I[Begin Transaction]
    I --> J[Insert Records]
    J --> K[Commit]
    K --> L{Absent/Late?}
    L -->|Yes| M[Queue Parent Notification]
    L -->|No| N[Return Success]
    K --> O[Update Summary Cache]
    O --> P[Recalculate Defaulters]
```

### 9.2 Examination Management

#### 9.2.1 Exam Types

Six configurable exam types feed into final grade calculation: **Unit Test** (monthly, 10% weightage), **Mid-Term** (25%), **Final Exam** (50%), **Quiz** (5%), **Practical** and **Oral** (configured per subject). The system validates that weightages sum to 100% per subject. Each exam type defines whether it is graded, supports practical components, and the default maximum marks.

#### 9.2.2 Exam Schedule

Creating an exam defines a date range, then adds subject-wise schedule entries with date, time, and maximum marks. The schedule publishes to student and parent portals upon confirmation, triggering notifications. Hall ticket generation (Section 9.2.4) queries this schedule to produce per-student admit cards.

#### 9.2.3 Exam Timetable

The calendar view aggregates all scheduled exams, filterable by class and section. Clash detection flags any class-section with two exams on the same date. Seating arrangement generation uses round-robin distribution across rooms, ensuring adjacent seats hold students from different sections.

#### 9.2.4 Hall Ticket

The hall ticket auto-generates per student before the exam period, including the student photograph, scheduled subjects with dates and times, examination rules, and a verification barcode encoding the admission number. PDF generation uses `puppeteer` with the school header and principal signature block.

### 9.3 Marks Entry & Processing

#### 9.3.1 Marks Entry Interface

The teacher's portal loads students for the teacher's assigned subjects and selected exam. A grid displays input fields for theory marks, practical marks (if applicable), and remark codes. Each input enforces range validation (0 to `maxMarks`) on blur. Auto-save draft mode persists to `localStorage` every 10 seconds. The teacher toggles between **Draft** and **Submit for Verification**; once submitted, marks become read-only for the teacher.

#### 9.3.2 Validation Rules

Four hard constraints govern every entry: range validation (`0 <= marks <= maxMarks`); duplicate prevention via a compound unique index on `(studentId, examScheduleId)` returning 409 on conflict; grace marks requiring admin configuration with maximums per subject and per student, applied only by admins with audit logging; and remark codes (`ABS`, `CNG`, `UMC`, `CAN`) that override numeric marks and display on report cards in place of grades.

#### 9.3.3 Marks Workflow

Marks follow a four-state pipeline: **Draft** → **Submitted** → **Verified** → **Published**. Teachers create and edit drafts freely, then submit for verification. Department heads review and either verify or return with comments. Admins publish, locking records and triggering grade calculation.

```javascript
// server/controllers/marksController.js
const marksController = {
  saveDraft: catchAsync(async (req, res) => {
    const { examScheduleId, marks } = req.body;
    const teacherId = req.user._id;

    const schedule = await ExamSchedule.findById(examScheduleId);
    if (!schedule) throw new AppError('Exam schedule not found', 404);

    const ops = marks.map((m) => ({
      updateOne: {
        filter: { studentId: m.studentId, examScheduleId },
        update: {
          $set: {
            marksObtained: m.marksObtained,
            marksObtainedPractical: m.marksObtainedPractical || 0,
            remarkCode: m.remarkCode || null,
            status: 'draft',
            enteredBy: teacherId,
            enteredAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

    await Marks.bulkWrite(ops);
    res.status(200).json({ success: true, message: 'Draft saved' });
  }),

  submitForVerification: catchAsync(async (req, res) => {
    const { examScheduleId } = req.body;
    const result = await Marks.updateMany(
      { examScheduleId, status: 'draft' },
      { $set: { status: 'submitted', submittedAt: new Date() } }
    );
    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} marks submitted`,
    });
  }),

  publishResults: catchAsync(async (req, res) => {
    if (req.user.role !== 'admin') {
      throw new AppError('Only admin can publish', 403);
    }
    const { examScheduleId } = req.body;
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      await Marks.updateMany(
        { examScheduleId, status: 'verified' },
        { $set: { status: 'published', publishedAt: new Date() } },
        { session }
      );
      await calculateGradesForExam(examScheduleId, session);
    });
    await session.endSession();
    res.status(200).json({ success: true, message: 'Results published' });
  }),
};
```

#### 9.3.4 Lock Mechanism

Published marks are immutable. The `pre('save')` hook on the Marks model rejects modifications where `status === 'published'`. Correction requires an admin-initiated unlock with reason audit; previous values append to a `versionHistory` array, preserving full traceability.

### 9.4 Grading System

#### 9.4.1 Grade Scale

The configurable grade scale maps percentage ranges to letter grades. The default 7-point scale:

| Grade | Range | Grade Point | Description | Pass/Fail |
|---|---|---|---|---|
| **A+** | 90 – 100 | 10 | Outstanding | Pass |
| **A** | 80 – 89 | 9 | Excellent | Pass |
| **B+** | 70 – 79 | 8 | Very Good | Pass |
| **B** | 60 – 69 | 7 | Good | Pass |
| **C** | 50 – 59 | 6 | Satisfactory | Pass |
| **D** | 40 – 49 | 5 | Minimum Pass | Pass |
| **F** | Below 40 | 0 | Fail | Fail |

Each academic year maintains its own grade scale version, ensuring historical report cards use the scale in effect at the time. The `isPassing` boolean determines promotion eligibility.

#### 9.4.2 Grade Calculation

The engine aggregates weighted marks across exam types per subject, computes percentages, assigns grades, and calculates ranks. Overall percentage is the simple average of subject percentages. Rank sorts students within class-section by overall percentage; ties break by total marks. Division assignment: **First** (>=60%), **Second** (50-59%), **Third** (40-49%), **Fail** (<40%).

```javascript
// server/services/gradeCalculationService.js
const calculateStudentGrades = async (studentId, academicYearId, session) => {
  const marks = await Marks.find({ studentId, status: 'published' })
    .populate({
      path: 'examScheduleId',
      populate: [{ path: 'subjectId' }, { path: 'examId', populate: 'examTypeId' }],
    })
    .session(session);

  const bySubject = {};
  for (const m of marks) {
    const sid = m.examScheduleId.subjectId._id.toString();
    if (!bySubject[sid]) {
      bySubject[sid] = { weightedMarks: 0, weightedMax: 0 };
    }
    const w = m.examScheduleId.examId.examTypeId.weightage / 100;
    bySubject[sid].weightedMarks += m.marksObtained * w;
    bySubject[sid].weightedMax += m.examScheduleId.maxMarks * w;
  }

  const scale = await GradeScale.find({ academicYearId }).sort('minMarks').session(session);
  let totalPct = 0;
  const results = Object.entries(bySubject).map(([, d]) => {
    const pct = (d.weightedMarks / d.weightedMax) * 100;
    totalPct += pct;
    const g = scale.find((s) => pct >= s.minMarks && pct <= s.maxMarks);
    return { percentage: +pct.toFixed(2), grade: g?.grade || 'F', isPassing: g?.isPassing ?? false };
  });

  const overall = totalPct / results.length;
  const og = scale.find((s) => overall >= s.minMarks && overall <= s.maxMarks);
  return {
    subjectResults: results,
    overallPercentage: +overall.toFixed(2),
    overallGrade: og?.grade || 'F',
    allPassing: results.every((r) => r.isPassing),
    distinction: overall >= 75 && results.every((r) => r.isPassing),
  };
};
```

#### 9.4.3 Result Processing

Result processing executes after all subject marks are published. The pipeline computes subject-wise marks and grades, aggregates overall totals, assigns grades and ranks, and determines pass/fail (all subjects must have passing grades; more than two failures means ineligible for promotion). The **distinction** flag requires 75% or higher overall with no failures. Results write to `StudentPerformanceAnalytics` for fast dashboard querying.

#### 9.4.4 Report Card Generation

The report card controller renders a PDF via `puppeteer` with student details, subject-wise results, attendance summary, co-curricular grades, teacher remarks, and the principal's digital signature.

```javascript
// server/controllers/reportCardController.js
const generateReportCard = catchAsync(async (req, res) => {
  const { studentId, academicYearId, termId } = req.params;

  const student = await Student.findById(studentId).populate('classId sectionId');
  const result = await calculateStudentGrades(studentId, academicYearId);
  const attendance = await AttendanceSummary.findOne({ studentId, academicYearId, termId });

  const data = {
    schoolName: process.env.SCHOOL_NAME,
    studentName: `${student.firstName} ${student.lastName}`,
    admissionNo: student.admissionNo,
    className: student.classId.name,
    sectionName: student.sectionId.name,
    subjectResults: result.subjectResults,
    overallPercentage: result.overallPercentage,
    overallGrade: result.overallGrade,
    attendancePct: attendance?.attendancePercentage || 'N/A',
    teacherRemarks: req.body.teacherRemarks || '',
    generatedAt: new Date().toLocaleDateString(),
  };

  const html = handlebars.compile(
    fs.readFileSync(path.join(__dirname, '../templates/report-card.hbs'), 'utf8')
  )(data);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="rc-${student.admissionNo}.pdf"`);
  res.send(pdf);
});
```

### 9.5 Result Publication & Analysis

#### 9.5.1 Publication Workflow

Results pass through three-step review before reaching students: class teacher reviews for anomalies, principal approves, and the system releases data on the scheduled publication date. Results remain invisible to students until that date, even if processing completes earlier.

#### 9.5.2 Student Result View

The individual marksheet displays each subject with marks, grade, and grade point. A comparison bar shows student marks against the class average per subject. A line graph renders historical performance across terms.

#### 9.5.3 Class Analytics

The dashboard aggregates pass/fail ratios, subject-wise average marks, and a grade distribution histogram. Top 10 and bottom 10 lists rank students by overall percentage for remedial allocation and recognition.

#### 9.5.4 Performance Insights

The engine flags weak subjects where class average falls below 50% or more than 30% of students score below passing. Section-wise comparison charts evaluate teaching effectiveness. Students scoring below 40% in any subject trigger auto-generated parent-teacher meeting recommendations.

```mermaid
flowchart TD
    A[Teacher Enters Draft] --> B[Submit for Verification]
    B --> C{HOD Review}
    C -->|Reject| D[Return with Comments]
    C -->|Approve| E[Status: Verified]
    D --> A
    E --> F[Admin Publishes]
    F --> G[Lock Marks Read-Only]
    G --> H[Calculate Grades]
    H --> I[Calculate Rankings]
    I --> J[Update Analytics]
    J --> K{Publication Date?}
    K -->|No| L[Hold Until Scheduled]
    K -->|Yes| M[Release to Portals]
    M --> N[Notify Parents]
    N --> O[Update Class Dashboard]
```
## 10. Fee & Finance Management

The Fee & Finance Management module forms the financial backbone of the School Management System, handling everything from fee structure configuration and collection workflow to financial reporting and expense tracking. This module serves multiple stakeholders — accountants record payments and generate receipts, administrators configure fee structures and approve concessions, students and parents view dues and make online payments, and finance managers analyze collection trends and monitor budget variance. The module must guarantee data integrity through immutable audit trails, support multiple payment modes, handle complex concession rules, and provide real-time visibility into the institution's financial health.

### 10.1 Fee Structure Configuration

#### 10.1.1 Fee Head Management

A **FeeHead** represents a distinct category of fee charged by the institution. The system supports ten standard fee heads: Tuition, Admission, Registration, Examination, Transport, Hostel, Library, Laboratory, Sports, and Late Fee. Each fee head carries a unique code (e.g., `TUITION`, `ADMISSION`), a human-readable description, a default frequency (one-time, monthly, quarterly, half-yearly, or annual), and an active/inactive status flag. Accountants with the appropriate role permissions can create custom fee heads beyond the standard set. The `FeeHead` schema references the `AcademicYear` model to allow versioned fee heads that evolve across years without affecting historical records. All CRUD operations on fee heads are logged to the audit trail with before-and-after value snapshots.

#### 10.1.2 Fee Structure Assignment

The **FeeStructure** model binds a fee head to a specific class, student category, and academic year with a defined amount. A single fee head can appear multiple times within the same academic year — once per class-category combination. The student category dimension supports the Indian reservation system: General, SC (Scheduled Caste), ST (Scheduled Tribe), and OBC (Other Backward Classes), each potentially carrying a different fee amount. The frequency field determines the billing cadence: one-time fees (admission, registration) are charged once upon enrollment; recurring fees (tuition, transport) generate periodic invoices based on their frequency. Academic year binding ensures that fee structures for the current year do not interfere with historical data, and schema-level validation prevents overlapping effective date ranges for the same class-category-head combination.

The following table illustrates a sample fee structure template for Grade 1 in the 2025–26 academic year:

| Fee Head | Category | Amount (INR) | Frequency | Billing Month(s) |
|---|---|---|---|---|
| Tuition Fee | General | 3,500 | Monthly | April–March |
| Tuition Fee | SC/ST | 1,750 | Monthly | April–March |
| Admission Fee | All | 5,000 | One-time | At enrollment |
| Examination Fee | All | 800 | Annual | January |
| Transport Fee | All | 1,200 | Monthly | April–March |
| Library Fee | All | 200 | Annual | April |
| Laboratory Fee | All | 500 | Annual | April |
| Sports Fee | All | 300 | Annual | April |
| Late Fee Fine | All | 50/day | Penalty | Post due date |

This table demonstrates the multi-dimensional nature of fee assignment: the Tuition Fee varies by student category (General pays double the SC/ST rate), while the Admission Fee applies uniformly across all categories. The Late Fee Fine row illustrates the penalty fee head, which uses a per-day calculation rather than a fixed amount. When rendering the fee structure configuration UI, React components group rows by fee head and use nested tables or expandable rows to display category-wise variations, with the `DataTable` component from Chapter 5 handling sortable column headers and pagination for large structures spanning multiple classes.

#### 10.1.3 Concessions and Scholarships

The **FeeConcession** model links a student to a specific fee head with a waiver defined as either a percentage or a fixed amount. The `concessionType` field stores either `percentage` or `fixed`, and the `value` field stores the numeric waiver (e.g., `50` for 50% or `500` for INR 500 off). A `netAmount` virtual field on the `StudentFee` document computes the final payable amount by subtracting the concession from the base fee structure amount. The system supports multiple concession categories: sibling discount (applies only to tuition fee, non-cumulative with other discounts), staff child discount (configurable percentage set by admin), merit-based scholarship (linked to the `StudentScholarship` model with academic performance criteria), and orphan/student-in-need category (requires documentary proof upload and admin approval). Concession records carry `effectiveFrom` and `effectiveTo` date fields to support time-bound waivers, and the approval workflow requires at least one authorized signatory (admin or finance manager) before the concession becomes active.

#### 10.1.4 Fine Rules

Fine configuration lives in the **FineConfiguration** model, which stores the rules for late fee computation. The `fineType` field accepts `percentage_per_day` or `fixed_per_day`, and the `fineAmount` field stores the daily penalty value. A `graceDays` field (default 0) defines the buffer period after the due date before fines begin accruing. The `maxFine` field enforces a ceiling on the total penalty to prevent excessive accumulation — a critical business rule for institutions serving economically disadvantaged students. When a fine exceeds a threshold set in the configuration, the system triggers a waiver approval workflow: the accountant initiates a waiver request with a reason and supporting documents, the finance manager reviews and approves or rejects, and the final decision is recorded in the audit trail. The fine calculation engine runs as a scheduled job at midnight each day, iterating over all invoices with `status: 'Pending'` and a past due date to compute and append fine line items.

### 10.2 Fee Collection Workflow

#### 10.2.1 Student Fee Ledger

The student fee ledger provides a comprehensive view of all financial transactions for an individual student. The **FeeInvoice** model serves as the primary ledger document, with each invoice representing a billing period (month for recurring fees, one-time for non-recurring). The invoice carries fields for `totalAmount` (sum of all fee head amounts), `concessionAmount` (aggregate waivers), `fineAmount` (computed late fees), `netAmount` (total minus concessions plus fines), `paidAmount` (sum of all payment receipts), and `balanceAmount` (net minus paid). The ledger supports filtering by academic year and payment status, and the running balance updates in real time as new payments are recorded.

The following code sample implements the core fee calculation logic that runs during invoice generation:

```javascript
// server/services/feeCalculationService.js
const FeeStructure = require('../models/FeeStructure');
const FeeConcession = require('../models/FeeConcession');
const FineConfiguration = require('../models/FineConfiguration');

/**
 * Calculate net fee amount for a student considering
 * fee structure, concessions, and applicable fines.
 */
async function calculateStudentFee(studentId, classId, category, academicYearId, billingMonth) {
  // Fetch all active fee structures for the student's class and category
  const feeStructures = await FeeStructure.find({
    classId,
    category: { $in: [category, 'All'] },
    academicYearId,
    status: 'active'
  }).populate('feeHeadId');

  let totalAmount = 0;
  const lineItems = [];

  for (const fs of feeStructures) {
    // Skip non-applicable recurring fees for this billing month
    if (fs.frequency === 'monthly' && fs.billingMonth !== billingMonth) continue;
    if (fs.frequency === 'quarterly' && !isQuarterMonth(fs, billingMonth)) continue;

    // Fetch applicable concessions for this student and fee head
    const concessions = await FeeConcession.find({
      studentId,
      feeHeadId: fs.feeHeadId._id,
      status: 'approved',
      effectiveFrom: { $lte: new Date() },
      $or: [{ effectiveTo: { $gte: new Date() } }, { effectiveTo: null }]
    });

    let concessionAmount = 0;
    for (const c of concessions) {
      concessionAmount += c.concessionType === 'percentage'
        ? (fs.amount * c.value) / 100
        : c.value;
    }

    const netAmount = Math.max(0, fs.amount - concessionAmount);
    totalAmount += netAmount;

    lineItems.push({
      feeHeadId: fs.feeHeadId._id,
      feeHeadName: fs.feeHeadId.name,
      baseAmount: fs.amount,
      concessionAmount: Math.round(concessionAmount * 100) / 100,
      netAmount: Math.round(netAmount * 100) / 100,
      frequency: fs.frequency
    });
  }

  // Calculate late fee fine if invoice is past due
  const fineConfig = await FineConfiguration.findOne({ feeHeadId: null, status: 'active' });
  let fineAmount = 0;
  if (fineConfig) {
    const dueDate = new Date(getDueDate(academicYearId, billingMonth));
    const graceDate = new Date(dueDate);
    graceDate.setDate(graceDate.getDate() + fineConfig.graceDays);

    if (new Date() > graceDate) {
      const daysOverdue = Math.floor((new Date() - graceDate) / (1000 * 60 * 60 * 24));
      fineAmount = fineConfig.fineType === 'fixed_per_day'
        ? daysOverdue * fineConfig.fineAmount
        : (totalAmount * fineConfig.fineAmount * daysOverdue) / 100;
      fineAmount = Math.min(fineAmount, fineConfig.maxFine); // Enforce cap
    }
  }

  return {
    totalAmount: Math.round(totalAmount * 100) / 100,
    concessionAmount: Math.round(lineItems.reduce((s, i) => s + i.concessionAmount, 0) * 100) / 100,
    fineAmount: Math.round(fineAmount * 100) / 100,
    netAmount: Math.round((totalAmount + fineAmount) * 100) / 100,
    lineItems,
    dueDate: getDueDate(academicYearId, billingMonth)
  };
}

module.exports = { calculateStudentFee };
```

This service function aggregates fee structures, applies concessions, and computes late fines in a single call. It filters fee structures by the student's class and category, applies time-bound concessions from the `FeeConcession` collection, and calculates overdue fines using the `FineConfiguration` rules with the configured maximum cap. The function returns a fully computed invoice payload that the invoice generation controller persists to the database.

#### 10.2.2 Payment Recording

The payment recording API accepts multiple payment modes: **cash** (with collector name and counter ID), **cheque** (with cheque number, bank name, cheque date, and clearance status), and **online** (with UPI ID, card reference, net banking transaction ID, or payment gateway response). The system accepts partial payments — the business rule requires the minimum payment to be at least 50% of the net due amount unless waived by an authorized user. Each payment record creates a `FeeReceipt` document linked to the invoice, and the invoice's `paidAmount` and `balanceAmount` fields update atomically within a MongoDB transaction to prevent race conditions in concurrent payment scenarios.

The following controller handles payment recording:

```javascript
// server/controllers/feePaymentController.js
const mongoose = require('mongoose');
const FeeInvoice = require('../models/FeeInvoice');
const FeeReceipt = require('../models/FeeReceipt');
const AppError = require('../utils/AppError');

/**
 * POST /api/v1/fee-payments/record
 * Record a fee payment against an invoice with full transaction safety.
 */
exports.recordPayment = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { invoiceId, amount, paymentMode, paymentDetails, collectedBy } = req.body;

    // Fetch and lock the invoice within the transaction
    const invoice = await FeeInvoice.findById(invoiceId).session(session);
    if (!invoice) throw new AppError('Invoice not found', 404);
    if (invoice.status === 'paid') throw new AppError('Invoice already fully paid', 409);
    if (invoice.status === 'cancelled') throw new AppError('Cannot pay against a cancelled invoice', 409);

    // Validate minimum partial payment (50% of balance unless waived)
    const balance = invoice.netAmount - invoice.paidAmount;
    if (amount < balance * 0.5 && !req.body.waiverApproved) {
      throw new AppError(`Minimum payment is 50% of balance (${balance * 0.5})`, 400);
    }
    if (amount > balance) throw new AppError(`Payment exceeds balance amount (${balance})`, 400);

    // Generate unique receipt number: REC-YYYY-XXXXX
    const year = new Date().getFullYear();
    const receiptCount = await FeeReceipt.countDocuments({
      receiptNo: { $regex: `^REC-${year}` }
    }).session(session);
    const receiptNo = `REC-${year}-${String(receiptCount + 1).padStart(5, '0')}`;

    // Create the receipt document
    const receipt = await FeeReceipt.create([{
      receiptNo,
      invoiceId,
      studentId: invoice.studentId,
      amount,
      paymentMode,
      transactionReference: paymentDetails.transactionId || paymentDetails.chequeNo || null,
      bankName: paymentDetails.bankName || null,
      chequeNo: paymentDetails.chequeNo || null,
      chequeDate: paymentDetails.chequeDate || null,
      collectedBy,
      collectedAt: new Date(),
      status: paymentMode === 'cheque' ? 'pending_clearance' : 'completed'
    }], { session });

    // Atomically update the invoice
    const newPaidAmount = invoice.paidAmount + amount;
    const newBalance = invoice.netAmount - newPaidAmount;
    const newStatus = newBalance <= 0 ? 'paid' : 'partial';

    await FeeInvoice.findByIdAndUpdate(invoiceId, {
      $set: {
        paidAmount: Math.round(newPaidAmount * 100) / 100,
        balanceAmount: Math.round(Math.max(0, newBalance) * 100) / 100,
        status: newStatus,
        lastPaymentDate: new Date()
      }
    }, { session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      data: {
        receipt: receipt[0],
        invoiceStatus: newStatus,
        remainingBalance: Math.max(0, newBalance)
      },
      message: `Payment of ${amount} recorded successfully. Receipt: ${receiptNo}`
    });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};
```

The controller wraps all payment recording logic inside a MongoDB multi-document transaction. It validates the payment amount against business rules, generates a sequentially numbered receipt, creates the receipt document, and updates the invoice status atomically. If any step fails, the transaction aborts and no partial writes persist to the database — this prevents the critical data integrity failure of recording a receipt without updating the invoice balance.

#### 10.2.3 Receipt Generation

Every successful payment generates a receipt with a unique number following the format `REC-YYYY-XXXXX` (e.g., `REC-2025-00042`). The receipt includes a full fee breakup by head, the concession details, any fine applied, the payment mode with reference details, and a digital signature placeholder. The PDF generation pipeline uses Puppeteer to render an HTML template with school branding and convert it to a downloadable PDF document.

The following service generates receipt PDFs and triggers email delivery:

```javascript
// server/services/receiptService.js
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const FeeReceipt = require('../models/FeeReceipt');
const FeeInvoice = require('../models/FeeInvoice');
const Student = require('../models/Student');

/**
 * Generate a PDF receipt for a fee payment and optionally email it.
 */
async function generateReceiptPDF(receiptId, options = {}) {
  const receipt = await FeeReceipt.findById(receiptId)
    .populate('studentId', 'firstName lastName admissionNo classId')
    .populate('invoiceId')
    .populate('collectedBy', 'firstName lastName');

  if (!receipt) throw new Error('Receipt not found');

  const student = receipt.studentId;
  const invoice = receipt.invoiceId;

  // Build the HTML receipt template
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      @page { size: A4; margin: 20mm; }
      body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #333; }
      .header { text-align: center; border-bottom: 3px solid #4f46e5; padding-bottom: 10px; margin-bottom: 20px; }
      .header h1 { margin: 0; font-size: 22px; color: #4f46e5; }
      .header p { margin: 4px 0; color: #666; }
      .receipt-meta { display: flex; justify-content: space-between; margin-bottom: 20px; }
      .box { border: 1px solid #ddd; padding: 10px; border-radius: 4px; width: 48%; }
      .box h3 { margin: 0 0 8px 0; font-size: 13px; color: #4f46e5; }
      table { width: 100%; border-collapse: collapse; margin: 15px 0; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background: #f3f4f6; font-weight: 600; }
      .text-right { text-align: right; }
      .total-row { font-weight: bold; background: #eef2ff; }
      .footer { margin-top: 30px; display: flex; justify-content: space-between; }
      .signature-box { border-top: 1px solid #333; width: 150px; text-align: center; padding-top: 5px; }
      .stamp { text-align: center; color: #999; font-style: italic; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>Fee Payment Receipt</h1>
      <p>${process.env.SCHOOL_NAME || 'School Management System'}</p>
      <p>${process.env.SCHOOL_ADDRESS || ''}</p>
    </div>
    <div class="receipt-meta">
      <div class="box">
        <h3>Receipt Details</h3>
        <p><strong>Receipt No:</strong> ${receipt.receiptNo}</p>
        <p><strong>Date:</strong> ${receipt.collectedAt.toLocaleDateString('en-IN')}</p>
        <p><strong>Payment Mode:</strong> ${receipt.paymentMode.toUpperCase()}</p>
        ${receipt.transactionReference ? `<p><strong>Reference:</strong> ${receipt.transactionReference}</p>` : ''}
        ${receipt.chequeNo ? `<p><strong>Cheque No:</strong> ${receipt.chequeNo}</p><p><strong>Bank:</strong> ${receipt.bankName}</p>` : ''}
      </div>
      <div class="box">
        <h3>Student Details</h3>
        <p><strong>Name:</strong> ${student.firstName} ${student.lastName}</p>
        <p><strong>Admission No:</strong> ${student.admissionNo}</p>
        <p><strong>Class:</strong> ${student.classId?.name || 'N/A'}</p>
      </div>
    </div>
    <table>
      <thead>
        <tr><th>Fee Head</th><th class="text-right">Amount (INR)</th></tr>
      </thead>
      <tbody>
        ${invoice.lineItems.map(item => `
          <tr>
            <td>${item.feeHeadName} ${item.concessionAmount > 0 ? `<small>(Concession: -${item.concessionAmount})</small>` : ''}</td>
            <td class="text-right">${item.netAmount.toFixed(2)}</td>
          </tr>
        `).join('')}
        ${invoice.fineAmount > 0 ? `<tr><td>Late Fee Fine</td><td class="text-right">${invoice.fineAmount.toFixed(2)}</td></tr>` : ''}
        <tr class="total-row"><td>Total Paid</td><td class="text-right">${receipt.amount.toFixed(2)}</td></tr>
      </tbody>
    </table>
    <div class="stamp">This is a computer-generated receipt and does not require a physical signature.</div>
    <div class="footer">
      <div class="signature-box">Authorized Signature</div>
      <div style="text-align:right;color:#666;font-size:11px;">
        Collected by: ${receipt.collectedBy?.firstName || 'System'}<br>
        Thank you for your payment.
      </div>
    </div>
  </body>
  </html>`;

  // Generate PDF with Puppeteer
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const outputDir = path.join(__dirname, '../../uploads/receipts');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const pdfPath = path.join(outputDir, `${receipt.receiptNo}.pdf`);
  await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
  await browser.close();

  // Update receipt with PDF path
  await FeeReceipt.findByIdAndUpdate(receiptId, { pdfUrl: `/uploads/receipts/${receipt.receiptNo}.pdf` });

  // Auto-email receipt if student has a registered parent email
  if (options.sendEmail !== false) {
    await emailReceipt(receipt, pdfPath);
  }

  return pdfPath;
}

async function emailReceipt(receipt, pdfPath) {
  const student = await Student.findById(receipt.studentId).populate('guardianIds');
  const parentEmail = student.guardianIds?.[0]?.email;
  if (!parentEmail) return;

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });

  await transporter.sendMail({
    from: `"${process.env.SCHOOL_NAME}" <${process.env.EMAIL_USER}>`,
    to: parentEmail,
    subject: `Fee Receipt - ${receipt.receiptNo}`,
    html: `<p>Dear Parent,</p><p>Your fee payment of <strong>INR ${receipt.amount.toFixed(2)}</strong> has been received. Receipt <strong>${receipt.receiptNo}</strong> is attached.</p><p>Thank you.</p>`,
    attachments: [{ filename: `${receipt.receiptNo}.pdf`, path: pdfPath }]
  });
}

module.exports = { generateReceiptPDF };
```

The receipt generation service uses Puppeteer to render a styled HTML template into an A4 PDF. The template includes the school header (configured via environment variables), student details, a line-item table of fee heads with concession annotations, fine amounts, and payment metadata. After PDF generation, the service emails the receipt to the student's registered parent email using Nodemailer with the PDF as an attachment. The generated PDF path is stored on the receipt document for subsequent re-downloads without re-rendering.

#### 10.2.4 Payment Status Tracking

Every invoice maintains a status field that transitions through a defined lifecycle. The status values and their semantics are:

| Status | Definition | Color Code | Trigger Condition |
|---|---|---|---|
| Paid | Full payment received, zero balance | Green (`#22c55e`) | `balanceAmount <= 0` |
| Partial | Partial payment received, balance outstanding | Amber (`#f59e0b`) | `paidAmount > 0 && balanceAmount > 0` |
| Pending | No payment received, still within due date | Blue (`#3b82f6`) | `paidAmount == 0 && today <= dueDate` |
| Overdue | No payment or partial payment, past due date | Red (`#ef4444`) | `balanceAmount > 0 && today > dueDate + graceDays` |

The status field updates automatically through the payment recording controller and the nightly fine calculation cron job. The React frontend renders these statuses using the `StatusBadge` component from Chapter 5 with the assigned color codes, enabling accountants to identify overdue accounts at a glance. A scheduled job running daily at 6:00 AM recalculates all invoice statuses and triggers automated reminder notifications for invoices approaching or exceeding their due dates.

The complete fee payment flow from invoice generation through receipt delivery is illustrated below:

```mermaid
flowchart TD
    A[Fee Structure Configured] --> B[Invoice Generation Cron<br/>Monthly / Yearly]
    B --> C[Apply Concessions &<br/>Calculate Net Amount]
    C --> D[Invoice Created<br/>Status: Pending]
    D --> E{Payment Received?}
    E -->|No| F{Due Date Passed?}
    F -->|No| G[Send Reminder<br/>3 Days Before Due]
    F -->|Yes| H[Apply Late Fine<br/>Status: Overdue]
    H --> I[Send Overdue Notice<br/>+ Weekly Follow-up]
    I --> E
    G --> D
    E -->|Yes| J[Record Payment<br/>Cash / Cheque / Online]
    J --> K{Full or Partial?}
    K -->|Full| L[Status: Paid]
    K -->|Partial| M[Status: Partial]
    L --> N[Generate Receipt PDF]
    M --> N
    N --> O[Email Receipt to Parent]
    O --> P[Update Student Ledger]
```

This flowchart shows the cyclic nature of the payment workflow: invoices start as Pending, transition to Overdue if unpaid past the due date (triggering fine accumulation and escalation notices), and resolve to either Paid or Partial when payment arrives. The partial payment path loops back into the cycle, allowing students to pay in installments across multiple transactions until the balance reaches zero.

### 10.3 Financial Reporting

#### 10.3.1 Daily Collection Report

The daily collection report aggregates all fee receipts recorded within a 24-hour window. It groups payments by mode (cash, cheque, online) with subtotals per mode and a grand total, then further breaks down by cashier to support individual accountability. A deposit reconciliation section compares the cash total against the recorded bank deposit slip, flagging any variance for investigation. The report API accepts a `date` parameter and returns the structured data; the frontend renders it using the `DataTable` component with export options for PDF and Excel.

#### 10.3.2 Monthly and Annual Analytics

The analytics module compares actual fee collections against targets set per class and per fee head. A month-over-month trend API returns collection totals for the last 12 months, enabling the frontend to render a Recharts line chart showing seasonal patterns (typically lower collection during vacation months). The class-wise collection summary groups all receipts by the student's enrolled class, revealing collection disparities that may indicate enrollment shifts or fee structure imbalances. The year-end financial summary rolls up all data into a single executive report with charts for collection distribution, concession impact, and fine revenue.

#### 10.3.3 Outstanding Dues Analysis

The outstanding dues report segments unpaid balances by age: 0–30 days (current), 31–60 days, 61–90 days, and 90+ days (severe delinquency). Each aging bucket computes a total outstanding amount and student count. The student-wise defaulter list queries all invoices with `status: 'overdue'`, joins student and parent contact data, and sorts by descending balance amount. The total outstanding dashboard widget displays the aggregate overdue amount across all aging buckets and updates every 5 minutes via the analytics cache layer described in Chapter 12. A business rule flags students with 90+ day overdue balances for administrative action, including potential examination registration barring.

#### 10.3.4 Automated Reminders

The reminder engine operates on a three-tier schedule. Three days before the due date, the system sends a polite fee due reminder via SMS and email containing the invoice amount and a payment link. On the due date, the tone shifts to an overdue notice. For invoices remaining unpaid, weekly follow-up notices escalate the urgency. Each reminder creates a `FeeReminder` log entry tracking the reminder type, channel, timestamp, and delivery status. The reminder dispatcher uses the notification queue from Chapter 12 to handle high-volume sends without blocking the main application thread, and it respects parent notification preferences configured in their profile.

### 10.4 Expense & Budget Tracking

#### 10.4.1 Expense Management

The **Expense** model records institutional expenditures categorized into predefined types: salaries, utilities (electricity, water, internet), maintenance (building repairs, equipment servicing), supplies (stationery, laboratory materials), and events (annual day, sports meet). Each expense entry captures the amount, date, vendor, description, and an uploaded receipt image or PDF. A two-level approval workflow governs large expenses: entries below a configurable threshold (default INR 10,000) require a single accountant approval, while amounts exceeding the threshold need additional finance manager sign-off. The approval chain uses the same audit trail mechanism as fee concessions, recording approver identity, timestamp, and decision reason.

#### 10.4.2 Income Summary

Beyond fee collection, the income module aggregates all revenue streams: donations (with donor details and 80G tax exemption receipt eligibility), government grants (tagged by scheme and utilization period), and miscellaneous income (rental income, event sponsorships). The monthly income statement API groups all income by category and compares it against the same month in the previous academic year, computing a year-over-year growth percentage. This data feeds directly into the analytics dashboard described in Chapter 12, giving administrators a consolidated view of institutional revenue health.

#### 10.4.3 Budgeting

The **Budget** model defines annual allocation amounts per expense category. At the start of each financial year, administrators input budget estimates based on historical spending and planned initiatives. As expenses are recorded, the system computes a real-time **actual vs. budget variance** for each category. Categories where actual spending exceeds 90% of the budget trigger an overspend alert to the finance manager. Budget revisions mid-year follow a formal workflow: the accountant proposes a revised amount with justification, the finance manager reviews, and approved revisions are versioned with the previous budget preserved for audit. The variance report displays each category with three columns — budgeted amount, actual spent, and variance percentage — with negative variances (underspend) in green and positive variances (overspend) in red, providing immediate visual feedback on fiscal discipline.
## 11. Library, Transport & Hostel Management

The Library, Transport, and Hostel modules manage physical school resources — books, vehicles, and residential rooms — integrating with the Fee module from Chapter 10 to generate invoice line items for library fines, transport fees, and hostel rent.

### 11.1 Library Management Module

#### 11.1.1 Book Catalog

The **Book** schema stores bibliographic metadata; **BookCopy** tracks individual copies with accession numbers. The catalog supports MARC record import.

| Field | Type | Description | Example |
|---|---|---|---|
| `isbn` | String (unique) | ISBN | 978-0-13-468599-1 |
| `title` | String (indexed) | Book title | Clean Code |
| `authors` | [String] | Author(s) | [Robert C. Martin] |
| `publisher` | String | Publishing house | Prentice Hall |
| `edition` | String | Edition | 1st Edition |
| `categoryId` | ObjectId | Classification ref | 005.1 Programming |
| `shelfLocation` | String | Rack position | R-A3-S12 |
| `totalCopies` | Number | Copies owned | 5 |
| `availableCopies` | Number | Copies available | 2 |
| `coverImageUrl` | String | Cover path | /uploads/covers/123.jpg |
| `marcRecord` | Object | MARC21 fields | { leader, dataFields } |

`availableCopies` denormalizes to avoid checkout aggregation. Each BookCopy has accession number `ACC-[YEAR]-[SEQUENCE]`, barcode, and status enum.

#### 11.1.2 Book Operations

Adding triggers barcode generation via `bwip-js` and creates BookCopy records. ISBN lookup (Google Books) auto-populates fields. Bulk import accepts CSV; the parser inserts validated records in a transaction. Editing updates Book only. Marking `lost`/`damaged` decrements `totalCopies`. Deletion is blocked if copies are in circulation; status changes to `archived` instead.

#### 11.1.3 Book Issue Workflow

Issue workflow scans student ID and barcode, validates fines, enforces limits, computes due date skipping holidays.

```mermaid
flowchart TD
    A[Scan student ID] --> B{Outstanding fines<br/>> threshold?}
    B -- Yes --> C[Block issue]
    B -- No --> D[Scan book barcode]
    D --> E{Book available?}
    E -- No --> F[Block issue]
    E -- Yes --> G{Under issue limit?}
    G -- No --> H[Block issue]
    G -- Yes --> I[Calculate due date<br/>skip holidays]
    I --> J[Create BookIssue<br/>decrement availableCopies]
    J --> K[Print issue slip]
```

The controller implements this workflow:

```javascript
// server/controllers/libraryController.js
const Book = require('../models/Book');
const BookCopy = require('../models/BookCopy');
const BookIssue = require('../models/BookIssue');
const FineTransaction = require('../models/LibraryFineTransaction');
const { addBusinessDays } = require('../utils/dateUtils');
const catchAsync = require('../utils/catchAsync');

exports.issueBook = catchAsync(async (req, res) => {
  const { userId, userType, bookCopyId } = req.body;
  const settings = await LibrarySettings.findOne();

  const fines = await FineTransaction.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'pending' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  if ((fines[0]?.total || 0) > settings.fineBlockThreshold) {
    return res.status(409).json({ success: false, message: 'Outstanding fine exceeds threshold' });
  }

  const maxBooks = userType === 'teacher' ? settings.maxBooksTeacher : settings.maxBooksStudent;
  const active = await BookIssue.countDocuments({ userId, userType, status: { $in: ['issued', 'overdue'] } });
  if (active >= maxBooks) return res.status(409).json({ success: false, message: 'Issue limit reached' });

  const copy = await BookCopy.findById(bookCopyId);
  if (!copy || copy.status !== 'available') return res.status(409).json({ success: false, message: 'Copy unavailable' });

  const dueDate = addBusinessDays(new Date(), settings.issueDaysStudent, settings.holidayDates);

  const session = await mongoose.startSession();
  await session.withTransaction(async () => {
    await BookIssue.create([{ bookCopyId, userId, userType, issueDate: new Date(), dueDate, status: 'issued', issuedBy: req.user._id }], { session });
    await BookCopy.findByIdAndUpdate(bookCopyId, { status: 'issued' }, { session });
    await Book.findByIdAndUpdate(copy.bookId, { $inc: { availableCopies: -1 } }, { session });
  });
  await session.endSession();

  res.status(201).json({ success: true, data: { dueDate } });
});
```

#### 11.1.4 Return Processing

Return processing scans the barcode, locates the active BookIssue, and computes overdue days as `max(0, returnDate - dueDate)`. The fine: `max(0, overdueDays - graceDays) * finePerDay`, capped at `maxFine`. A FineTransaction is created; BookCopy reverts to `available` and `availableCopies` increments.

#### 11.1.5 Reservation and Renewal

When all copies are issued, students may reserve via **BookReservation** (`bookId`, `userId`, `queuePosition`, `status`). On return, the first reserver gets a 48-hour hold. Renewal extends the due date if no reservation exists and `renewalCount < maxRenewals` (default 2).

#### 11.1.6 Library Reports

Six built-in aggregation views: currently issued, overdue with fines, most borrowed, never-borrowed, category-wise inventory, and fine collection summary. All support CSV/Excel export via `xlsx`.

### 11.2 Transport Management Module

#### 11.2.1 Vehicle Fleet

The **Vehicle** schema registers buses with registration, make/model, capacity, insurance/fitness expiry, `gpsDeviceId`, and `conditionStatus`. A unique index on `assignedDriverId` enforces one driver per vehicle.

#### 11.2.2 Route Management

A **TransportRoute** defines ordered stops with geolocation, sequence, arrival time, and distance from start.

| Attribute | Type | Description | Example |
|---|---|---|---|
| `routeName` | String | Route name | Route 42 - East Campus |
| `routeCode` | String | Unique code | RT-E42 |
| `stops` | [Object] | Ordered stop list | See sub-fields |
| `fareSlab` | String | Distance tier | 5-10km |
| `baseFare` | Number | Monthly fare | 1,500 |
| `assignedVehicleId` | ObjectId | Vehicle ref | 64a1... |
| `assignedDriverId` | ObjectId | Driver ref | 64b2... |

Each stop has: `stopName`, `sequence`, `latitude`, `longitude`, `arrivalTime`, `distanceFromStart`. ETA recalculation uses 20 km/h average plus 3 minutes boarding per stop.

```mermaid
graph LR
    V[Bus KA-01-AB-1234<br/>Cap: 40] -->|serves| S0[School Gate 08:00]
    S0 --> S1[MG Road 08:20<br/>2.5km]
    S1 --> S2[Indiranagar 08:35<br/>5.2km]
    S2 --> S3[Koramangala 08:55<br/>8.7km]
    S1 -->|pickup| A1[Student A<br/>800/mo]
    S2 -->|pickup| A2[Student B<br/>1,500/mo]
    S3 -->|pickup| A3[Student C<br/>1,500/mo]
```

#### 11.2.3 Student Transport Allocation

The **StudentTransport** model links a student to a route and pickup/drop stops, triggering fee integration:

```javascript
// server/controllers/transportController.js
const StudentTransport = require('../models/StudentTransport');
const TransportRoute = require('../models/TransportRoute');
const Vehicle = require('../models/Vehicle');
const FeeStructure = require('../models/FeeStructure');
const catchAsync = require('../utils/catchAsync');

exports.allocateStudent = catchAsync(async (req, res) => {
  const { studentId, routeId, pickupStopId, dropStopId, feeSlab } = req.body;

  const route = await TransportRoute.findById(routeId).populate('assignedVehicleId');
  if (!route || route.status !== 'active') return res.status(404).json({ success: false, message: 'Route inactive' });

  const stopIds = route.stops.map(s => s._id.toString());
  if (!stopIds.includes(pickupStopId)) return res.status(400).json({ success: false, message: 'Invalid stop' });

  const allocated = await StudentTransport.countDocuments({ routeId, status: 'active' });
  if (allocated >= route.assignedVehicleId.capacity) return res.status(409).json({ success: false, message: 'Capacity exceeded' });

  const slabFares = { '0-5km': 800, '5-10km': 1500, '10+km': 2200 };
  const fare = slabFares[feeSlab] || 800;

  await StudentTransport.create({ studentId, routeId, pickupStopId, dropStopId, transportFee: fare, effectiveFrom: new Date(), status: 'active' });

  res.status(201).json({ success: true, data: { routeName: route.routeName, monthlyFare: fare } });
});
```

#### 11.2.4 Transport Fee

Transport fees bill monthly in advance using distance slabs: 0–5 km (INR 800), 5–10 km (INR 1,500), 10+ km (INR 2,200). Non-payment by the 10th triggers a late fine. Pass cancellation requires 5 working days notice with prorated refund.

#### 11.2.5 Vehicle Maintenance

The **VehicleMaintenance** schema logs `type`, `cost`, `vendor`, and `nextServiceDate`. A nightly job alerts 7 days before service or every 5,000 km.

#### 11.2.6 Transport Attendance

Drivers mark pickup/drop attendance via mobile app, recording GPS and timestamps to **TransportAttendance**. Absent students trigger parent SMS alerts. Route deviation beyond 500 meters from the planned polyline raises real-time alerts.

### 11.3 Hostel Management Module

#### 11.3.1 Room Inventory

The **HostelRoom** schema organizes: building/block, floor, room number, bed positions. `roomType` (`single`, `double`, `triple`, `dormitory`) sets capacity. Amenities embed as `['wifi', 'ac', 'attached_bathroom']`. `currentOccupancy` denormalizes via post-save hooks on **HostelAllocation**.

#### 11.3.2 Room Allocation

Students submit preferences; the warden reviews against vacancies; on approval, the system creates a HostelAllocation linking student, room, and bed.

| Entity | Key Fields | Purpose |
|---|---|---|
| **HostelApplication** | studentId, preferredRoomType, roommatePreferenceIds, status | Captures student preferences |
| **HostelRoom** | hostelId, roomNo, floor, roomType, capacity, occupiedBeds, monthlyRent | Room inventory record |
| **HostelAllocation** | studentId, roomId, bedId, allocationDate, status | Links student to physical bed |
| **HostelFee** | studentId, allocationId, roomRent, messCharges, totalAmount, status | Billing record per cycle |

The allocation controller enforces capacity limits and gender-segregated occupancy:

```javascript
// server/controllers/hostelController.js
const HostelRoom = require('../models/HostelRoom');
const HostelAllocation = require('../models/HostelAllocation');
const HostelFee = require('../models/HostelFee');
const catchAsync = require('../utils/catchAsync');

exports.allocateRoom = catchAsync(async (req, res) => {
  const { applicationId, roomId, bedId } = req.body;

  const app = await HostelApplication.findById(applicationId).populate('studentId', 'gender');
  if (!app || app.status !== 'pending') return res.status(400).json({ success: false, message: 'Invalid application' });

  const room = await HostelRoom.findById(roomId);
  if (!room || room.occupiedBeds >= room.capacity) return res.status(409).json({ success: false, message: 'Room full' });

  const existing = await HostelAllocation.findOne({ roomId, status: 'active' }).populate('studentId', 'gender');
  if (existing && existing.studentId.gender !== app.studentId.gender) return res.status(409).json({ success: false, message: 'Gender mismatch' });

  const session = await mongoose.startSession();
  await session.withTransaction(async () => {
    const alloc = await HostelAllocation.create([{ studentId: app.studentId._id, roomId, bedId, allocationDate: new Date(), status: 'active' }], { session });
    await HostelRoom.findByIdAndUpdate(roomId, { $inc: { occupiedBeds: 1 } }, { session });
    await HostelApplication.findByIdAndUpdate(applicationId, { status: 'approved' }, { session });
    await HostelFee.create([{ studentId: app.studentId._id, allocationId: alloc[0]._id, roomRent: room.monthlyRent, messCharges: 3000, totalAmount: room.monthlyRent + 3000, status: 'pending' }], { session });
  });
  await session.endSession();

  res.status(201).json({ success: true, data: { roomNo: room.roomNo, rent: room.monthlyRent } });
});
```

#### 11.3.3 Warden Management

Each block has one warden (`wardenId`). **WardenDutyRoster** defines shifts. Complaint resolution: students register with category/priority; warden acknowledges within 4 hours; high-priority items escalate to the supervisor.

#### 11.3.4 Hostel Fee

Hostel billing aggregates room rent (INR 4,000–8,000 by room type), mess charges (INR 3,000), and amenities fee. FeeIntegrationService from Chapter 10 pulls HostelFee records into the monthly invoice pipeline.

#### 11.3.5 Visitor Log

The **HostelVisitor** schema captures visitor name, relation, phone, ID proof, purpose, entry/exit times, and warden `approvalStatus`. Photo ID uploads store in `/uploads/visitor-ids/` with 90-day retention. Visiting hours default to 4:00 PM – 7:00 PM; entries outside require supervisor override.

#### 11.3.6 Hostel Operations

Daily operations include: **Roll call** (9:00–10:00 PM, absent alerts to parents); **Leave requests** (day/weekend/vacation leave with destination and emergency contact, warden approval mandatory); **Complaint registration** (maintenance/disciplinary/amenities with 72-hour SLA); and **Mess menu management** (weekly menu publishing). All functions expose REST endpoints under `/api/v1/hostel/` with RBAC.
## 12. Communication, Reports & Analytics

### 12.1 Internal Communication System

The communication layer connects administrators, teachers, parents, and students through targeted messaging tools that minimize information overload while ensuring critical messages reach the intended audience.

#### 12.1.1 Announcements

Announcements provide role-targeted broadcasting to `teacher-only`, `parent-only`, `school-wide`, or `class-specific` audiences via a rich text editor (TipTap) supporting formatted text and attachments. Administrators set `publishAt` for deferred publishing and `expiryDate` for automatic archival. The schema stores `targetType`, `targetIds[]`, and `requiresAcknowledgment` for compliance-critical notices.

#### 12.1.2 Notice Board

The notice board displays categorized notices (`academic`, `events`, `urgent`, `general`) with pinned items at the top. Read receipts track through a `NoticeRead` collection recording `(userId, noticeId, readAt)` tuples. Notices older than 90 days auto-archive but remain searchable.

#### 12.1.3 Messaging

Messaging enables teacher-to-parent direct communication and admin-to-staff broadcasts. Messages use a threading model with shared `threadId`; the `Message` schema captures `senderId`, `receiverId`, `content`, `attachmentUrl`, `isRead`, and `parentMessageId`. The inbox organizes into Inbox, Sent, and Archive tabs. Attachments upload via Multer to cloud storage.

#### 12.1.4 Parent-Teacher Meetings

PTM uses slot-based booking through `PtmSchedule` (date, time range, `slotDuration`). Parents book via `POST /api/v1/ptm/bookings`; reminders fire 24 hours and 1 hour before the slot. Teachers record `meetingNotes` and `actionItems[]` post-meeting.

### 12.2 Notification System

#### 12.2.1 Multi-Channel Architecture

Notifications deliver across four channels: **in-app** (Socket.io), **email** (Nodemailer/SMTP), **SMS** (Twilio/MSG91), and **browser push** (Web Push API). The `NotificationDispatcher` routes each notification based on event type and user `NotificationPreference` settings.

```mermaid
flowchart LR
    A[Event Emitter] --> B{Notification Dispatcher}
    B -->|in-app| C[Socket.io Room]
    B -->|email| D[Nodemailer SMTP]
    B -->|sms| E[Twilio/MSG91]
    B -->|push| F[Web Push API]
    C --> G[(MongoDB)]
    D --> H[SMTP Server]
    E --> I[SMS Gateway]
    F --> J[Browser]
    G --> K[Notification Bell]
```

The dispatcher resolves recipients, loads preferences, and fans out payloads. In-app notifications persist to MongoDB and emit via Socket.io; email passes to Nodemailer; SMS routes through the gateway client; push subscriptions are delivered via the Web Push protocol.

#### 12.2.2 Email Integration

```javascript
// server/services/emailService.js
const nodemailer = require('nodemailer');
const hbs = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

const transport = nodemailer.createTransport({
  pool: true, host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT, 10),
  secure: process.env.EMAIL_PORT === '465',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  maxConnections: 5, maxMessages: 100,
});

async function sendTemplatedEmail({ to, templateName, variables, subject }) {
  const src = await fs.readFile(
    path.join(__dirname, '../templates/email', `${templateName}.hbs`), 'utf-8'
  );
  const html = hbs.compile(src)(variables);
  const info = await transport.sendMail({
    from: `"${variables.schoolName}" <${process.env.EMAIL_FROM}>`,
    to: to.join(', '), subject, html, text: html.replace(/<[^>]*>/g, ''),
  });
  await EmailLog.create({
    recipients: to, templateName, subject,
    messageId: info.messageId, status: 'sent', sentAt: new Date(),
  });
  return info;
}

module.exports = { sendTemplatedEmail };
```

`EmailLog` tracks delivery status (sent/delivered/bounced/failed). SMTP webhook callbacks flag invalid addresses to suppress future sends.

#### 12.2.3 SMS Gateway

SMS integrates via Twilio or MSG91 REST APIs using Handlebars templates with variable substitution (`{{studentName}}`, `{{amount}}`). Unicode enables regional language delivery. Webhooks update `SmsLog.status` for retry evaluation.

#### 12.2.4 Notification Templates

The template UI supports categories: `fee_reminder`, `attendance_alert`, `exam_result`, `general_announcement`, `emergency_broadcast`. Each defines `subject`, `body` with placeholders, and target `channel`. Multi-language versions are keyed by locale code and selected from the recipient's profile.

#### 12.2.5 Trigger-Based Notifications

The `NotificationTrigger` engine listens to domain events and evaluates timing rules before dispatching.

| Trigger Event | Timing Rule | Channels | Template Category | Recipient |
|---|---|---|---|---|
| Fee due reminder | 3 days before + on due date | Email, SMS, In-app | `fee_reminder` | Student + Parent |
| Absent alert | 30 minutes after marking | SMS, Push, In-app | `attendance_alert` | Parent |
| Exam schedule published | Immediate on publish | Email, In-app | `general_announcement` | Student + Parent |
| Result published | Immediate on publish | All channels | `exam_result` | Student + Parent |
| Emergency broadcast | Immediate, overrides prefs | All channels | `emergency_broadcast` | All users |
| PTM reminder | 24h + 1h before slot | Email, SMS, Push | `general_announcement` | Parent + Teacher |

```javascript
// server/services/notificationTrigger.js
const notificationDispatcher = require('./notificationDispatcher');
const { FeePayment, Attendance } = require('../models');

class NotificationTrigger {
  async onFeeDue({ feeInvoiceId }) {
    const inv = await FeePayment.findById(feeInvoiceId)
      .populate('studentId', 'firstName lastName guardianIds');
    const days = Math.ceil((inv.dueDate - Date.now()) / 8.64e7);
    if (days === 3 || days === 0) {
      await notificationDispatcher.dispatch({
        channels: ['email', 'sms', 'in-app'],
        recipients: [inv.studentId._id, ...inv.studentId.guardianIds],
        templateCategory: 'fee_reminder',
        variables: {
          studentName: `${inv.studentId.firstName} ${inv.studentId.lastName}`,
          amount: inv.balanceAmount, dueDate: inv.dueDate.toLocaleDateString(),
        },
      });
    }
  }

  async onAbsentMarked({ studentId, date }) {
    setTimeout(async () => {
      const rec = await Attendance.findOne({ studentId, date }).populate('studentId');
      if (rec?.status === 'absent') {
        await notificationDispatcher.dispatch({
          channels: ['sms', 'push', 'in-app'],
          recipients: rec.studentId.guardianIds || [],
          templateCategory: 'attendance_alert',
          variables: { studentName: rec.studentId.firstName, date },
        });
      }
    }, 30 * 60 * 1000);
  }
}

module.exports = new NotificationTrigger();
```

#### 12.2.6 Real-Time Delivery

Socket.io delivers in-app notifications to `userId` rooms. A Redis-backed retry queue handles failures with exponential backoff (5min, 15min, 1hr). The preference center at `/settings/notifications` allows per-channel toggles per category, with emergency broadcasts overriding all preferences.

### 12.3 Report Generation Engine

#### 12.3.1 Template System

Reports generate from parameterized HTML templates using Handlebars. `ReportTemplate` stores `name`, `category`, `htmlBody`, `cssStyles`, and `version`. Placeholders (`{{studentName}}`, `{{schoolLogoUrl}}`) resolve at generation time; page breaks use CSS `page-break-after: always`.

#### 12.3.2 ID Card Generation

ID cards follow the CR80 standard. The pipeline composites profile photo, Code 128 barcode, student details, and school logo into HTML rendered by Puppeteer to a 300 DPI PDF. Bulk generation iterates a class-section's active students into a multi-page PDF for PVC printing.

#### 12.3.3 Certificates

Four certificate types are supported: **bonafide**, **character**, **transfer certificate (TC)**, and **achievement**. Each has selectable templates with auto-filled details. The TC requires clearance from library, fees, hostel, and transport departments before generation.

#### 12.3.4 Export Formats

PDF uses Puppeteer for HTML-to-PDF rendering. Excel uses `xlsx` with styled headers and freeze panes. CSV provides plain-text portability. Print-friendly CSS (`@media print`) hides navigation for browser printing.

### 12.4 Analytics Dashboard

#### 12.4.1 Dashboard Layout

The dashboard assembles KPI cards, charts, activity feed, and quick actions into a unified React view.

```mermaid
flowchart TB
    subgraph TopBar[""]
        A1[Total Students]
        A2[Present Today]
        A3[Fee Collected]
        A4[Pending Dues]
    end
    subgraph Charts[""]
        B1[Line: Enrollment Trend]
        B2[Pie: Gender Ratio]
        B3[Bar: Class Distribution]
        B4[Gauge: Fee Target %]
    end
    subgraph Side[""]
        C1[Recent Activity]
        C2[Quick Actions]
    end
    TopBar --> Charts
    Charts --> Side
```

KPI cards fetch from `GET /api/v1/analytics/kpi` using MongoDB aggregation. Each card shows current value, comparison versus prior period, and trend icon. A date range selector propagates to all widgets via `DateRangeContext`.

#### 12.4.2 Student Analytics

Enrollment trend renders as a line chart of monthly admissions. Gender ratio displays in a pie chart. Class distribution uses a vertical bar chart per grade. A comparison widget overlays admissions against withdrawals.

#### 12.4.3 Fee Analytics

Collection performance uses a gauge chart (actual versus target). Monthly trend overlays current-year and prior-year data. Payment mode distribution renders as a doughnut chart. A defaulters table lists top 20 by outstanding amount.

#### 12.4.4 Academic Analytics

The attendance heatmap shows classes versus weekdays with color intensity for attendance percentage. Exam results render as a histogram binned into grade ranges. Subject-wise performance uses grouped bars comparing class and section averages.

```jsx
// client/src/components/analytics/AcademicAnalyticsChart.jsx
import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { analyticsService } from '../../services/analyticsService';

export default function AcademicAnalyticsChart({ classId, examType }) {
  const [subjectData, setSubjectData] = useState([]);
  const [trendData, setTrendData] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const sRes = await analyticsService.getSubjectPerformance(classId, examType);
      setSubjectData(sRes.data);
      const tRes = await analyticsService.getYearOverYearTrend(classId);
      setTrendData(tRes.data);
    }
    fetchData();
  }, [classId, examType]);

  return (
    <div className="analytics-chart-grid">
      <div className="chart-card">
        <h3>Subject-wise Performance</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={subjectData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="subjectName" />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(v) => `${v.toFixed(1)}%`} />
            <Legend />
            <Bar dataKey="classAverage" name="Class Avg" fill="#6366f1" />
            <Bar dataKey="sectionAverage" name="Section Avg" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-card">
        <h3>Year-over-Year Improvement</h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="academicYear" />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(v) => `${v.toFixed(1)}%`} />
            <Legend />
            <Line type="monotone" dataKey="currentYear" name="Current Year"
              stroke="#6366f1" strokeWidth={3} />
            <Line type="monotone" dataKey="previousYear" name="Previous Year"
              stroke="#9ca3af" strokeWidth={2} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

#### 12.4.5 Drill-Down Capabilities

KPI cards navigate to filtered detail views. The date range selector synchronizes across widgets via `DateRangeContext`. Role-based customization filters widgets: teachers see class-specific academic charts; accountants see fee analytics. Scheduled report emails execute saved templates via `node-cron` and deliver PDFs to configured recipients.
## 13. Security Implementation & Deployment

The SMS processes sensitive student records, financial data, and identity documents. This chapter covers defensive measures, compliance frameworks, and deployment automation for production.

### 13.1 Application Security

#### 13.1.1 OWASP Mitigation Checklist

Each OWASP risk category maps to a concrete control in the SMS codebase.

| OWASP Category | Threat to SMS | Mitigation Control | Implementation Layer |
|---|---|---|---|
| A01 — Broken Access Control | Students accessing other students' marks/fee records | RBAC middleware with role-permission matrix | Express middleware |
| A03 — Injection | NoSQL injection via unfiltered query parameters | `express-mongo-sanitize`, Mongoose parameterized queries | Request pipeline |
| A07 — Auth Failures | JWT theft, brute-force login | `httpOnly` refresh tokens, bcrypt (12 rounds), rate-limited auth | Auth service |
| A08 — Data Integrity | Malicious npm packages with backdoors | `npm audit` in CI, Dependabot alerts, lockfile integrity checks | CI/CD pipeline |
| A02 — Cryptographic Failures | Plaintext storage of Aadhaar/SSN | AES-256 field-level encryption, TLS 1.3 | Database + Network |
| A04 — Insecure Design | Direct file access to uploaded documents | Random filenames, controller-mediated download | File upload service |
| A05 — Security Misconfiguration | Default credentials, debug endpoints | Environment config, `NODE_ENV=production` | Configuration layer |
| A06 — Vulnerable Components | Outdated dependencies with CVEs | Dependabot PRs, `npm audit` blocks deploy | Dependency management |
| A09 — Logging Failures | Undetected breach or tampering | Structured JSON audit logs, correlation IDs | Logging service |
| A10 — SSRF | Server requests to internal services | Outbound URL whitelist, deny internal IPs | Network layer |

#### 13.1.2 Helmet.js Configuration

Helmet.js sets HTTP security headers to mitigate XSS, clickjacking, and protocol downgrade attacks.

```javascript
// server/middleware/security.js
import helmet from 'helmet';

const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", process.env.API_BASE_URL],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  frameguard: { action: 'deny' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
  hidePoweredBy: true,
});

export default helmetConfig;
```

The `frameAncestors: "'none'"` directive prevents clickjacking; HSTS with `preload: true` enables browser hardcoded HTTPS lists.

#### 13.1.3 Rate Limiting

A two-tier strategy protects against brute-force attacks using Redis-backed counters.

```javascript
// server/middleware/rateLimiter.js
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.connect().catch(console.error);

const INTERNAL_IPS = ['10.0.1.', '10.0.2.', '127.0.0.1'];
const isInternalIP = (ip) => INTERNAL_IPS.some((p) => ip.startsWith(p));

export const generalLimiter = rateLimit({
  store: new RedisStore({ sendCommand: (...a) => redisClient.sendCommand(a) }),
  windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false,
  skip: (req) => isInternalIP(req.ip),
  message: { success: false, message: 'Too many requests.' },
});

export const authLimiter = rateLimit({
  store: new RedisStore({ sendCommand: (...a) => redisClient.sendCommand(a) }),
  windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts.' },
});
```

The `authLimiter` counts every request regardless of outcome, preventing username harvesting. Internal IPs are whitelisted.

#### 13.1.4 CORS Policy

Only origins in `ALLOWED_ORIGINS` may access the API, and credentials are permitted only for matching origins. Production uses exactly the frontend domain — no wildcard (`*`) allowances.

#### 13.1.5 File Upload Security

Uploads are validated through: (1) type whitelist (`jpg`, `jpeg`, `png`, `pdf`) enforced via `multer` by MIME-type magic number, (2) 5 MB size limit, (3) ClamAV virus scanning, (4) filename randomization with `crypto.randomBytes(16)`, (5) storage outside the web root served through authenticated endpoints.

### 13.2 Data Security & Compliance

#### 13.2.1 Encryption at Rest

Sensitive documents are encrypted with AES-256-GCM before persistence; the key resides in a cloud KMS. For Aadhaar/SSN fields, MongoDB Client-Side Field Level Encryption (CSFLE) encrypts data before it leaves the application.

#### 13.2.2 TLS/SSL

All communication uses TLS 1.3. HTTPS enforcement uses an Nginx `301` redirect, the HSTS header, and Let's Encrypt certificates with automatic Certbot renewal.

#### 13.2.3 Backup Strategy

Daily backups at 02:00 AM via `mongodump` produce gzipped archives with checksums, uploaded to S3 with server-side encryption. Retention: 7 days local, 30 days cloud, quarterly archives for 1 year. Restores are tested monthly.

#### 13.2.4 Data Privacy

GDPR-compliant consent tracking records purpose, timestamp, and withdrawal at each collection point. `/gdpr/export` produces a portable JSON dump; `/gdpr/erase` anonymizes records for statutory retention before deletion. For US institutions, FERPA restricts education record access. Analytics datasets undergo k-anonymity treatment.

### 13.3 Logging & Monitoring

#### 13.3.1 Application Logging

Winston with `winston-daily-rotate-file` creates daily logs, compressing files older than 7 days. Entries use structured JSON with correlation IDs. Levels: `error`, `warn`, `info`, `debug`.

#### 13.3.2 Audit Logging

Every mutation generates an immutable record in `audit_logs` capturing actor, action, target entity, timestamp, and differential snapshot. The collection is append-only.

#### 13.3.3 API Monitoring

Custom middleware records method, route, status, and duration per request. Slow query detection warns on requests exceeding 500 ms. Error rate alerting fires when a 5-minute window exceeds 1% errors.

#### 13.3.4 Health Checks

`GET /health` returns MongoDB and Redis connectivity, disk space, and memory status. `GET /ready` adds application readiness for Kubernetes probes. External monitoring verifies `/health` every 60 seconds.

### 13.4 Containerization & CI/CD

The following diagram illustrates the defense-in-depth security layers.

```mermaid
graph TB
    subgraph "Security Architecture Layers"
        A[Client Browser] -->|"HTTPS + WAF"| B[Nginx Reverse Proxy]
        B -->|"TLS 1.3"| C[Node.js Application]
        C -->|"TLS + Auth"| D[MongoDB]
        C -->|"TLS + Auth"| E[Redis]
    end
    subgraph "Security Controls"
        B1["Rate Limiting (edge)"]
        B2["SSL Termination"]
        C1["Helmet.js Headers"]
        C2["RBAC Middleware"]
        D1["Field-Level Encryption"]
        E1["Rate Limit Store"]
    end
    B --- B1
    B --- B2
    C --- C1
    C --- C2
    D --- D1
    E --- E1
```

#### 13.4.1 Docker Configuration

The backend uses a multi-stage build for minimal attack surface, running as non-root.

```dockerfile
# server/Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:20-alpine AS production
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
WORKDIR /app
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nodejs:nodejs /app/package.json ./
COPY --chown=nodejs:nodejs ./src ./src
COPY --chown=nodejs:nodejs ./server.js ./
USER nodejs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
CMD ["node", "server.js"]
```

The frontend Dockerfile uses `nginx:alpine` to serve static Vite output with gzip and SPA fallback.

#### 13.4.2 Docker Compose

The local stack defines `app` (Node.js), `web` (React/Vite), `mongodb`, and `redis` with volume mounts for hot-reload via `nodemon` and Vite HMR.

#### 13.4.3 CI/CD Pipeline

The GitHub Actions workflow implements continuous delivery with security gates.

```mermaid
graph LR
    A[Developer Push] --> B["Lint & Format<br/>ESLint + Prettier"]
    B --> C["Unit Tests<br/>Jest + 80% Coverage"]
    C --> D["Integration Tests<br/>Supertest"]
    D --> E["Frontend Tests<br/>React Testing Library"]
    E --> F["Security Scan<br/>npm audit"]
    F -->|Pass| G["Build Docker Images"]
    F -->|Fail| Z["Block Pipeline"]
    G --> H["Push to Registry"]
    H --> I["Deploy Staging"]
    I --> J["Manual Approval"]
    J --> K["Deploy Production<br/>Blue-Green"]
    K --> L["Smoke Tests"]
    L -->|Pass| M["Production Live"]
    L -->|Fail| N["Auto Rollback"]
```

The pipeline triggers on every push to `main`. Lint enforces `eslint-plugin-security` rules. `npm audit --audit-level=moderate` fails the build on moderate-or-higher CVEs. Production requires manual approval before blue-green deployment.

#### 13.4.4 Testing Stages

Unit tests (Jest) cover services with mocked databases. Integration tests (Supertest) exercise HTTP cycles against `mongodb-memory-server`. Frontend tests (React Testing Library) verify rendering. The security scan runs alongside `eslint-plugin-security`.

#### 13.4.5 Environment Management

Three environments isolate the lifecycle. **Development** runs via Docker Compose with seeded data. **Staging** deploys to a single cloud instance. **Production** runs multiple instances behind a load balancer. Configuration is injected at runtime via environment variables or a secrets manager.

### 13.5 Production Deployment

#### 13.5.1 Cloud Deployment

For a 10,000-student institution (~500 concurrent peak users), AWS ECS Fargate offers the best balance at ~$180–250/month for compute plus $50 for DocumentDB and $30 for S3. DigitalOcean Droplets cost ~$100–150/month with higher operational overhead. Heroku delivers simplicity at $250–400/month with less control. AWS ECS Fargate is recommended for its compliance certifications (SOC 2, ISO 27001).

#### 13.5.2 Nginx Reverse Proxy

Nginx handles SSL termination, gzip compression, edge rate limiting, static file delivery, and upstream load balancing with WebSocket upgrade support for Socket.io connections.

#### 13.5.3 Process Management

PM2 runs Node.js in cluster mode (`instances: 'max'`) with one worker per CPU core, handling auto-restart on crashes, log rotation, and memory-limit restarts. The `pm2 reload` command replaces workers one at a time for zero-downtime deployments.

#### 13.5.4 Post-Deployment

An automated smoke test executes within 60 seconds: verify `/health` returns `200`, confirm database connectivity, validate frontend loads, check authentication, and ensure WebSocket connections. On failure, the pipeline auto-rolls back to the previous Docker image. Database migrations run in a pre-start init container. CDN cache invalidation flushes static assets within 5 minutes.
n flushes static assets within 5 minutes.
