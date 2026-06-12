# School Management System — Specification

## Overview
Full-stack School Management System using Node.js + Express backend, React 18 frontend, MongoDB database.

## Architecture
```
client/          # React 18 + Vite + Tailwind CSS
server/          # Node.js + Express + Mongoose
```

## Backend (server/)

### Entry Point
- `server.js` — Express app, middleware, route mounting, error handling, server start

### Config
- `config/db.js` — MongoDB connection with Mongoose

### Middleware
- `middleware/auth.js` — JWT verification, role-based access control
- `middleware/error.js` — centralized error handling
- `middleware/upload.js` — Multer file upload config

### Models (Mongoose)
- `models/User.js` — Base user (admin, teacher, student, parent roles)
- `models/Student.js` — Student profile, enrollment, parent linkage
- `models/Teacher.js` — Teacher profile, qualifications, assignments
- `models/Class.js` — Class/section with capacity, class teacher
- `models/Subject.js` — Subject catalog with type and credits
- `models/Attendance.js` — Daily/subject-wise attendance records
- `models/Exam.js` — Exam schedules and marks
- `models/Fee.js` — Fee heads, structures, payments
- `models/Library.js` — Books and transactions
- `models/Transport.js` — Routes, vehicles, allocations
- `models/Hostel.js` — Rooms, allocations, visitor log
- `models/Notification.js` — Announcements and notifications

### Routes & Controllers
All follow RESTful pattern with CRUD operations:
- `routes/auth.js` — Login, register, refresh token, password reset
- `routes/students.js` — Student CRUD, search, bulk import
- `routes/teachers.js` — Teacher CRUD, assignments
- `routes/classes.js` — Class/section CRUD, timetable
- `routes/subjects.js` — Subject CRUD, allocation
- `routes/attendance.js` — Mark attendance, reports, analytics
- `routes/exams.js` — Exam CRUD, marks entry, grading
- `routes/fees.js` — Fee structure, collection, receipts
- `routes/library.js` — Book catalog, issue/return
- `routes/transport.js` — Routes, vehicles, allocations
- `routes/hostel.js` — Room allocation, visitor log
- `routes/reports.js` — Dashboard data, analytics
- `routes/notifications.js` — Announcements, notifications

### Utils
- `utils/ApiResponse.js` — Standardized response format
- `utils/ApiError.js` — Custom error class
- `utils/catchAsync.js` — Async error wrapper
- `utils/emailService.js` — Nodemailer email sending

## Frontend (client/)

### Entry
- `src/main.jsx` — React root render
- `src/App.jsx` — Router setup, route definitions, layout

### Context
- `src/context/AuthContext.jsx` — Auth state, login/logout, token management

### Hooks
- `src/hooks/useFetch.js` — Data fetching with loading/error states
- `src/hooks/useAuth.js` — Auth context consumer

### Services
- `src/services/api.js` — Axios instance with interceptors

### Layout Components
- `src/components/Layout/Sidebar.jsx` — Navigation sidebar (role-based)
- `src/components/Layout/Header.jsx` — Top bar with notifications, profile
- `src/components/Layout/DashboardLayout.jsx` — Main layout wrapper

### Shared Components
- `src/components/DataTable.jsx` — Sortable, paginated table
- `src/components/Modal.jsx` — Reusable modal dialog
- `src/components/Form/InputField.jsx` — Form input with validation
- `src/components/Form/SelectField.jsx` — Select dropdown
- `src/components/StatCard.jsx` — Dashboard stat card

### Pages
- `src/pages/Dashboard.jsx` — Admin dashboard with KPIs and charts
- `src/pages/Login.jsx` — Login page
- `src/pages/Students/StudentList.jsx` — Student listing
- `src/pages/Students/StudentForm.jsx` — Add/edit student
- `src/pages/Students/StudentDetail.jsx` — Student profile view
- `src/pages/Teachers/TeacherList.jsx` — Teacher listing
- `src/pages/Teachers/TeacherForm.jsx` — Add/edit teacher
- `src/pages/Classes/ClassList.jsx` — Class/section management
- `src/pages/Subjects/SubjectList.jsx` — Subject catalog
- `src/pages/Attendance/AttendanceMark.jsx` — Mark attendance
- `src/pages/Attendance/AttendanceReport.jsx` — Attendance reports
- `src/pages/Exams/ExamList.jsx` — Exam schedules
- `src/pages/Exams/MarksEntry.jsx` — Marks entry
- `src/pages/Exams/Results.jsx` — Results view
- `src/pages/Fees/FeeStructure.jsx` — Fee configuration
- `src/pages/Fees/FeeCollection.jsx` — Fee collection
- `src/pages/Fees/FeeReports.jsx` — Fee reports
- `src/pages/Library/BookList.jsx` — Book catalog
- `src/pages/Library/BookIssue.jsx` — Issue/return books
- `src/pages/Transport/RouteList.jsx` — Transport routes
- `src/pages/Hostel/RoomList.jsx` — Room management
- `src/pages/Reports/Analytics.jsx` — Charts and analytics
- `src/pages/Notifications/Announcements.jsx` — Announcements
- `src/pages/Settings/Settings.jsx` — System settings

## API Response Format
```json
{
  "success": true,
  "data": {},
  "message": "",
  "meta": { "page": 1, "limit": 10, "total": 100 }
}
```

## Authentication
- JWT access token (15min) + refresh token (7 days, httpOnly cookie)
- Role-based access control: super_admin, admin, teacher, student, parent, accountant, librarian
- Password hashing with bcrypt (12 rounds)

## Tech Stack
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
| Auth | JWT + bcrypt |
