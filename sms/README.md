# School Management System (SMS)

> Full-stack School Management Application built with **Node.js**, **Express**, **MongoDB**, and **React 18**.

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
│   │   └── db.js             # MongoDB connection
│   ├── models/               # Mongoose schemas (12 models)
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
- **MongoDB** 7+ (local or Atlas cloud)
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
# Edit .env with your MongoDB URI and JWT secrets
```

### 3. Seed the Database

```bash
npm run seed
```

This creates:
- Admin user: `admin@school.com` / `password123`
- 12 classes (Grade 1-12)
- 10 subjects
- 3 sample teachers
- 20 sample students

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
- **Password:** `password123`

---

## Environment Variables

### Server (`server/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/school_management` |
| `JWT_SECRET` | JWT signing secret | (random string) |
| `JWT_EXPIRE` | Access token expiry | `15m` |
| `JWT_REFRESH_SECRET` | Refresh token secret | (random string) |
| `JWT_REFRESH_EXPIRE` | Refresh token expiry | `7d` |
| `EMAIL_HOST` | SMTP host | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_USER` | Email address | `your-email@gmail.com` |
| `EMAIL_PASS` | Email password / app password | `your-app-password` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `NODE_ENV` | Environment | `development` |

### Client (`client/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:5000/api/v1` |

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
| Database | MongoDB 7.x |
| ODM | Mongoose 8.x |
| Frontend | React 18 |
| Build | Vite 5.x |
| Styling | Tailwind CSS 3.x |
| Icons | Lucide React |
| Charts | Recharts |
| HTTP Client | Axios |
| Auth | JWT + bcryptjs |
| Email | Nodemailer |
| Uploads | Multer |

---

## Available Scripts

### Server
| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server (nodemon) |
| `npm run seed` | Seed database with sample data |

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
