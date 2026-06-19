# School Management System — Implementation Gap Report

**Date:** 2026-06-19  
**Scope:** Full-stack SMS codebase (`client/` + `server/`) against the feature set advertised in `README.md`.

---

## Executive Summary

The codebase is a broad, well-structured School Management System with a PostgreSQL backend (48 tables), Express REST API (25 route modules), and a React 18 frontend (34+ pages). Most core modules advertised in the README are present: students, teachers, classes, subjects, attendance, exams, fees, library, transport, hostel, announcements, notifications, and a parent portal.

However, several high-visibility features are **stubs, incomplete, or entirely missing**. The biggest gaps are in **automatic timetable generation**, **bulk student import**, **super-admin full-access semantics**, **missing frontend pages for backend APIs**, and **README documentation drift** (`SPEC.md` is referenced but absent).

---

## 1. Critical Gaps

| # | Gap | Evidence | Impact |
|---|-----|----------|--------|
| 1 | **Timetable auto-generation is a stub** | `server/controllers/timetableController.js:548-555` returns HTTP 501: *“Timetable generation is not yet implemented.”* | Core README feature unavailable. |
| 2 | **Bulk student import does not persist data** | `server/controllers/studentController.js:992-1061` validates rows and returns a preview only. | README claims full bulk import; users cannot actually import students. |
| 3 | **Super Admin does not have full system access** | `server/middleware/auth.js:96-115` no longer implicitly allows `super_admin`; most routes do not list `super_admin` in their role arrays. | README says Super Admin has “full system access,” but the role gets 403 on most endpoints. |
| 4 | **SPEC.md referenced but missing** | `README.md:39` lists `SPEC.md` in project structure; file does not exist. | Documentation gap. |

---

## 2. Frontend Coverage Gaps

Backend endpoints exist for several features that have **no corresponding UI route or page**:

| Feature | Backend Support | Missing Frontend |
|---------|-----------------|------------------|
| Timetable management / generation | Full CRUD + generate/conflict endpoints (`server/routes/timetables.js:20-75`) | No route/page in `client/src/App.jsx` |
| Bulk student import | `POST /students/bulk-import` (`server/routes/students.js:36-42`) | No import button/page in `StudentList.jsx` |
| Forgot password page | `POST /auth/forgot-password` exists | `Login.jsx:286` links to `/forgot-password`, but no route/page exists |
| Vehicle management | `/transport/vehicles` CRUD | Only used for route assignment in `RouteList.jsx` |
| Transport student allocations | `/transport/allocations` | No allocation page |
| Hostel management | `/hostel/hostels` CRUD | `RoomList.jsx` assumes a single hostel |
| Hostel room allocations | `/hostel/allocations` | No allocation page |
| Hostel visitor logs | `/hostel/visitors` | Only viewable in a modal inside `RoomList.jsx` |
| Class-subject assignments | `/class-subjects` CRUD | No dedicated page |
| Teacher workload | `/teachers/:id/workload` | No page |
| Parent-teacher messaging | Meetings exist | No 1:1 chat/messaging page |

### Placeholder UI Features

These UI elements are wired but currently show “coming soon”:

| Feature | Location | Note |
|---------|----------|------|
| OAuth login (Google/Microsoft) | `client/src/pages/Login.jsx:112` | `alert('OAuth login with ${provider} is not implemented yet')` |
| Results export | `client/src/pages/Exams/Results.jsx:126` | `toast('Export feature coming soon')` |
| Change password | `client/src/pages/Profile/Profile.jsx:67` | `alert('Change password feature coming soon')` |

---

## 3. Backend / API Gaps

| # | Gap | Evidence |
|---|-----|----------|
| 1 | **Fee invoice update/delete endpoints missing** | `server/routes/fees.js:64-81` only has GET, cancel, and fine. |
| 2 | **Payment reversal/void missing** | `server/routes/fees.js:83-97` only records/gets/receipts payments. |
| 3 | **Library reservation fulfillment missing** | `server/routes/library.js:113-123` only create/cancel; no fulfill/hold advancement. |
| 4 | **Transport route stops have no standalone CRUD** | Stops are nested inside route create/update only. |
| 5 | **Hostel visitor log delete missing** | `server/routes/hostel.js:107-141` has GET/POST/PUT/checkout/approve, no DELETE. |
| 6 | **Grading scale creation missing** | `server/routes/settings.js:46-50` only GET/PUT `/settings/grading-scale`. |
| 7 | **Student promotion/graduation workflow missing** | Schema has `status` enums but no promotion endpoint. |
| 8 | **Report-card aggregation is single-exam only** | `server/controllers/studentController.js:1209-1329` shows latest exam only; no weighted multi-exam final grade. |
| 9 | **Duplicate route definitions** | `/timetables/conflicts` and `/timetables/generate` are registered twice in `server/routes/timetables.js:26-38` and `64-75`. |
| 10 | **Meeting routes lack Joi validation** | `server/routes/meetings.js` has no validation middleware. |

---

## 4. Database / Schema Gaps

The schema covers most core entities, but several README-advertised or commonly expected SMS concepts are **not modeled**:

| Advertised Feature | Schema Support | Gap |
|--------------------|----------------|-----|
| Parent-teacher messaging | `meetings`, `announcements`, `notifications` | No `messages` / `conversations` table for direct chat. |
| Payroll / salary | `teachers.salary` column only | No `payroll`, `salary_payments`, or `deductions` tables. |
| Inventory / assets | None | No `inventory`, `assets`, or `asset_categories` tables. |
| Homework / assignments | None | No `homework`, `assignments`, or `submissions` tables. |
| Leave management | None | No `leave_types` or `leave_applications` tables. |
| Events / calendar | None | No `events` or `calendar` table. |
| Discipline / behavior | None | No `disciplinary_records` table. |
| Certificates | None | No `certificates` table. |
| Report cards | `marks`, `grading_scale_grades` | No dedicated `report_cards` table; PDF is generated on the fly. |
| Push notifications | `notifications.is_push_sent` column | Column exists but no push delivery implementation. |

### Schema Quality Issues

| Issue | Evidence |
|-------|----------|
| `receipt_no_seq` is defined only in a migration | `server/db/migrations/002_phase1_phase2_fixes.sql:63` creates the sequence; not in `schema.sql`. New deployments that skip migrations may fail. |
| `hostel_visitors` is in both schema and migration 002 | Risk of duplicate definition depending on deployment path. |
| Migration 003 is aggressive | `003_phase3_phase4_fixes.sql` deletes duplicates to enforce unique indexes; could be data-lossy on dirty data. |

---

## 5. Auth, RBAC & Role Mismatches

| # | Issue | Evidence |
|---|-------|----------|
| 1 | **User registration API blocks super_admin** | `server/routes/auth.js:51` authorizes only `'admin'`; `authController.js:151` checks `role === 'super_admin'`. A super admin hitting the UI `/users` page is blocked. |
| 2 | **User list API blocks super_admin** | `server/routes/auth.js:52` authorizes only `'admin'`; client `/users` allows `['admin', 'super_admin']`. |
| 3 | **Finance routes exclude super_admin** | Client `/finance/*` allows `super_admin`, but `server/routes/fees.js:27-29` roles are `['admin', 'principal', 'accountant']`. |
| 4 | **Module request approve/reject endpoints missing** | `server/routes/moduleRequests.js` exists but only index route is wired in `server/routes/index.js:26`. |
| 5 | **No email for new staff/admin accounts** | Only parents receive invite emails/SMS (`authController.js:218-238`); staff/admins created via register or bulk upload get no welcome message. |
| 6 | **Email uniqueness not checked on profile update** | `authController.js:646-662` allows changing email without duplicate check. |
| 7 | **Refresh flow depends on cookies** | `/auth/refresh-token` reads `req.cookies.refreshToken` (`authController.js:354`); cookie blocking breaks refresh. |
| 8 | **Idle timeout is client-only** | `client/src/context/AuthContext.jsx` clears local storage but does not revoke server session. |
| 9 | **ProtectedRoute calls `/auth/me` on every mount** | `client/src/components/ProtectedRoute.jsx:24` adds an extra round-trip per protected page. |
| 10 | **No audit logging** | No centralized audit trail for auth events, role changes, or payment callbacks. |

---

## 6. Payment & Integration Gaps

| # | Issue | Evidence |
|---|-------|----------|
| 1 | **M-Pesa amount rounded up** | `server/services/mpesaService.js:72` uses `Math.ceil(amount)`; fractional balances may be overcharged. |
| 2 | **No M-Pesa transaction status query** | Backend only polls its own `payment_transactions` table; never queries Safaricom's status API for stale pending transactions. |
| 3 | **M-Pesa callback IP allowlist optional** | `paymentController.js:234-244` accepts callbacks when `MPESA_CALLBACK_IPS` is not configured. |
| 4 | **Receipt resend does not attach PDF** | `paymentController.js:459-489` emails existing payment data only; no PDF regeneration/attachment. |
| 5 | **No push notification delivery** | `notifications.is_push_sent` column exists but no service sends push notifications. |
| 6 | **Meeting reminders not sent** | `meetings.reminder_sent` column exists and scheduler runs every minute, but no reminder job. |
| 7 | **Announcement update ignores `sendEmail`/`sendSMS`** | `announcementController.js:284-329` does not re-distribute on update. |
| 8 | **Announcement recipient resolution may miss students/teachers** | `communicationService.resolveRecipients` queries `users` by role, but students/teachers live in separate tables. |
| 9 | **Inconsistent `staff` audience logic** | `communicationService` treats `staff` broadly; `notificationService.getAnnouncementRecipientIds` filters only `role = 'staff'`. |
| 10 | **No CSRF protection** | Refresh token cookie has no explicit CSRF token or double-submit cookie. |

---

## 7. Testing & Quality Gaps

| # | Issue | Evidence |
|---|-------|----------|
| 1 | **No test suite** | No `server/tests/` or `client/tests/` directories observed. |
| 2 | **No automated lint/format checks** | ESLint config exists but no CI workflow visible. |
| 3 | **No API documentation** | README lists endpoints briefly; no OpenAPI/Swagger spec. |

---

## 8. Recommendations (Prioritized)

### High Priority
1. **Implement timetable auto-generation** or remove it from README features until ready.
2. **Complete bulk student import** so the preview endpoint actually inserts validated rows.
3. **Fix super_admin access** — either make `authorize()` implicitly allow `super_admin` or add `super_admin` to every admin route.
4. **Add missing frontend pages:** forgot password, timetable, bulk import, vehicle management, hostel allocation/visitor logs, class-subject assignment.
5. **Resolve client/server role mismatches** on `/users`, `/finance`, and `/module-requests`.

### Medium Priority
6. **Add missing schema entities** for payroll, inventory, homework, leave, events, discipline, and certificates if these are roadmap items.
7. **Implement M-Pesa Safaricom status query** for stale pending transactions.
8. **Add meeting reminders** in the scheduler job.
9. **Generate PDF receipts** and attach them in the resend endpoint.
10. **Move `receipt_no_seq` into `schema.sql`** so fresh deployments do not depend on migrations.

### Low Priority
11. **Replace “coming soon” placeholders** with actual OAuth, results export, and change-password flows.
12. **Add audit logging** for auth, payments, and role changes.
13. **Introduce automated tests** (unit + API + e2e) before further feature expansion.
14. **Create or remove `SPEC.md`** reference in README.

---

## Appendix: Quick Stats

| Area | Count |
|------|-------|
| Database tables | ~48 |
| Backend route modules | 25 |
| Backend controllers | 23 |
| Frontend page files | 34+ |
| Known stubbed features | 3+ |
| Missing frontend pages for existing APIs | 8+ |
| Client/server role mismatches | 3+ |
| Unmodeled README/common SMS entities | 9+ |

---

*End of report.*
