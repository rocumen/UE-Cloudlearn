# Study & Presentation Packet 02 — Zac Dacquel

**Role:** Backend & Authentication Lead (`backend/`)  
**Project:** UE Cloudlearn (`CCS_4301 / CS1G` — First Semester 2026–2027)  
**Presentation Date:** November 27, 2026  
**Also Study:** `team-docs/00-MASTER-STUDY-GUIDE.md` (mandatory for Part 4 Q&A)

---

## 1. Your Project Responsibilities

- Own the **Node.js + Express.js (ES Modules)** REST API architecture (**35 endpoints** across 9 route modules in `backend/src/routes/`), centralized Zod input validation (`backend/src/middleware/validate.js`), and safe error handling (`backend/src/middleware/errorHandler.js`).
- Own **Authentication & Security**: Student registration with `bcryptjs` (10 salt rounds), Login/Logout issuing 24-hour JWT tokens in `HttpOnly`, `SameSite=Lax` cookie `ue_cloudlearn_token` (with `COOKIE_SECURE` toggle + `Authorization: Bearer` fallback), and `requireAuth` + `requireRole` RBAC middleware (`backend/src/middleware/auth.js`).
- Own **Upload Guardrails & S3 Integration**: `multer` memory storage (`MAX_UPLOAD_SIZE_BYTES = 15 MB`) and strict extension/MIME allowlist (`backend/src/middleware/upload.js`) paired with `createS3Storage()` (`backend/src/config/s3.js`).

## 2. Your Assigned Formal Paper Sections (`docs/`)

- **Chapter 2.1–2.3 (`docs/02-chapter-2-analysis-design.md`):** Functional (`Table 2.1`) & Non-Functional (`Table 2.2`) Requirements, Hardware/Software Specs (`Table 2.3`, `Table 2.4`), Multi-Tier System Architecture (`Figure 2.1`), and Role Workflow Flowcharts (`Figures 2.2`–`2.4`).
- **Chapter 3.1, 3.3 & 3.5 (`docs/03-chapter-3-development.md`):** Development Environment (`Table 3.1`), Backend Development (`Table 3.3`, all 35 REST endpoints in `Table 3.4`), and User Authentication & RBAC (`Figure 3.12`, `Table 3.5`).

## 3. Your GitHub & Verification Checklist

- [x] `backend/src/app.js`, `server.js`, `config/env.js`, `config/db.js`, `config/s3.js`.
- [x] `backend/src/middleware/{auth,upload,validate,errorHandler}.js` and all 9 route + 8 controller + 7 service files.
- [x] `backend/src/scripts/seed-passwords.js` (runtime password activation without committed password hashes).
- [x] 8 Vitest + Supertest suites (`backend/tests/*.test.js`) passing **27/27 tests** (`npm test`).

## 4. Your Live Presentation Script (Part 1 — Auth & RBAC Demo, 2–3 mins)

1. **Public Registration & Validation (`/register`):**
   - Open `http://54.255.186.17/login` (or current Nov 27 EC2 public IP), click **`Create an account`** -> `/register`.
   - Submit invalid email or short password to show inline client + Zod validation, then register a new demo student (e.g., `Juan Dela Cruz`) -> lands on `/` as `Student` (`POST /api/auth/register` sets `ue_cloudlearn_token` `HttpOnly` cookie and forces `role: 'student'`).
2. **Server-Side RBAC Proof (`403 Forbidden`):**
   - Point out that a Student sidebar shows only `Overview`, `Courses`, and `Learning records` — AND if a student manually navigates to `/users` (`ProtectedRoute` redirects with info toast) or sends a direct API request to `GET /api/users` (verified live on EC2), Express `requireRole('admin')` returns **`HTTP 403 Forbidden`**.
3. **Role Switching Walkthrough:**
   - Click **`Sign out`** (`POST /api/auth/logout` clears cookie) -> sign in as **Instructor** (`instructor.santos@ue-cloudlearn.edu.ph`) showing Instructor nav (`Overview`, `My courses`, `Submissions`) -> sign out and sign in as **Administrator** (`admin@ue-cloudlearn.edu.ph`) showing Admin nav (`Overview`, `Courses`, `Users`).
4. **Pipeline Summary (1 min):**
   - Summarize request pipeline: `Express Router -> requireAuth (JWT + active RDS check) -> requireRole(...) -> validate(Zod) -> Controller -> Parameterized SQL (mysql2) / AWS S3 SDK v3 -> errorHandler`.
   - Hand off to **Isabel** for the Part 1 full LMS UI walkthrough.

## 5. Role-Specific Q&A Practice

- **Q: How are user passwords secured in Amazon RDS?**  
  *A:* `auth.controller.js` and `users.controller.js` hash passwords with `bcryptjs` using `10` salt rounds before `INSERT INTO users`. During login, `bcrypt.compare()` checks the input against `password_hash`, `BCRYPT_HASH_PATTERN` rejects placeholder hashes (`401`), and `mapUserRow` ensures `password_hash` is never returned in JSON responses.
- **Q: How does `requireAuth` handle a user who gets deactivated by an Admin while already logged in?**  
  *A:* `requireAuth` (`backend/src/middleware/auth.js`) verifies the JWT signature and then immediately queries RDS (`SELECT id, full_name, email, role, status, created_at FROM users WHERE id = ?`). If `userRow.status !== 'active'`, it immediately rejects the request with `403 ACCOUNT_INACTIVE`.
- **Q: Why use an `HttpOnly` cookie instead of `localStorage`, and why does `COOKIE_SECURE` exist?**  
  *A:* `HttpOnly: true` prevents JavaScript/XSS from reading the token and `SameSite: 'lax'` reduces CSRF risk. Making `COOKIE_SECURE` configurable in `.env` allows plain HTTP live demos (`COOKIE_SECURE=false`) while supporting HTTPS TLS (`COOKIE_SECURE=true`) with zero code changes.
- **Q: What prevents oversized or dangerous file uploads from reaching Amazon S3?**  
  *A:* `backend/src/middleware/upload.js` buffers uploads in memory with `limits: { fileSize: 15 * 1024 * 1024 }` (mapped by `errorHandler` to `400 FILE_TOO_LARGE`) and enforces an allowlist checking BOTH file extension and MIME type (`.pdf`, `.docx`, `.pptx`, `.xlsx`, `.txt`, `.png`, `.jpg`, `.jpeg`, `.zip`). If RDS insertion later fails, `createMaterialHandler` / `createOrReplaceSubmissionHandler` immediately calls `storage.deleteObject()` to prevent orphaned S3 objects.

## 6. Live Project Evidence Index

- **Key Backend Files:** `backend/src/app.js`, `server.js`, `config/{env,db,s3}.js`, `middleware/{auth,upload,validate,errorHandler}.js`, `routes/*.routes.js` (9 files), `controllers/*.controller.js` (8 files), `services/*.service.js` (7 files), `scripts/seed-passwords.js`
- **Verified API Surface:** **35 REST endpoints** across 9 route modules (`docs/03-chapter-3-development.md` Table 3.4)
- **Automated Test Suite:** `cd backend && npm test` -> **8/8 test files, 27/27 tests PASS** (`health`, `auth`, `users`, `seed-passwords`, `s3`, `courses-enrollments`, `materials-assignments`, `submissions-records`)
- **Live Cloud Verification:** Admin `GET /api/users` -> `200` (`6` users); Student `GET /api/users` -> `403`; Instructor/Student S3 uploads -> `201`; Presigned downloads -> `200`; Direct S3 URLs -> `403`
