# School Management System (SMS)

> Full-stack School Management Application built with **Node.js**, **Express**, **PostgreSQL (Neon)**, and **React 18**.

## Features

### Core Modules
- **Student Management** — Admissions, profiles, enrollment, bulk import, parent portal
- **Teacher Management** — Profiles, qualifications, workload, class assignments
- **Academic Management** — Classes, sections, subjects, timetable generation
- **Attendance Management** — Daily/subject-wise marking, analytics, defaulter reports
- **Examination System** — Exam scheduling, marks entry, grading, report cards
- **Fee Management** — Fee structure, collection, receipts, financial reports
- **Library Management** — Book catalog, issue/return tracking, overdue fines
- **Transport Management** — Routes, vehicles, student allocation
- **Hostel Management** — Room allocation, occupancy tracking, visitor log
- **Communication** — Announcements, notifications, parent-teacher messaging
- **Reports & Analytics** — Dashboard with charts, enrollment trends, fee analytics
- **User Authentication** — JWT-based auth with role-based access control (RBAC)

### User Roles
| Role | Access |
|------|--------|
| Super Admin | Full system access |
| Admin | All management functions |
| Teacher | Attendance, marks, student view |
| Student | View profile, attendance, marks, fees |
| Parent | View child's records |
| Accountant | Fee management |
| Librarian | Library management |

---

## Project Structure

```
sms/
├── README.md                 # This file
├── SPEC.md                   # Technical specification
├── .gitignore
├── server/                   # Backend (Node.js + Express)
│   ├── package.json
│   ├── server.js             # Entry point
│   ├── .env.example          # Environment variables template
│   ├── config/
│   │   └── db.js             # Neon/PostgreSQL connection
│   ├── db/                   # Schema, migrations, and SQL query helpers
│   ├── controllers/          # Route handlers (13 controllers)
│   ├── routes/               # API route definitions (14 routes)
│   ├── middleware/           # Auth, error handling, upload
│   ├── utils/                # Helpers, email service, seed
│   └── uploads/              # File uploads directory
│
└── client/                   # Frontend (React 18 + Vite)
    ├── package.json
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── .env.example
    ├── src/
    │   ├── main.jsx           # React entry
    │   ├── App.jsx            # Router setup
    │   ├── index.css          # Global styles
    │   ├── context/           # Auth context
    │   ├── hooks/             # Custom hooks
    │   ├── services/          # API service (Axios)
    │   ├── components/        # Reusable components
    │   │   ├── Layout/        # Sidebar, Header, Layout
    │   │   ├── Form/          # InputField, SelectField
    │   │   └── ...            # DataTable, Modal, StatCard
    │   └── pages/             # Page components (24 pages)
    │       ├── Students/
    │       ├── Teachers/
    │       ├── Classes/
    │       ├── Subjects/
    │       ├── Attendance/
    │       ├── Exams/
    │       ├── Fees/
    │       ├── Library/
    │       ├── Transport/
    │       ├── Hostel/
    │       ├── Reports/
    │       ├── Notifications/
    │       └── Settings/
```

---

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** 10+ or **yarn**
- **PostgreSQL** 14+ or a **Neon** Postgres database
- **Git**

---

## Quick Start

### 1. Clone / Copy the Repository

If you received this as a zip or folder, extract it and navigate to the project:

```bash
cd sms
```

### 2. Install Backend Dependencies

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT secrets
```

### 3. Migrate and Seed the Database

Run the migration to create the PostgreSQL schema, then seed the base user accounts:

```bash
npm run migrate
npm run seed:users
```

To load the full demonstration dataset instead, run:

```bash
npm run seed
```

This creates rich, realistic Kenyan school data in PostgreSQL:

| Entity | Count |
|--------|-------|
| Academic Years | 1 (2024-2025) |
| Classes / Sections | 12 classes (Grade 1-12) × 4 sections (A-D) |
| Subjects | 18 (12 core + 4 elective + 2 co-curricular) |
| Teachers / Staff | 15 with user accounts |
| Students | 200 with user accounts |
| Guardians | ~300 with parent portal accounts |
| Class-Subject Assignments | ~430 |
| Timetable Entries | 1,440 (5 days/week × 6 periods × 48 sections) |
| Attendance Records | ~19,000 (90 school days + subject-wise) |
| Exams / Schedules / Marks | 2 exams / 384 schedules / 1,600 marks |
| Fee Heads / Structures / Invoices / Payments / Concessions | 8 / 60 / 400 / 305 / 37 |
| Books / Copies / Issues / Reservations | 51 / 126 / 30 / 10 |
| Vehicles / Routes / Student Transports | 4 / 6 / 30 |
| Hostels / Rooms / Allocations / Visitor Logs | 2 / 24 / 20 / 8 |
| Announcements / Notifications | 5 / 6 |

Default login:
- **Admin:** `admin@school.com` / `Admin@12345` (or the value of `SEED_ADMIN_PASSWORD`)
- **Teachers:** `t.001@school.com` … `t.015@school.com` / same password
- **Students:** `{admissionNo}@student.school.com` / same password
- **Parents:** `{admissionNo}.{father|mother|guardian}@parent.school.com` / same password

### 4. Start the Backend

```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

Server runs on `http://localhost:5000`

### 5. Install Frontend Dependencies

Open a new terminal:

```bash
cd client
npm install
cp .env.example .env
```

### 6. Start the Frontend

```bash
npm run dev
```

The app opens at `http://localhost:5173`

### 7. Login

Use the seeded admin account:
- **Email:** `admin@school.com`
- **Password:** `Admin@12345`

---

## Environment Variables

### Server (`server/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `DATABASE_URL` | PostgreSQL connection string (Neon) | `postgresql://user:pass@host.neon.tech/dbname?sslmode=require` |
| `JWT_SECRET` | JWT signing secret | (random string) |
| `JWT_EXPIRE` | Access token expiry | `15m` |
| `JWT_REFRESH_SECRET` | Refresh token secret | (random string) |
| `JWT_REFRESH_EXPIRE` | Refresh token expiry | `7d` |
| `SEED_ADMIN_PASSWORD` | Password for seeded admin/teacher accounts | `Admin@12345` |
| `AUTH_RATE_LIMIT_MAX` | Auth requests allowed per 15 minutes per IP | `20` |
| `RATE_LIMIT_MAX` | General requests allowed per 15 minutes per IP | `500` |
| `EMAIL_HOST` | SMTP host | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_USER` | Email address | `your-email@gmail.com` |
| `EMAIL_PASS` | Email password / app password | `your-app-password` |
| `EMAIL_FROM` | Sender display name and address | `"School" <your-email@gmail.com>` |
| `EMAIL_SECURE` | Use TLS (true for port 465) | `false` |
| `AFRICAS_TALKING_USERNAME` | Africa's Talking username | `sandbox` |
| `AFRICAS_TALKING_API_KEY` | Africa's Talking API key | `your-api-key` |
| `AFRICAS_TALKING_SENDER_ID` | Optional SMS sender ID | `SCHOOL` |
| `SKIP_EMAIL_SEND` | Log emails instead of sending | `false` |
| `SKIP_SMS_SEND` | Log SMS instead of sending | `false` |
| `MPESA_ENVIRONMENT` | M-Pesa environment | `sandbox` |
| `MPESA_CONSUMER_KEY` | M-Pesa Daraja consumer key | `your_key` |
| `MPESA_CONSUMER_SECRET` | M-Pesa Daraja consumer secret | `your_secret` |
| `MPESA_PASSKEY` | M-Pesa passkey | `your_passkey` |
| `MPESA_SHORTCODE` | M-Pesa paybill/till number | `247247` |
| `MPESA_ACCOUNT_REFERENCE` | M-Pesa paybill account number | `0743610160` |
| `MPESA_CALLBACK_BASE_URL` | Public URL for M-Pesa callbacks | `https://your-domain.com` |
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_test_...` |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook endpoint secret | `whsec_...` |
| `SESSION_IDLE_TIMEOUT_MS` | User idle timeout in ms | `900000` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `CLIENT_URL` | Frontend URL alias for CORS/reset links | `http://localhost:5173` |
| `NODE_ENV` | Environment | `development` |

> **M-Pesa note:** The defaults above are set for paybill **247247** with account number **0743610160**. For production, set `MPESA_ENVIRONMENT=production` and replace `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, and `MPESA_PASSKEY` with the credentials from your Safaricom Daraja portal app registered to that paybill.

### Client (`client/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `/api/v1` (uses Vite proxy in dev) or `http://localhost:5000/api/v1` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `pk_test_...` |
| `VITE_SESSION_IDLE_TIMEOUT_MS` | Idle timeout in ms | `900000` |

---

## Docker (Production-like Local Stack)

```bash
# Build and run the full stack
JWT_SECRET=$(openssl rand -base64 64) JWT_REFRESH_SECRET=$(openssl rand -base64 64) docker-compose up --build -d
```

Services:
- Redis on `6379`
- API on `http://localhost:5000`
- Web UI on `http://localhost`

After the containers start, migrate and seed the database:

```bash
docker exec -it sms-server npm run migrate
docker exec -it sms-server npm run seed:users
```

---

## API Endpoints

All endpoints are prefixed with `/api/v1/`.

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user (admin only) |
| POST | `/auth/login` | Login |
| POST | `/auth/refresh-token` | Refresh access token |
| POST | `/auth/logout` | Logout |
| POST | `/auth/forgot-password` | Request password reset |
| PUT | `/auth/reset-password/:token` | Reset password |
| GET | `/auth/me` | Get current user |
| PUT | `/auth/updatedetails` | Update profile |
| PUT | `/auth/updatepassword` | Update password |

### Students
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/students` | List students (paginated, filterable) |
| GET | `/students/search` | Search students |
| GET | `/students/class/:classId` | Students by class |
| GET | `/students/:id` | Single student |
| POST | `/students` | Create student |
| PUT | `/students/:id` | Update student |
| DELETE | `/students/:id` | Delete student |
| POST | `/students/bulk-import` | Bulk import |
| GET | `/students/:id/attendance` | Student attendance |
| GET | `/students/:id/fees` | Student fees |
| GET | `/students/:id/results` | Student results |

### Teachers, Classes, Subjects, Attendance, Exams, Fees, Library, Transport, Hostel
Each module follows the same RESTful pattern with full CRUD operations.

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/dashboard` | Dashboard statistics |
| GET | `/reports/students` | Student analytics |
| GET | `/reports/fees` | Fee analytics |
| GET | `/reports/attendance` | Attendance analytics |
| GET | `/reports/exams` | Exam analytics |

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 LTS |
| Framework | Express.js 4.x |
| Database | PostgreSQL 15+ (Neon) |
| Driver | `@neondatabase/serverless` (raw SQL) |
| Frontend | React 18 |
| Build | Vite 5.x |
| Styling | Tailwind CSS 3.x |
| Icons | Phosphor React |
| Charts | Recharts |
| HTTP Client | Axios |
| Auth | JWT + bcryptjs |
| Email | Nodemailer |
| Uploads | Multer |

---

## Available Scripts

### Root (Monorepo)

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies for both workspaces |
| `npm run dev` | Start server and client concurrently |
| `npm run seed` | Seed the database |
| `npm run build` | Build the client for production |
| `npm start` | Start the production server |

### Server
| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server (nodemon) |
| `npm run migrate` | Run PostgreSQL schema migration |
| `npm run seed:users` | Seed base user accounts |
| `npm run seed` | Seed database with full sample data |

### Client
| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

---

## Contributing

This project uses [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` — New feature
- `fix:` — Bug fix
- `chore:` — Maintenance
- `docs:` — Documentation
- `refactor:` — Code restructuring

---

## License

MIT
