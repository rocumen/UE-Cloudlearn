# UE Cloudlearn — Online Learning and Course Management System

**Course & Section:** CCS_4301 / CS1G — Cloud Computing (First Semester 2026-2027)  
**Institution:** University of the East — Caloocan, College of Engineering (Faculty of Computer Studies and Systems)  
**Instructor:** Prof. Ryan Paul Obligar, MIT  
**Group Number:** `________`  
**Group Leader:** Mark Costin  
**GitHub Repository:** `https://github.com/rocumen/UE-Cloudlearn`  

> **Repository Status:** Full-stack application (`database/`, `backend/`, `frontend/`, `infra/`), formal UE CCS4301 technical documentation (`docs/`), and team study guides (`team-docs/`) are complete and live-verified on AWS (`ap-southeast-1`) at `http://54.255.186.17` (dynamic EC2 Public IPv4 refreshes upon instance stop/start when no Elastic IP is attached).

---

## 1. Group Members & Roles

| # | Name | Designated Role | Technical & AWS Ownership | Formal Paper Chapters |
|---|---|---|---|---|
| 1 | **Mark Costin** *(Leader)* | Group Leader, System Integrator & Architecture Presenter | Repo oversight, PR reviews, `README.md`, integration testing & live demo flow | Prelim Pages, Ch. 1, Ch. 5.1 & 5.8, Appendix E |
| 2 | **Zac Dacquel** | Backend & Authentication Lead | `backend/` Express API, Auth (`register`/`login`/`logout`/JWT), RBAC, input validation | Ch. 2.1–2.3, Ch. 3.1, 3.3 & 3.5 |
| 3 | **Isabel Lopez** | Frontend & UI/UX Lead | `frontend/` React UI, UE Crimson design system, dashboards, CRUD forms, notifications | Ch. 2.4–2.6, Ch. 3.2 & 3.4, Appendix C |
| 4 | **Mark Cyron Feratero** | Database & Amazon RDS Lead | `database/` ERD, `schema.sql`, `seed.sql`, SQL CRUD & `JOIN` scripts, Amazon RDS MySQL setup & testing | Ch. 2.7, Ch. 4 (All Sections), Appendix A |
| 5 | **Ryan Palacios** | Cloud Storage & IAM Security Lead (S3 & IAM) | Amazon S3 bucket, prefixes, Block Public Access, presigned URLs, IAM Role (`ue-cloudlearn-ec2-role`) & least-privilege policy | Ch. 5.2 & 5.7, Ch. 6.4, Appendix D (S3/IAM) |
| 6 | **Mark Bautista** | Cloud Hosting & Deployment Lead (EC2 & GitHub) | Amazon EC2 Ubuntu setup, Node.js/PM2/Nginx reverse proxy, production deploy, `.env.example`, GitHub workflow | Ch. 3.6, Ch. 5.3 & 5.9, Appendix B & D (EC2) |
| 7 | **Reynald Ocumen** | Cloud Networking & QA Lead (VPC, Security Groups & Testing) | Amazon VPC, Public/Private Subnets, IGW, Route Tables, Security Groups (`ec2-sg`, `rds-sg`), QA test execution | Ch. 5.4 & 5.5, Ch. 6 (All Sections), References & Appendix F |

---

## 2. Project Overview

University classes frequently scatter course handouts, assignment specifications, student file submissions, and grade records across messaging apps, email threads, and personal drives. That fragmentation causes lost submissions, inconsistent access control, poor version tracking, and manual grading overhead.

**UE Cloudlearn** addresses this by providing a centralized, role-based web application hosted on **Amazon Web Services (AWS)**. Administrators manage user accounts and courses, instructors publish learning materials and grade student work, and students enroll in courses, download handouts, submit assignments, and view consolidated learning records. Structured relational data lives in a private **Amazon RDS (MySQL 8.0)** instance, while uploaded course documents and submissions are stored securely in a private **Amazon S3** bucket accessed through short-lived presigned URLs from an **Amazon EC2** host inside a custom **Amazon VPC**.

---

## 3. Objectives

1. **Centralize Course Workflows:** Provide role-based academic workflows for administrators, instructors, and students in one web application.
2. **Enforce Transparent Relational Storage:** Persist all academic records in **Amazon RDS for MySQL 8.0** (`ue_cloudlearn`) using explicit parameterized SQL (`mysql2/promise`) without an ORM.
3. **Secure Cloud Object Storage:** Store and retrieve course materials, assignment attachments, and student submissions in a private **Amazon S3** bucket using server-side encryption, Block All Public Access, and 5-minute presigned GET URLs.
4. **Harden AWS Network & IAM Boundaries:** Deploy the application inside a custom **Amazon VPC** (`ap-southeast-1`) isolating RDS in private subnets with security-group-to-security-group rules and authenticating EC2 to S3 via an **IAM Instance Profile** (`ue-cloudlearn-ec2-role`).
5. **Operate Within AWS Free Tier & Document Rigorously:** Keep cloud infrastructure strictly within AWS Free Tier limits while producing verifiable test matrices, formal UE chapters, and team study guides.

---

## 4. System Features

### Administrator (`admin`)
- Manage user accounts (list, filter by role, create accounts across all roles, update role/status, delete users except self).
- Create, edit, and delete courses and assign or reassign instructors.
- Monitor system-wide enrollments, materials, assignments, and submissions via an executive dashboard.

### Instructor (`instructor`)
- Manage assigned courses (update title, overview description, and academic term) and inspect enrolled student rosters.
- Upload, edit metadata, replace, and delete course learning materials stored in Amazon S3 and indexed in RDS.
- Create, edit, and delete assignments (with optional S3 reference attachments).
- Review student submissions, download submitted files via presigned S3 URLs, and record numeric scores and feedback.

### Student (`student`)
- Self-register, log in, log out, and maintain authenticated sessions (HttpOnly JWT cookie).
- Browse available courses and enroll or unenroll.
- View and securely download course learning materials and assignment reference attachments via 5-minute S3 presigned URLs.
- Submit, replace, or delete ungraded assignment files (up to 15 MB) with optional notes.
- Track consolidated grades, submission statuses, and instructor feedback in Learning Records (`GET /api/records/me`).

### Out of Scope / Deferred (v1)
- Live video conferencing or streaming lectures
- Real-time chat rooms or threaded discussion forums
- Timed auto-graded multiple-choice quiz engine
- Tuition billing or online payment processing
- Native mobile apps (covered by responsive web design)
- Automated CI/CD pipelines beyond clean scripted Git-to-EC2 deployment

---

## 5. Technologies Used

| Layer | Implemented Stack & Tools |
|---|---|
| **Frontend** | React 18 (`^18.3.1`), TypeScript (`^5.6.3`), Vite (`^5.4.11`), Tailwind CSS (`^3.4.15`), React Router v6 (`^6.28.0`), `lucide-react` (inline SVG line icons) |
| **Backend** | Node.js 20 LTS / 24 LTS (ES Modules), Express.js (`^4.21.2`), `mysql2` (`mysql2/promise` parameterized SQL — no ORM), `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `multer` (15 MB memoryStorage), `bcryptjs`, `jsonwebtoken`, `cookie-parser`, `zod`, `cors`, `helmet`, `dotenv`, `morgan`; Testing: `vitest` + `supertest` |
| **Database** | Amazon RDS for MySQL 8.0 (`InnoDB`, `utf8mb4`, `utf8mb4_unicode_ci`) |
| **Cloud & Infra** | AWS (`ap-southeast-1` Singapore), Amazon VPC, Amazon EC2 (Ubuntu 24.04 LTS, `t2.micro` / `t3.micro`), Nginx reverse proxy, PM2 process manager, Amazon S3, AWS IAM |

---

## 6. Relational Database Overview (Amazon RDS — MySQL 8.0)

- **Database Name:** `ue_cloudlearn` (`InnoDB`, `utf8mb4_unicode_ci`)
- **SQL Transparency:** All database operations use `mysql2/promise` with explicit `?` parameterized SQL queries (`CREATE`, `INSERT`, `SELECT`, `UPDATE`, `DELETE`, `JOIN`) and no ORM.

| Table | Purpose | Key Constraints & Relationships |
|---|---|---|
| `users` | User accounts, hashed credentials, role (`admin`, `instructor`, `student`), and account status | `PRIMARY KEY (id)`, `UNIQUE (email)` |
| `courses` | Course catalog entries, terms, and assigned instructors | `PRIMARY KEY (id)`, `UNIQUE (course_code)`, `FK (instructor_id) -> users(id) ON DELETE RESTRICT` |
| `enrollments` | Student-to-course enrollment mapping and status (`active`, `completed`, `dropped`) | `PRIMARY KEY (id)`, `FK (student_id) -> users(id) ON DELETE CASCADE`, `FK (course_id) -> courses(id) ON DELETE CASCADE`, `UNIQUE (student_id, course_id)` |
| `materials` | Metadata and S3 object keys for course handouts (`materials/course-{id}/{uuid}-{name}`) | `PRIMARY KEY (id)`, `UNIQUE (s3_key)`, `FK (course_id) -> courses(id) ON DELETE CASCADE`, `FK (uploaded_by) -> users(id) ON DELETE RESTRICT` |
| `assignments` | Course tasks, due dates, max scores, and optional S3 attachment metadata | `PRIMARY KEY (id)`, `UNIQUE (attachment_s3_key)`, `CHECK (max_score > 0)`, `FK (course_id) -> courses(id) ON DELETE CASCADE`, `FK (created_by) -> users(id) ON DELETE RESTRICT` |
| `submissions` | Student file submissions, S3 object keys, scores, feedback, and grading timestamps | `PRIMARY KEY (id)`, `UNIQUE (s3_key)`, `UNIQUE (assignment_id, student_id)`, `FK (assignment_id) -> assignments(id) ON DELETE CASCADE`, `FK (student_id) -> users(id) ON DELETE CASCADE` |

---

## 7. AWS Cloud Infrastructure (`ap-southeast-1` — Free Tier Target)

```text
Internet / Browser
       │ HTTP (TCP 80) / HTTPS (TCP 443)
       ▼
[ Internet Gateway: ue-cloudlearn-igw ]
       │
┌──────┴────────────────────────────────────────────────────────────────┐
│ Amazon VPC: ue-cloudlearn-vpc (10.0.0.0/16)                           │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ Public Subnet: ue-cloudlearn-public-a (10.0.1.0/24, AZ-1a)      │  │
│  │ Route Table: 10.0.0.0/16 -> local, 0.0.0.0/0 -> igw             │  │
│  │                                                                 │  │
│  │  [ EC2: ue-cloudlearn-app-ec2 | SG: ue-cloudlearn-ec2-sg ]      │  │
│  │    - Ubuntu 24.04 LTS (t2.micro / t3.micro)                     │  │
│  │    - Nginx: serves frontend/dist (/), proxies /api/* -> :5000   │  │
│  │    - PM2: runs Express backend (backend/src/server.js)          │  │
│  │    - IAM Role: ue-cloudlearn-ec2-role (Instance Profile)        │  │
│  └───────────┬─────────────────────────────────────────┬───────────┘  │
│              │ TCP 3306 (SG-to-SG)                     │              │
│  ┌───────────▼──────────────────────────┐              │              │
│  │ Private Subnets (No NAT Gateway):    │              │              │
│  │  - ue-cloudlearn-private-a (10.0.2.0/24, AZ-1a)     │              │
│  │  - ue-cloudlearn-private-b (10.0.3.0/24, AZ-1b)     │              │
│  │                                      │              │              │
│  │  [ RDS MySQL 8.0: ue-cloudlearn-db ] │              │              │
│  │    - Single-AZ db.t3/t4g.micro       │              │              │
│  │    - PubliclyAccessible = No         │              │              │
│  │    - SG: ue-cloudlearn-rds-sg        │              │              │
│  └──────────────────────────────────────┘              │              │
└────────────────────────────────────────────────────────┼──────────────┘
                                                         │ HTTPS (TLS 443) via AWS SDK v3
                                                         ▼
                            [ Amazon S3: ue-cloudlearn-files-<unique-suffix> ]
                              - Block All Public Access = ON, SSE-S3 AES-256
                              - Prefixes: materials/, assignments/, submissions/
                              - Access: 5-min presigned GET URLs after auth check
```

| AWS Component | Planned Name / Configuration | Cost & Security Guardrail |
|---|---|---|
| **VPC** | `ue-cloudlearn-vpc` (`10.0.0.0/16`) | Custom isolated network with DNS hostnames & support enabled |
| **Subnets** | `ue-cloudlearn-public-a` (`10.0.1.0/24`), `ue-cloudlearn-private-a` (`10.0.2.0/24`), `ue-cloudlearn-private-b` (`10.0.3.0/24`) | 2 private AZs satisfy RDS DB Subnet Group; no NAT Gateway ($0 cost) |
| **Route Tables** | `ue-cloudlearn-public-rt` (`0.0.0.0/0 -> igw`), `ue-cloudlearn-private-rt` (`local` only) | Private subnets have zero direct internet route |
| **Security Groups** | `ue-cloudlearn-ec2-sg` (80/443 public, 22 `<ADMIN_IP>/32`); `ue-cloudlearn-rds-sg` (3306 from `ec2-sg` only) | Enforces least-privilege network ingress; RDS unreachable from internet |
| **Amazon EC2** | `ue-cloudlearn-app-ec2` (`t2.micro` or `t3.micro`, Ubuntu 24.04 LTS, 20 GB gp3) | AWS Free Tier; serves SPA via Nginx and API via PM2 |
| **Amazon RDS** | `ue-cloudlearn-db` (MySQL 8.0, `db.t3.micro` / `db.t4g.micro`, Single-AZ, 20 GB) | `PubliclyAccessible = No`; AWS Free Tier compliant |
| **Amazon S3** | `ue-cloudlearn-files-<unique-suffix>` (`ap-southeast-1`) | Block All Public Access = ON; SSE-S3 encryption; 5-min presigned URLs |
| **AWS IAM** | Role `ue-cloudlearn-ec2-role` + Policy `UECloudlearnEC2S3Policy` | Scoped only to `s3:PutObject`, `GetObject`, `DeleteObject`, `ListBucket` on project bucket |

> **Provisioning Note:** All AWS Free Tier resources are live and end-to-end verified in `ap-southeast-1` — live app at `http://54.255.186.17` (initial deployment screenshots were captured at `http://47.131.249.155` prior to the Free Tier stop/resume cycle), private RDS MySQL 8.0 (`ue-cloudlearn-db`), private S3 (`ue-cloudlearn-files-ccs4301-7dfd0a`), and IAM Instance Profile (`ue-cloudlearn-ec2-role`). Resource IDs and Pause/Resume commands are recorded in [`infra/aws-architecture-checklist.md`](infra/aws-architecture-checklist.md). Zero secrets or 12-digit AWS Account IDs are committed.

---

## 8. Repository Structure

```text
UE-Cloudlearn/
├── README.md                    # Project overview, local setup, and deployment entry point
├── .gitignore                   # Blocks .env, private keys, node_modules, dist, logs, dumps
├── .env.example                 # Sanitized environment variable template
├── database/                    # SQL scripts (MySQL 8.0 InnoDB)
│   ├── schema.sql               # CREATE DATABASE & 6 CREATE TABLE definitions
│   ├── seed.sql                 # Realistic sample records (placeholder password hashes)
│   └── sample_queries.sql       # Documented INSERT, SELECT, UPDATE, DELETE, JOIN demos
├── backend/                     # Express API, mysql2 services, S3 integration, Vitest suite
│   ├── package.json
│   ├── src/
│   │   ├── config/              # env.js, db.js (mysql2 pool), s3.js (AWS SDK v3 + presigner)
│   │   ├── middleware/          # auth.js, upload.js, validate.js, errorHandler.js
│   │   ├── routes/              # health, auth, users, courses, enrollments, materials, assignments, submissions, records
│   │   ├── controllers/
│   │   ├── services/            # Explicit parameterized SQL & S3 helpers
│   │   ├── scripts/seed-passwords.js
│   │   ├── app.js
│   │   └── server.js
│   └── tests/                   # 8 Vitest + Supertest suites (27 passing tests)
├── frontend/                    # React + Vite + Tailwind SPA (light/dark UE Crimson tokens)
│   ├── package.json
│   └── src/
│       ├── styles/tokens.css
│       ├── lib/                 # Typed fetch API client & formatters
│       ├── context/             # AuthContext, ThemeContext
│       ├── components/          # AppShell, ProtectedRoute, UI primitives
│       └── pages/               # Login, Register, Dashboard, Courses, CourseDetail, Submissions, Records, Users
├── infra/                       # AWS configs, IAM policies, Nginx, PM2, EC2 scripts, runbook
│   ├── aws-architecture-checklist.md
│   ├── iam/                     # ec2-trust-policy.json, ec2-s3-least-privilege-policy.json
│   ├── nginx/ue-cloudlearn.conf
│   ├── pm2/ecosystem.config.cjs
│   └── scripts/                 # ec2-bootstrap.sh, deploy.sh, verify-live.sh
├── docs/                        # Formal UE CCS4301 paper Chapters 1–6, references, appendices & screenshots
│   └── screenshots/
└── team-docs/                   # 7 individual member study & presentation packets
```

---

## 9. Setup & Running Instructions

### Prerequisites
- **Node.js** 20 LTS or 24 LTS (`npm` included)
- **Git**
- **MySQL 8.0** (local MySQL server for local dev, or Amazon RDS endpoint via EC2 for cloud deployment)
- **AWS CLI v2** configured for `ap-southeast-1` (required for local S3 testing; production EC2 uses `ue-cloudlearn-ec2-role`)

### 1. Environment Configuration
1. Copy `.env.example` to `.env` at the repository root (already ignored by `.gitignore`):
   ```bash
   cp .env.example .env
   ```
2. Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, a strong `JWT_SECRET` (minimum 16 characters; 64+ recommended), `CORS_ORIGIN`, `COOKIE_SECURE`, `AWS_REGION=ap-southeast-1`, `S3_BUCKET_NAME`, and `STORAGE_MODE=s3`.

### 2. Database Schema & Seed Activation
1. Load schema and initial sample records into MySQL 8.0:
   ```bash
   mysql -h <DB_HOST> -P 3306 -u <DB_USER> -p < database/schema.sql
   mysql -h <DB_HOST> -P 3306 -u <DB_USER> -p ue_cloudlearn < database/seed.sql
   ```
2. Activate seeded `@ue-cloudlearn.edu.ph` demo accounts (since `database/seed.sql` intentionally commits only `PENDING_BCRYPTJS_HASH_RUN_SEED_SCRIPT` rather than real passwords):
   ```bash
   cd backend
   npm ci
   SEED_DEMO_PASSWORD="ReplaceWithStrongDemoPassword" npm run seed:passwords
   ```

### 3. Backend API (Local Development & Automated Tests)
```bash
cd backend
npm install
npm test        # Runs Vitest + Supertest suite (27 tests)
npm run dev     # Starts Express API on http://localhost:5000 with --watch
```

### 4. Frontend SPA (Local Development & Production Build)
```bash
cd frontend
npm install
npm run dev     # Starts Vite dev server on http://localhost:5173 (proxies /api -> :5000)
npm run build   # Runs TypeScript check (tsc --noEmit) and builds frontend/dist/
```

### 5. AWS Free Tier Production Deployment (Live Verified)
Deployed in `ap-southeast-1` using the automation and checklist in `infra/`:
1. Provisioned VPC, subnets, route tables, security groups, private S3 bucket (`ue-cloudlearn-files-ccs4301-7dfd0a`), IAM role (`ue-cloudlearn-ec2-role`), private RDS MySQL 8.0 (`ue-cloudlearn-db`), and Ubuntu 24.04 EC2 (`i-0613bbaf4edddf9be`) per [`infra/aws-architecture-checklist.md`](infra/aws-architecture-checklist.md).
2. Bootstrapped EC2 (`infra/scripts/ec2-bootstrap.sh`), configured `/var/www/ue-cloudlearn/.env` (`chmod 600`, zero AWS keys), initialized RDS + `seed:passwords`, deployed via `infra/scripts/deploy.sh`, enabled `pm2-ubuntu` boot persistence, and verified via `infra/scripts/verify-live.sh`.
3. See [`infra/aws-architecture-checklist.md`](infra/aws-architecture-checklist.md) Section 5 for **Pause & Resume** commands between screenshots and the Nov 27 defense.
- **Live AWS Endpoint:** `http://54.255.186.17` (`http://54.255.186.17/api/health` — dynamic public IPv4 refreshes on EC2 stop/start without an Elastic IP; initial deployment screenshots were captured at `http://47.131.249.155`)

---

## 10. Security Notice

- **Zero Secrets in Git:** `.env`, `.env.*` (except `.env.example`), `.pem`/`.key`/`.ppk`/`.p12` files, `credentials.json`, `aws-credentials*`, `.aws/`, `node_modules/`, build outputs, and SQL backup dumps are strictly excluded via `.gitignore`. Never commit real passwords, JWT secrets, AWS Access Key IDs, Secret Access Keys, or personal AWS Account IDs.
- **IAM Instance Profile on EC2:** In production on Amazon EC2, the Express backend obtains temporary AWS credentials automatically from the attached `ue-cloudlearn-ec2-role` Instance Profile via the AWS SDK v3 default credential provider chain — permanent AWS keys are never stored on the server.
- **Private Data & Object Access:** Amazon RDS runs in private subnets with `PubliclyAccessible = No` and accepts TCP `3306` exclusively from `ue-cloudlearn-ec2-sg`. Amazon S3 enforces **Block All Public Access = ON** and serves files exclusively through authenticated 5-minute presigned GET URLs after JWT and course authorization checks.
