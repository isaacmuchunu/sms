# School Management System — Technical Specification

> Document version: 1.0.0  
> Last updated: 2025-04-10

This specification describes the architecture, technology stack, data model, API conventions, authentication/authorization model, and functional module breakdown of the School Management System (SMS) at `D:/sms`.

---

## 1. Architecture

SMS is a full-stack, monorepo web application split into a stateless REST API backend and a single-page React frontend.

```
┌─────────────────┐      HTTP / REST      ┌──────────────────────────────┐
│  React 18 SPA   │ ◄────────────────────► │  Node.js + Express API       │
│  (Vite build)   │   JWT access token    │  /api/v1/*                   │
└─────────────────┘   Refresh cookie      └──────────────┬───────────────┘
                                                         │
                                                         │ raw SQL
                                                         ▼
                                              ┌──────────────────────┐
                                              │  PostgreSQL (Neon)   │
                                              └──────────────────────┘
```

### 1.1 Design principles

- **Stateless API**: All application state lives in PostgreSQL; API nodes do not share in-memory session state.
- **School-scoped multi-tenancy**: Almost every table carries a `school_id` foreign key. Non-super-admin users are constrained to their own school's data at the database-query layer.
- **Raw SQL via a thin helper**: Controllers query PostgreSQL through `server/db/index.js` helpers (`db.query`, `db.raw`, `db.insert`, `db.update`, `db.delete`, `db.findOne`, `db.findMany`, `db.count`, `db.transaction`). No ORM is used.
- **Standardized contracts**: Every controller uses `catchAsync` for error propagation and `ApiResponse` for uniform JSON responses.
- **Module gating**: Optional modules (transport, hostel, library) can be enabled/disabled per school via `schools.modules` JSONB and are enforced by `requireModule` middleware.

### 1.2 Repository layout

```
sms/
├── client/                 # React 18 SPA
│   ├── src/
│   │   ├── App.jsx         # React Router route tree
│   │   ├── context/        # AuthContext
│   │   ├── components/     # Reusable UI + layout
│   │   ├── pages/          # Feature pages
│   │   └── services/       # Axios API wrappers
│   ├── package.json
│   └── vite.config.js
├── server/                 # Express API
│   ├── server.js           # Entry point + global middleware
│   ├── routes/             # Express routers (aggregated by routes/index.js)
│   ├── controllers/        # Route handlers / business logic
│   ├── db/                 # Query helpers, schema.sql, migrations
│   ├── config/db.js        # NeonDB connection
│   ├── middleware/         # auth, error, validation, upload
│   ├── validators/         # Joi schemas per domain
│   ├── utils/              # Helpers (pagination, email, SMS, etc.)
│   ├── services/           # External integrations (M-Pesa, Stripe, notifications)
│   ├── jobs/scheduler.js   # Background interval jobs
│   └── uploads/            # Uploaded files
├── package.json            # Root monorepo with npm workspaces
└── docker-compose.yml      # Redis + API + nginx-served client
```

---

## 2. Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Runtime | Node.js 20+ LTS | Required by `engines` in root `package.json` |
| Package manager | npm 10+ | Workspaces enabled for `client` and `server` |
| Backend framework | Express.js 4.x | `server/server.js` |
| Database | PostgreSQL 14+ / Neon | Serverless driver via `@neondatabase/serverless` |
| SQL style | Raw parameterized SQL | `server/db/index.js` helper API |
| Auth | JWT + bcryptjs | Access token (Bearer) + refresh token (httpOnly cookie) |
| Validation | Joi | Request body/query/params validation in `server/validators/` |
| Email | Nodemailer | Templated email dispatch in `server/utils/emailService.js` |
| SMS | Africa's Talking | Optional SMS gateway in `server/utils/smsService.js` |
| Payments | Stripe + M-Pesa Daraja | `server/services/stripeService.js`, `mpesaService.js` |
| Frontend | React 18 | Functional components + hooks |
| Build tool | Vite 5.x | `client/vite.config.js` |
| Styling | Tailwind CSS 3.x | `client/tailwind.config.js` |
| Icons | Phosphor React + Lucide | `@phosphor-icons/react`, `lucide-react` |
| Charts | Recharts | Analytics dashboards |
| HTTP client | Axios | `client/src/services/` |
| Linting | ESLint flat config | Separate configs for client and server |

### 2.1 Key server dependencies

- `@neondatabase/serverless` — Neon/PostgreSQL driver
- `express`, `cors`, `helmet`, `compression`, `morgan` — HTTP/security/logging
- `express-rate-limit` — Rate limiting
- `jsonwebtoken`, `bcryptjs`, `cookie-parser` — Auth
- `joi` — Schema validation
- `multer` — File uploads
- `pdfkit` — PDF generation (report cards, receipts)
- `winston` — Structured logging
- `socket.io` — Real-time notifications (installed; used where needed)
- `stripe` — Card payments

---

## 3. Database Overview

The database is PostgreSQL managed through a single source-of-truth schema file, `server/db/schema.sql`, plus incremental migration scripts in `server/db/migrations/`. Migrations are destructive in development only (`ALLOW_DESTRUCTIVE_DB_RESET=true`) and blocked in production.

### 3.1 Conventions

- Primary keys are `UUID` generated by `gen_random_uuid()`.
- Every tenant-scoped table has `school_id UUID REFERENCES schools(id) ON DELETE CASCADE`.
- Audit columns: `created_at`, `updated_at` with `update_updated_at_column()` trigger.
- Enums are enforced with `CHECK` constraints on `VARCHAR` columns.
- Unique constraints that were previously global are now scoped by `school_id` (e.g. `idx_students_school_admission_no`).
- Text search uses GIN indexes on `to_tsvector(...)` expressions.

### 3.2 Core entity graph

```
schools
├── users                         (login accounts: super_admin, admin, teacher, student, parent, ...)
├── academic_years
│   ├── classes
│   │   ├── class_sections
│   │   ├── class_subjects
│   │   ├── timetable_entries
│   │   └── students
│   │       ├── student_guardians
│   │       ├── attendance
│   │       ├── fee_invoices / fee_payments / fee_concessions
│   │       ├── marks
│   │       ├── student_transports
│   │       ├── hostel_allocations
│   │       └── book_issues / book_reservations
│   ├── exams
│   │   └── exam_schedules → marks
│   └── fee_structures → fee_structure_items → fee_heads
├── teachers → teacher_subjects / teacher_documents
├── guardians → student_guardians
├── vehicles → transport_routes → transport_route_stops
├── hostels → hostel_rooms → hostel_room_beds → hostel_allocations
├── books → book_copies → book_issues / book_reservations
├── announcements, notifications, meetings
├── sessions
├── module_requests
└── payment_transactions
```

### 3.3 Key tables summary

| Table | Purpose |
|-------|---------|
| `schools` | Tenant root; stores module toggles (`transport`, `hostel`, `library`) as JSONB. |
| `users` | Authentication accounts with role and status. |
| `sessions` | Refresh-token sessions with revocation tracking, IP, device info, expiry. |
| `students` | Student profile, admission/roll numbers, class/section/year linkage. |
| `teachers` | Staff profile, qualifications, designation, linked `users` account. |
| `guardians` | Parent/guardian profiles, optionally linked to a `users` account. |
| `classes` / `class_sections` | Academic classes and their sections. |
| `subjects` / `class_subjects` | Subject catalog and per-section assignments. |
| `timetable_entries` | Period-wise weekly timetable. |
| `attendance` | Daily and subject-wise attendance statuses. |
| `exams` / `exam_schedules` / `marks` | Exam planning, schedules, and mark entry. |
| `grading_scales` / `grading_scale_grades` | School-specific grading schemas. |
| `fee_heads` / `fee_structures` / `fee_invoices` / `fee_payments` / `fee_concessions` | Fee catalog, billing, collection, concessions. |
| `books` / `book_copies` / `book_issues` / `book_reservations` | Library catalog and circulation. |
| `vehicles` / `transport_routes` / `student_transports` | Transport fleet and allocations. |
| `hostels` / `hostel_rooms` / `hostel_room_beds` / `hostel_allocations` / `hostel_visitors` | Hostel occupancy and visitor log. |
| `announcements` / `notifications` / `meetings` | School-wide and targeted communications. |
| `payment_transactions` | Payment-provider transaction log (Stripe, M-Pesa, etc.). |
| `module_requests` | School admins request enabling of transport/hostel/library modules. |

### 3.4 Migration workflow

```bash
# Reset and recreate schema (development only)
cd server && npm run migrate

# Seed base users or full demo dataset
npm run seed:users
npm run seed
```

Migration runner: `server/db/migrate.js` reads `schema.sql`, drops tables, and re-runs statements while preserving dollar-quoted blocks (`$$...$$`).

---

## 4. API Conventions

### 4.1 Base URL and versioning

All API endpoints are prefixed with `/api/v1`.

```
http://localhost:5000/api/v1
```

### 4.2 HTTP verbs

| Verb | Usage |
|------|-------|
| `GET` | Retrieve one or many resources. |
| `POST` | Create a resource or execute an action. |
| `PUT` | Full update of a resource. |
| `PATCH` | Partial update / state transitions (e.g. approve/reject). |
| `DELETE` | Remove a resource. |

### 4.3 Standard response envelope

Success responses are wrapped by `ApiResponse`:

```json
{
  "success": true,
  "message": "Operation completed",
  "data": { ... },
  "timestamp": "2025-04-10T10:00:00.000Z"
}
```

Paginated lists:

```json
{
  "success": true,
  "message": "Items retrieved",
  "data": {
    "items": [ ... ],
    "meta": {
      "page": 1,
      "limit": 25,
      "total": 200,
      "totalPages": 8
    }
  },
  "timestamp": "2025-04-10T10:00:00.000Z"
}
```

Error responses:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "timestamp": "2025-04-10T10:00:00.000Z"
}
```

### 4.4 Pagination

List endpoints accept `page` and `limit` query parameters. Defaults are `page=1`, `limit=25`, capped at `limit=100`.

### 4.5 Validation

All request input is validated with Joi via `server/middleware/validate.js`. Invalid input returns `400 Bad Request` with aggregated messages.

### 4.6 Rate limiting

- General API: 500 requests per 15 minutes per IP (`RATE_LIMIT_MAX`).
- Auth endpoints (`/auth/login`, `/auth/forgot-password`, `/auth/reset-password`): 20 requests per 15 minutes per IP (`AUTH_RATE_LIMIT_MAX`).

### 4.7 CORS

CORS is configured from `CLIENT_URL` / `FRONTEND_URL` environment variables (comma-separated). In development, any `localhost` / `127.0.0.1` / `[::1]` origin is allowed. Credentials (`cookies`) are enabled.

### 4.8 Error handling

`server/middleware/error.js` maps common PostgreSQL error codes to HTTP responses:

| Postgres code | HTTP | Message pattern |
|---------------|------|-----------------|
| `23505` | 400 | Duplicate field value |
| `23503` | 400 | Referenced record does not exist |
| `23502` | 400 | Missing required field |
| `22P02` | 400 | Invalid input |
| JWT errors | 401 | Invalid / expired token |

---

## 5. Authentication & Authorization

### 5.1 Authentication flow

1. User submits `email` and `password` to `POST /api/v1/auth/login`.
2. Server verifies password with `bcrypt.compare`.
3. Server creates a session row in `sessions` with a SHA-256 hash of a refresh token.
4. Server returns:
   - Short-lived **access token** in the JSON body (`Authorization: Bearer <token>`).
   - Long-lived **refresh token** in an `httpOnly` cookie.
5. The access token is validated on every protected request by `authenticate` middleware.
6. Refresh token rotation happens on every `POST /api/v1/auth/refresh-token` call.

### 5.2 Token contents

Access-token payload:

```json
{
  "id": "<user UUID>",
  "sessionId": "<session UUID>",
  "schoolId": "<school UUID or null>"
}
```

Refresh-token payload:

```json
{
  "id": "<user UUID>"
}
```

### 5.3 Session management

- Tokens contain a `sessionId`; `authenticate` verifies the session is not revoked and not expired.
- Each refresh rotates the refresh token and updates its hash in both `users.refresh_token` and `sessions.refresh_token_hash`.
- `POST /api/v1/auth/logout` revokes the session and clears the cookie.
- Session idle timeout is driven by client environment (`VITE_SESSION_IDLE_TIMEOUT_MS`) and enforced by token expiry on the server.

### 5.4 Role-based access control

Roles stored in `users.role`:

| Role | Typical access |
|------|----------------|
| `super_admin` | Cross-school access; can create school admins; sees all schools. |
| `admin` | Full management within the user's school. |
| `principal` | Academic and operational management. |
| `teacher` | Attendance, marks, own subject/class views. |
| `student` | View own profile, attendance, marks, fees. |
| `parent` | View linked children's records. |
| `accountant` | Fee management. |
| `librarian` | Library management. |
| `transport_manager` | Transport routes and allocations. |
| `warden` | Hostel management. |
| `staff` | General operational access. |

Middleware:

- `authenticate(req, res, next)` — verifies JWT and attaches `req.user`.
- `authorize(...roles)` / `requireRole(...roles)` — allows only listed roles; `super_admin` is implicitly allowed everywhere.
- `requireModule(moduleName)` — checks `schools.modules[moduleName]` before allowing access to gated routes.
- `getSchoolFilter(req)` / `scopeBySchool(req)` — returns SQL WHERE clauses and params scoped to the user's school (super admins can override with `?schoolId=`).

### 5.5 Password policy

- Minimum 8 characters.
- Must contain at least one letter and one number.
- Password reset tokens expire after 30 minutes.
- Parent invitations use a one-time set-password token.
- Changing a password invalidates existing refresh tokens by clearing `users.refresh_token` and setting `password_changed_at`.

---

## 6. Module Summary

Each module maps to one or more route files under `server/routes/` and page folders under `client/src/pages/`.

| Module | Route prefix | Key capabilities |
|--------|--------------|------------------|
| **Auth / Users** | `/api/v1/auth` | Login, logout, register, refresh, forgot/reset/set password, current user, user list, bulk CSV upload. |
| **Schools** | `/api/v1/schools` | CRUD for schools, module toggles, school settings. |
| **Students** | `/api/v1/students` | Admissions, profiles, bulk import, provisional registration approval, attendance/fees/results sub-resources, report-card PDF. |
| **Teachers** | `/api/v1/teachers` | Staff profiles, qualifications, workload, class/subject assignments, documents. |
| **Academic Years** | `/api/v1/academic-years` | Academic calendar and terms. |
| **Classes** | `/api/v1/classes` | Classes, sections, class teachers, class-subject mappings. |
| **Subjects** | `/api/v1/subjects` | Subject catalog and class applicability. |
| **Timetables** | `/api/v1/timetables` | Weekly period scheduling, teacher conflict checks. |
| **Attendance** | `/api/v1/attendance` | Daily and subject-wise marking, reports, defaulter analytics. |
| **Exams** | `/api/v1/exams` | Exam scheduling, marks entry, verification, publishing, grading scales. |
| **Fees** | `/api/v1/fees` | Fee heads, structures, invoices, payments, concessions, receipts, overdue tracking. |
| **Payments** | `/api/v1/payments` | Stripe card checkout and M-Pesa STK push; Stripe webhook handling. |
| **Library** | `/api/v1/library` | Book catalog, copies, issue/return, reservations, overdue fines. Module-gated. |
| **Transport** | `/api/v1/transport` | Vehicles, routes, stops, student transport allocation. Module-gated. |
| **Hostel** | `/api/v1/hostel` | Hostels, rooms, beds, allocations, visitor log. Module-gated. |
| **Announcements** | `/api/v1/announcements` | School-wide notices with audience, priority, publish/expiry dates. |
| **Notifications** | `/api/v1/notifications` | Per-user in-app notifications, read receipts. |
| **Meetings** | `/api/v1/meetings` | Parent-teacher meetings. |
| **Communications** | `/api/v1/communications` | Email/SMS dispatch orchestration. |
| **Reports** | `/api/v1/reports` | Dashboard KPIs, student/fee/attendance/exam analytics. |
| **Settings** | `/api/v1/settings` | School-level configuration and preferences. |
| **Sessions** | `/api/v1/sessions` | Active session listing and revocation. |
| **Module Requests** | `/api/v1/module-requests` | Schools request enabling transport/hostel/library modules. |

### 6.1 Background jobs

`server/jobs/scheduler.js` runs every minute:

- Mark overdue fee invoices.
- Mark overdue library book issues.
- Publish scheduled announcements.
- Unpublish expired announcements.

### 6.2 External integrations

- **Email**: SMTP via Nodemailer; can be skipped in dev with `SKIP_EMAIL_SEND=true`.
- **SMS**: Africa's Talking; can be skipped with `SKIP_SMS_SEND=true`.
- **M-Pesa**: Safaricom Daraja STK push and callback verification.
- **Stripe**: Card payments, PaymentIntents, and webhooks.

---

## 7. Development & Deployment

### 7.1 Local development

```bash
# Root install
npm install

# Backend
cd server
cp .env.example .env
npm run migrate
npm run seed:users
npm run dev

# Frontend
cd client
cp .env.example .env
npm run dev
```

### 7.2 Docker (production-like)

```bash
JWT_SECRET=$(openssl rand -base64 64) \
JWT_REFRESH_SECRET=$(openssl rand -base64 64) \
docker-compose up --build -d
```

Services: Redis (`6379`), API (`5000`), static client (`80`).

### 7.3 Environment highlights

Server:

- `DATABASE_URL` — PostgreSQL connection string.
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — signing secrets.
- `JWT_EXPIRE`, `JWT_REFRESH_EXPIRE` — token lifetimes.
- `FRONTEND_URL` / `CLIENT_URL` — CORS allow-list.
- `SESSION_IDLE_TIMEOUT_MS` — client idle timeout.
- `SKIP_EMAIL_SEND`, `SKIP_SMS_SEND` — disable external messaging.
- M-Pesa and Stripe credentials for payments.

Client:

- `VITE_API_URL` — backend base URL.
- `VITE_STRIPE_PUBLISHABLE_KEY` — Stripe public key.
- `VITE_SESSION_IDLE_TIMEOUT_MS` — idle logout timeout.

---

## 8. Coding Style

- Server uses CommonJS (`require` / `module.exports`); client uses ES modules (`import` / `export`).
- Controllers are `async` functions wrapped in `catchAsync`.
- Database access uses parameterized raw SQL through `server/db/index.js` helpers.
- Validation lives in `server/validators/` and is applied with the `validate` middleware.
- ESLint flat configs exist for both `client` and `server`; both extend `@eslint/js/recommended`, warn on unused variables, and allow `console`.
- Conventional Commits are used: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
