# APPENDICES

---

## APPENDIX A — DATABASE SQL SCRIPTS (`database/`)

The authoritative relational database scripts reside in the repository under `database/` and `backend/src/scripts/seed-passwords.js`:

1. **`database/schema.sql` (167 lines):** Idempotent MySQL 8.0 DDL defining `ue_cloudlearn` (`InnoDB`, `utf8mb4_unicode_ci`) and all six normalized tables (`users`, `courses`, `enrollments`, `materials`, `assignments`, `submissions`) with primary keys, foreign keys (`ON DELETE RESTRICT` / `ON DELETE CASCADE`), unique keys, check constraints (`chk_assignments_max_score`, `chk_submissions_score`), and secondary indexes.
2. **`database/seed.sql` (240 lines):** Idempotent `INSERT IGNORE INTO` initial dataset inserting 6 fictional academic users (`Elena Navarro`, `Prof. Marco Santos`, `Prof. Clarissa Reyes`, `Gabriel Cruz`, `Andrea Torres`, `Paolo Mendoza`), 3 courses (`CCS4301`, `CCS3102`, `CCS3204`), 7 enrollments, 4 materials, 4 assignments, and 4 submissions. Password fields hold `PENDING_BCRYPTJS_HASH_RUN_SEED_SCRIPT` so no static credential hash is ever committed to public Git.
3. **`database/sample_queries.sql` (207 lines):** Chapter 4.4 evidence queries covering Schema Inspection (`SHOW TABLES`, `DESCRIBE courses`, `SHOW CREATE TABLE submissions`), `INSERT`, `SELECT`, `UPDATE`, targeted `DELETE`, and three multi-table `JOIN` + aggregate queries (`6a` Course Catalog, `6b` Student Learning Records, `6c` Assignment Gradebook).
4. **`backend/src/scripts/seed-passwords.js` (49 lines):** Operational activation utility that hashes the runtime `SEED_DEMO_PASSWORD` environment variable using `bcryptjs` (10 rounds) and updates `@ue-cloudlearn.edu.ph` seeded accounts via parameterized SQL.

### Excerpt of `database/schema.sql` Core Table Definitions

```sql
CREATE DATABASE IF NOT EXISTS ue_cloudlearn
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE ue_cloudlearn;

CREATE TABLE IF NOT EXISTS users (
    id            INT          NOT NULL AUTO_INCREMENT,
    full_name     VARCHAR(120) NOT NULL,
    email         VARCHAR(190) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('admin', 'instructor', 'student') NOT NULL DEFAULT 'student',
    status        ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS courses (
    id            INT          NOT NULL AUTO_INCREMENT,
    course_code   VARCHAR(30)  NOT NULL,
    title         VARCHAR(160) NOT NULL,
    description   TEXT         NULL,
    term          VARCHAR(60)  NOT NULL DEFAULT 'First Semester 2026-2027',
    instructor_id INT          NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_courses_code (course_code),
    INDEX idx_courses_instructor (instructor_id),
    CONSTRAINT fk_courses_instructor
        FOREIGN KEY (instructor_id) REFERENCES users (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

*(Full scripts are tracked in `database/schema.sql`, `database/seed.sql`, and `database/sample_queries.sql`.)*

---

## APPENDIX B — GITHUB REPOSITORY STRUCTURE AND COMMIT HISTORY

- **Official Repository URL:** `https://github.com/rocumen/UE-Cloudlearn`
- **Primary Branch:** `main`
- **Secret Protection:** Enforced via `.gitignore` (blocks `.env`, `.env.*` except `!.env.example`, `*.pem`, `*.key`, `credentials.json`, `.aws/`, `node_modules/`, `frontend/dist/`, and SQL backups).

### Repository Directory Layout

```text
UE-Cloudlearn/
├── .env.example
├── .gitignore
├── README.md
├── database/
│   ├── schema.sql
│   ├── seed.sql
│   └── sample_queries.sql
├── backend/
│   ├── package.json
│   ├── src/
│   │   ├── app.js, server.js
│   │   ├── config/        (db.js, env.js, s3.js)
│   │   ├── controllers/   (assignments, auth, courses, enrollments, materials, records, submissions, users)
│   │   ├── middleware/    (auth.js, errorHandler.js, upload.js, validate.js)
│   │   ├── routes/        (9 REST route files — 35 endpoints)
│   │   ├── scripts/       (seed-passwords.js)
│   │   ├── services/      (7 parameterized mysql2/promise query modules)
│   │   └── utils/         (date.js, response.js)
│   └── tests/             (8 Vitest + Supertest files, 27 tests)
├── frontend/
│   ├── package.json, index.html, tailwind.config.js, vite.config.ts
│   └── src/
│       ├── App.tsx, main.tsx
│       ├── styles/tokens.css
│       ├── lib/           (api.ts, formatters.ts)
│       ├── context/       (AuthContext.tsx, ThemeContext.tsx)
│       ├── components/    (AppShell.tsx, ProtectedRoute.tsx, 13 UI primitives)
│       └── pages/         (Login, Register, Dashboard, Courses, CourseDetail, Submissions, Records, Users)
├── infra/
│   ├── aws-architecture-checklist.md
│   ├── iam/               (ec2-trust-policy.json, ec2-s3-least-privilege-policy.json)
│   ├── nginx/             (ue-cloudlearn.conf)
│   ├── pm2/               (ecosystem.config.cjs)
│   └── scripts/           (ec2-bootstrap.sh, deploy.sh, verify-live.sh)
├── docs/                  (00-preliminary-pages.md through 08-appendices.md + screenshots/)
└── team-docs/             (README.md, 00-MASTER-STUDY-GUIDE.md, 01–07 Member Packets)
```

### Development Progression & Feature Commit Summary

| Engineering Stage | Repository Scope Delivered | Primary Owner(s) |
|---|---|---|
| **Repository & Security Setup** | `.gitignore`, sanitized `.env.example`, directory layout, and `README.md` | Mark Bautista, Mark Costin |
| **Database Schema & Sample SQL** | `database/schema.sql` (6 InnoDB tables), idempotent `seed.sql`, and Chapter 4.4 `sample_queries.sql` | Mark Cyron Feratero |
| **Backend Core, Auth & RBAC** | Express ESM API scaffold, `mysql2/promise` pool, JWT `HttpOnly` auth, RBAC middleware, Admin Users CRUD, `seed-passwords.js` | Zac Dacquel |
| **LMS Domain APIs & S3 Service** | Courses, Enrollments, Materials, Assignments, Submissions, Grading, Records SQL `JOIN`s, `s3.js` presigner, `multer` 15 MB upload validation | Zac Dacquel, Ryan Palacios |
| **Automated Backend Test Suite** | `mockDb.js`, `mockStorage.js`, and 8 Vitest + Supertest integration suites (`27/27` passing tests) | Zac Dacquel, Reynald Ocumen |
| **Frontend Design Tokens & Core UI** | `tokens.css` (Light/Dark UE Crimson palette), `api.ts`, `AuthContext`, `ThemeContext`, `AppShell`, 13 UI primitives, `LoginPage`, `RegisterPage`, `DashboardPage` | Isabel Lopez |
| **Full LMS Frontend Screens** | `CoursesPage`, `CourseDetailPage` (Materials/Assignments/Students tabs), `SubmissionsPage`, `RecordsPage`, `UsersPage`, 15-point accessibility audit | Isabel Lopez |
| **Cloud Infra & Deployment Scripts** | `infra/iam/` policies, `infra/nginx/ue-cloudlearn.conf`, `infra/pm2/ecosystem.config.cjs`, `ec2-bootstrap.sh`, `deploy.sh`, `verify-live.sh`, Free Tier runbook | Mark Bautista, Ryan Palacios, Reynald Ocumen |
| **Live AWS Provisioning & E2E Check** | Provisioned VPC, 3 subnets, IGW, Route Tables, Security Groups, Private RDS, Private S3, IAM Role, EC2 (`ap-southeast-1`), live E2E tests | Mark Bautista, Reynald Ocumen, Ryan Palacios, Mark Cyron Feratero |
| **Formal UE Docs & Study Packets** | Chapters 1–6, Preliminary Pages, APA 7th References, Appendices A–F (23 live screenshots), and 7 individualized study packets | All 7 Members (QA Lead: Reynald Ocumen) |

### Post-Push GitHub Screenshots Checklist

- [ ] `[INSERT CAPTURED SCREENSHOT AFTER GITHUB PUSH: docs/screenshots/github-01-repo-structure.png]` — Top-level repository tree and `README.md` on `https://github.com/rocumen/UE-Cloudlearn`.
- [ ] `[INSERT CAPTURED SCREENSHOT AFTER GITHUB PUSH: docs/screenshots/github-02-commits.png]` — GitHub **Commits** / **Contributors** view confirming commits across the project timeline.

---

## APPENDIX C — MASTER WEB APPLICATION SCREENSHOT INDEX AND CHECKLIST

All 14 live web application screenshots below were captured from the deployed AWS production endpoint (`http://47.131.249.155` during initial deployment verification; resumed at `http://54.255.186.17`) and saved under `docs/screenshots/`.

| # | Status | File Path (`docs/screenshots/`) | Paper Figure(s) | Screen / Role Demonstrated |
|---|---|---|---|---|
| 1 | [x] Captured | `app-01-login.png` | Figure 2.5 | Sign In card (`/login`) with UE Crimson primary button |
| 2 | [x] Captured | `app-02-register.png` | Figure 2.6 | Student Account Registration (`/register`) |
| 3 | [x] Captured | `app-03-admin-dashboard.png` | Figures 2.7, 3.1 | Administrator Overview Dashboard (`/`) |
| 4 | [x] Captured | `app-04-admin-courses.png` | Figure 3.2 | Administrator Courses Directory (`/courses`) |
| 5 | [x] Captured | `app-05-admin-users.png` | Figure 3.3 | Administrator User Accounts Directory (`/users`) |
| 6 | [x] Captured | `app-06-instructor-dashboard.png` | Figure 3.4 | Instructor Overview Dashboard (`/`) |
| 7 | [x] Captured | `app-07-course-materials.png` | Figure 3.5 | Course Workspace — Materials Tab (`/courses/:id`) |
| 8 | [x] Captured | `app-08-course-assignments.png` | Figure 3.6 | Course Workspace — Assignments Tab (`/courses/:id`) |
| 9 | [x] Captured | `app-09-course-students.png` | Figures 3.7, 4.2 | Course Workspace — Enrolled Students Roster (`/courses/:id`) |
| 10 | [x] Captured | `app-10-instructor-submissions.png` | Figure 3.8 | Instructor Submissions Review Inbox (`/submissions`) |
| 11 | [x] Captured | `app-11-grading-modal.png` | Figure 3.9 | Instructor Review & Grade Modal Sheet (`/submissions`) |
| 12 | [x] Captured | `app-12-student-dashboard.png` | Figure 3.10 | Student Overview Dashboard (`/`) |
| 13 | [x] Captured | `app-13-student-records.png` | Figures 3.11, 4.3 | Student Learning Records SQL `JOIN` Scorecard (`/records`) |
| 14 | [x] Captured | `app-14-dark-mode-records.png` | Figure 2.8 | Dark Theme Adaptive Interface (`/records`) |

![C.1 Login Screen](screenshots/app-01-login.png)
![C.2 Register Screen](screenshots/app-02-register.png)
![C.3 Admin Dashboard](screenshots/app-03-admin-dashboard.png)
![C.4 Admin Courses](screenshots/app-04-admin-courses.png)
![C.5 Admin Users](screenshots/app-05-admin-users.png)
![C.6 Instructor Dashboard](screenshots/app-06-instructor-dashboard.png)
![C.7 Course Materials](screenshots/app-07-course-materials.png)
![C.8 Course Assignments](screenshots/app-08-course-assignments.png)
![C.9 Course Students](screenshots/app-09-course-students.png)
![C.10 Instructor Submissions](screenshots/app-10-instructor-submissions.png)
![C.11 Grading Modal](screenshots/app-11-grading-modal.png)
![C.12 Student Dashboard](screenshots/app-12-student-dashboard.png)
![C.13 Student Records](screenshots/app-13-student-records.png)
![C.14 Dark Mode Records](screenshots/app-14-dark-mode-records.png)

---

## APPENDIX D — MASTER AWS MANAGEMENT CONSOLE SCREENSHOT INDEX AND CHECKLIST

All 9 live AWS Management Console screenshots below were captured in `ap-southeast-1` (Singapore) and saved under `docs/screenshots/`.

| # | Status | File Path (`docs/screenshots/`) | Paper Figure(s) | AWS Service & Verification Evidence Shown |
|---|---|---|---|---|
| 1 | [x] Captured | `aws-01-vpc-resource-map.png` | Figure 5.5 | `ue-cloudlearn-vpc` (`vpc-08e1bc74978acedfc`) Resource Map showing 1 public + 2 private subnets + IGW |
| 2 | [x] Captured | `aws-02-route-tables.png` | Figure 5.6 | `rtb-0d13cd600ecf44dbb` (`0.0.0.0/0 -> igw`) & `rtb-06e885a597a4dacf7` (`local` ONLY) |
| 3 | [x] Captured | `aws-03-security-groups.png` | Figure 5.7 | `ue-cloudlearn-ec2-sg` (`sg-0ffdde6854196014f`) & `ue-cloudlearn-rds-sg` (`sg-06ac3f3f332f7b98a` `3306` from `ec2-sg`) |
| 4 | [x] Captured | `aws-04-rds-instance.png` | Figures 4.1, 5.8 | `ue-cloudlearn-db` (MySQL `8.0.46`, `db.t3.micro`, `PubliclyAccessible=No`, private subnets) |
| 5 | [x] Captured | `aws-05-s3-objects.png` | Figure 5.1 | `ue-cloudlearn-files-ccs4301-7dfd0a` objects under `materials/` and `submissions/` prefixes |
| 6 | [x] Captured | `aws-06-s3-permissions.png` | Figure 5.2 | `ue-cloudlearn-files-ccs4301-7dfd0a` Block All Public Access = ON (`4/4` flags enabled) |
| 7 | [x] Captured | `aws-07-iam-role-policy.png` | Figure 5.9 | IAM Role `ue-cloudlearn-ec2-role` & least-privilege `UECloudlearnEC2S3Policy` |
| 8 | [x] Captured | `aws-08-ec2-instance.png` | Figure 5.3 | `ue-cloudlearn-app-ec2` (`i-0613bbaf4edddf9be`, `t3.micro`, running in `ap-southeast-1a`) |
| 9 | [x] Captured | `aws-09-ec2-security.png` | Figure 5.4 | EC2 instance security group (`sg-0ffdde6854196014f`) & IAM Instance Profile attachment |

![D.1 VPC Resource Map](screenshots/aws-01-vpc-resource-map.png)
![D.2 Route Tables](screenshots/aws-02-route-tables.png)
![D.3 Security Groups](screenshots/aws-03-security-groups.png)
![D.4 RDS Instance](screenshots/aws-04-rds-instance.png)
![D.5 S3 Objects](screenshots/aws-05-s3-objects.png)
![D.6 S3 Permissions](screenshots/aws-06-s3-permissions.png)
![D.7 IAM Role and Policy](screenshots/aws-07-iam-role-policy.png)
![D.8 EC2 Instance](screenshots/aws-08-ec2-instance.png)
![D.9 EC2 Security](screenshots/aws-09-ec2-security.png)

---

## APPENDIX E — GROUP MEMBER CONTRIBUTIONS MATRIX

| # | Member Name | Designated Role | Technical & GitHub Ownership | Formal Paper Sections Authored | Live Presentation Segment |
|---|---|---|---|---|---|
| 1 | **Mark Costin** *(Leader)* | Group Leader, System Integrator & Architecture Presenter | Repo oversight, PR reviews, `README.md`, integration testing & live demo flow | Preliminary Pages, **Ch. 1**, **Ch. 5.1 & 5.8**, **Appendix E** | Opens presentation (Problem, Objectives, Architecture), leads **Part 3 Live Integration Demo** & closing |
| 2 | **Zac Dacquel** | Backend & Authentication Lead | `backend/` Express API, Auth (`register`/`login`/`logout`/JWT), RBAC, input validation | **Ch. 2.1–2.3**, **Ch. 3.1, 3.3 & 3.5** | **Part 1 Auth & RBAC Demo** + explains backend Express/JWT pipeline |
| 3 | **Isabel Lopez** | Frontend & UI/UX Lead | `frontend/` React UI, UE Crimson minimalist UI components, dashboards, CRUD sheets, notifications | **Ch. 2.4–2.6**, **Ch. 3.2 & 3.4**, **Appendix C** | **Part 1 Live App Walkthrough** across Admin, Instructor, and Student views |
| 4 | **Mark Cyron Feratero** | Database & Amazon RDS Lead | `database/` ERD, `schema.sql`, `seed.sql`, `sample_queries.sql`, Amazon RDS MySQL setup & testing | **Ch. 2.7**, **Ch. 4 (All Sections)**, **Ch. 5.6**, **Appendix A** | **Part 2 Amazon RDS Console + Live SQL Tables/Records** & Part 3 persistence proof |
| 5 | **Ryan Palacios** | Cloud Storage & IAM Security Lead | Amazon S3 bucket, prefixes, Block Public Access, presigned URLs, IAM Role (`ue-cloudlearn-ec2-role`) & policy | **Ch. 5.2 & 5.7**, **Ch. 6.4**, **Appendix D (S3/IAM)** | **Part 2 S3 & IAM Console** + **Part 3 Live File Upload/Retrieval** proof |
| 6 | **Mark Bautista** | Cloud Hosting & Deployment Lead | Amazon EC2 Ubuntu 24.04 setup, Node/PM2/Nginx reverse proxy, deploy scripts, `.env.example`, GitHub workflow | **Ch. 3.6**, **Ch. 5.3 & 5.9**, **Appendix B & D (EC2)** | **Part 2 EC2 Console & Running Server (`pm2`, `nginx`)** + GitHub repo walkthrough |
| 7 | **Reynald Ocumen** | Cloud Networking & QA Lead | Amazon VPC, Public/Private Subnets, IGW, Route Tables, Security Groups (`ec2-sg`, `rds-sg`), QA test execution | **Ch. 5.4 & 5.5**, **Ch. 6 (All Sections)**, **References & Appendix F** | **Part 2 VPC, Subnets, Route Tables & Security Groups** + **Ch. 6 QA Summary** |

---

## APPENDIX F — ADDITIONAL TECHNICAL AND OPERATIONAL DOCUMENTATION

### F.1 Sanitized Environment Variable Template (`.env.example`)

```env
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:5173
COOKIE_SECURE=false
JWT_SECRET=replace-with-strong-64-char-random-secret

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=ue_cloudlearn
DB_USER=ue_cloudlearn_app
DB_PASSWORD=replace-with-strong-db-password

AWS_REGION=ap-southeast-1
S3_BUCKET_NAME=ue-cloudlearn-files-replace-me
STORAGE_MODE=s3
# On EC2, AWS credentials come automatically from the attached IAM Instance Role.
# NEVER put AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY into committed files.
```

### F.2 Nginx Reverse Proxy Configuration (`infra/nginx/ue-cloudlearn.conf`)

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name _;

    client_max_body_size 16M;

    root /var/www/ue-cloudlearn/frontend/dist;
    index index.html;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 10s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        try_files $uri =404;
    }

    location = /index.html {
        add_header Cache-Control "no-cache" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### F.3 PM2 Process Configuration (`infra/pm2/ecosystem.config.cjs`)

```javascript
module.exports = {
  apps: [
    {
      name: 'ue-cloudlearn-api',
      script: 'src/server.js',
      cwd: '/var/www/ue-cloudlearn/backend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '350M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

### F.4 AWS Free Tier Pause and Resume Workflow (Pre-Defense Check)

1. **Pause after screenshot capture** (keeps RDS data & S3 objects intact at `$0.00/hr` compute):
   ```bash
   aws ec2 stop-instances --region ap-southeast-1 --instance-ids i-0613bbaf4edddf9be
   aws rds stop-db-instance --region ap-southeast-1 --db-instance-identifier ue-cloudlearn-db
   ```
   *(Note: AWS automatically restarts a stopped RDS instance after 7 days; stopping on November 19 causes automatic resumption on November 26 ahead of the November 27 presentation.)*
2. **Resume prior to rehearsal / defense:**
   ```bash
   aws rds start-db-instance --region ap-southeast-1 --db-instance-identifier ue-cloudlearn-db
   aws ec2 start-instances --region ap-southeast-1 --instance-ids i-0613bbaf4edddf9be
   aws rds wait db-instance-available --region ap-southeast-1 --db-instance-identifier ue-cloudlearn-db
   aws ec2 wait instance-status-ok --region ap-southeast-1 --instance-ids i-0613bbaf4edddf9be
   aws ec2 describe-instances --region ap-southeast-1 --instance-ids i-0613bbaf4edddf9be --query "Reservations[0].Instances[0].PublicIpAddress" --output text
   ```
3. **Refresh `CORS_ORIGIN` on EC2 if public IPv4 changed:** Update `CORS_ORIGIN=http://<NEW_EC2_PUBLIC_IP>` in `/var/www/ue-cloudlearn/.env`, then run `pm2 restart ue-cloudlearn-api --update-env` and `bash /var/www/ue-cloudlearn/infra/scripts/verify-live.sh`.

### F.5 UE CCS4301 Formal Word and PDF Export Checklist

- [ ] Fill in the official assigned Group Number on all `________` blank lines on the Title Page and Approval Sheet.
- [ ] Push final repository state to `https://github.com/rocumen/UE-Cloudlearn` and insert `github-01-repo-structure.png` and `github-02-commits.png` in Chapter 3.6 / Appendix B.
- [ ] Apply Microsoft Word page setup: **A4** paper size, **Times New Roman 12pt** body text (`14pt–16pt` bold headings), **1.5 line spacing**, justified paragraph alignment, **1.5-inch left margin** (binding side) and **1.0-inch** top, bottom, and right margins, and page numbering at bottom-right.
- [ ] Export compiled documentation for soft-bound printing and submit digital PDF named `<GroupNumber>_UECloudlearn_AWSFinalProject.pdf`.
