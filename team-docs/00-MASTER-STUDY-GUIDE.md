# Master Study Guide — UE Cloudlearn (Required for All 7 Members)

**Read this first!** During Part 4 of the **November 27, 2026** Final Presentation, Prof. Ryan Paul Obligar may ask **any** member to explain any part of UE Cloudlearn — not just their own assignment. Mastering this page prepares every member for cross-system technical questions.

---

## 1. Elevator Pitch (What Is UE Cloudlearn?)

**UE Cloudlearn** is a cloud-hosted **Online Learning and Course Management System** built for university classes (`CCS_4301 / CS1G`). It eliminates fragmented course handouts, unindexed assignment submissions, and manual grade tracking by unifying **Courses, Learning Materials, Enrollments, Assignments, Submissions, and Consolidated Learning Records** inside a single role-based web application hosted on **Amazon Web Services (AWS)** (`ap-southeast-1` Singapore) strictly within **AWS Free Tier** (`$0.00` target).

### Three User Roles (Enforced in Express Middleware & React Route Guards)
- **Administrator (`admin`):** Manages user accounts/roles (`GET/POST/PATCH/DELETE /api/users`), creates/deletes courses (`POST/DELETE /api/courses`), assigns/reassigns instructors, and monitors system-wide enrollments & submissions.
- **Instructor (`instructor`):** Edits assigned courses, inspects student rosters, uploads/edits/deletes learning materials in **Amazon S3** (`materials/course-{id}/...`), creates/edits/deletes assignments, downloads student submissions via 5-minute presigned GET URLs, and saves grades & feedback (`PATCH /api/submissions/:id/grade`).
- **Student (`student`):** Self-registers (`POST /api/auth/register`), logs in, browses and enrolls in courses, downloads learning materials/rubrics via 5-minute S3 presigned URLs, uploads/replaces/deletes ungraded submissions (`submissions/assignment-{id}/student-{id}/...`), and views consolidated grades & feedback in Learning Records (`GET /api/records/me`).

---

## 2. Live Deployed AWS Topology (`ap-southeast-1` — Memorize These Real IDs!)

```text
Student / Instructor / Admin Browser
        │
        │  1. HTTP :80 -> http://54.255.186.17 (resumed 2026-11-20; refreshes on Nov 26/27 restart)
        ▼
  Internet Gateway: ue-cloudlearn-igw (igw-0f79d6733305e4cd1)
        │
        ▼
  Public Subnet A: ue-cloudlearn-public-a (subnet-0b6a8f718c4fa638f · 10.0.1.0/24 · ap-southeast-1a)
  Route Table: ue-cloudlearn-public-rt (rtb-0d13cd600ecf44dbb -> 0.0.0.0/0 via IGW)
  ┌──────────────────────────────────────────────────────────────────────────────────┐
  │ Amazon EC2: ue-cloudlearn-app-ec2 (i-0613bbaf4edddf9be · t3.micro · Ubuntu 24.04)│
  │ Security Group: ue-cloudlearn-ec2-sg (sg-0ffdde6854196014f -> 80/443, 22 admin)  │
  │ IAM Role Attached: ue-cloudlearn-ec2-role (IMDSv2 -> UECloudlearnEC2S3Policy)    │
  │   • Nginx 1.24.0 serves React SPA (frontend/dist) & proxies /api/* -> :5000      │
  │   • PM2 7.1.2 runs Express REST API (backend/src/server.js · 35 endpoints)       │
  └──────────────────────────┬─────────────────────────────────────┬─────────────────┘
                             │ 2. Parameterized SQL (TCP 3306)     │ 3. AWS SDK v3 (HTTPS 443)
                             ▼                                     ▼
  Private Subnets A & B (10.0.2.0/24 & 10.0.3.0/24)     Amazon S3 Private Bucket
  Route Table: rtb-06e885a597a4dacf7 (local ONLY)       ue-cloudlearn-files-ccs4301-7dfd0a
  ┌────────────────────────────────────────────────┐    ┌───────────────────────────────────┐
  │ Amazon RDS: ue-cloudlearn-db (MySQL 8.0.46)    │    │ Block All Public Access: ON (4/4) │
  │ Class: db.t3.micro | Single-AZ | 20 GB gp2     │    │ Encryption: SSE-S3 AES256         │
  │ PubliclyAccessible: false (ETIMEDOUT outside)  │    │ Prefixes: materials/,             │
  │ SG: ue-cloudlearn-rds-sg (sg-06ac3f3f332f7b98a)│    │   assignments/, submissions/      │
  │ Rule: TCP 3306 ONLY from sg-0ffdde6854196014f │    └───────────────────────────────────┘
  └────────────────────────────────────────────────┘               ▲
        ▲                                                          │ 4. Browser downloads directly
        │  Metadata (file_name, s3_key, score, feedback)           │    via 5-min Presigned GET URL
        └──────────────────────────────────────────────────────────┘
```

---

## 3. Quick-Reference Live AWS & Codebase Cheat Sheet

| Item | Live Verified Value / Path |
|---|---|
| **AWS Region** | `ap-southeast-1` (Singapore) |
| **Live Web App URL** | `http://54.255.186.17` (`GET /api/health` -> `{"status":"ok","db":"connected"}`) *(resumed `2026-11-20`; initial screenshot capture at `http://47.131.249.155` — dynamic public IPv4 refreshes on EC2 stop/start; verify new IP on Nov 26/27 before presenting!)* |
| **GitHub Repository** | `https://github.com/rocumen/UE-Cloudlearn` |
| **VPC & Subnets** | `ue-cloudlearn-vpc` (`vpc-08e1bc74978acedfc`, `10.0.0.0/16`); Public-A `subnet-0b6a8f718c4fa638f` (`10.0.1.0/24`); Private-A `subnet-04f0f74b1e94dcb53` (`10.0.2.0/24`, `1a`); Private-B `subnet-09ad1b8fa7b8bbeea` (`10.0.3.0/24`, `1b`) |
| **IGW & Route Tables** | `igw-0f79d6733305e4cd1`; Public RT `rtb-0d13cd600ecf44dbb` (`0.0.0.0/0 -> igw`); Private RT `rtb-06e885a597a4dacf7` (`10.0.0.0/16 -> local` ONLY, zero NAT Gateway) |
| **Security Groups** | `ue-cloudlearn-ec2-sg` (`sg-0ffdde6854196014f`); `ue-cloudlearn-rds-sg` (`sg-06ac3f3f332f7b98a`, TCP `3306` ONLY from `sg-0ffdde6854196014f`) |
| **Amazon EC2 Host** | `ue-cloudlearn-app-ec2` (`i-0613bbaf4edddf9be`, `t3.micro`, Ubuntu 24.04 `ami-071c84f5b32b09602`, 20 GB `gp3` + 1 GB swap, private IP `10.0.1.57`, Nginx `1.24.0`, Node `v20.20.2`, PM2 `7.1.2`) |
| **Amazon RDS MySQL** | `ue-cloudlearn-db` (`db.t3.micro`, MySQL `8.0.46`, `20 GB gp2`, `PubliclyAccessible=false`, DB `ue_cloudlearn`, Subnet Group `ue-cloudlearn-rds-subnets`) |
| **RDS Endpoint** | `ue-cloudlearn-db.c9guuy4809t8.ap-southeast-1.rds.amazonaws.com:3306` |
| **Amazon S3 Bucket** | `ue-cloudlearn-files-ccs4301-7dfd0a` (Block Public Access ON, SSE-S3 `AES256`) |
| **AWS IAM Role & Policy** | Role/Profile `ue-cloudlearn-ec2-role` + Policy `UECloudlearnEC2S3Policy` (4 actions: `ListBucket`, `GetObject`, `PutObject`, `DeleteObject`) |
| **6 MySQL Tables** | `users`, `courses`, `enrollments`, `materials`, `assignments`, `submissions` (`database/schema.sql`) |
| **Seeded Demo Accounts** | Admin: `admin@ue-cloudlearn.edu.ph`; Instructors: `instructor.santos@ue-cloudlearn.edu.ph`, `instructor.reyes@ue-cloudlearn.edu.ph`; Students: `student.cruz@ue-cloudlearn.edu.ph`, `student.torres@ue-cloudlearn.edu.ph`, `student.mendoza@ue-cloudlearn.edu.ph` *(Passwords activated via runtime `seed:passwords`; never stored in Git)* |
| **Automated & Live Tests** | `27/27` Vitest + Supertest tests passing (`8` files); `15/15` UI/UX accessibility & theme audit PASS; `30/30` live Chapter 6 QA matrix PASS |

---

## 4. Top 15 Cross-System Questions Prof. Obligar May Ask ANY Member

1. **Why is Amazon RDS (`ue-cloudlearn-db`) placed in Private Subnets with `PubliclyAccessible = No`?**  
   *Answer:* To shield user credentials and student grades from the public internet. External connection attempts to port `3306` time out (`ETIMEDOUT`), and only EC2 inside `sg-0ffdde6854196014f` can connect to `sg-06ac3f3f332f7b98a`.
2. **Why did you need TWO private subnets (`subnet-04f0f74b1e94dcb53` and `subnet-09ad1b8fa7b8bbeea`) for a Single-AZ RDS instance?**  
   *Answer:* Amazon RDS requires a DB Subnet Group (`ue-cloudlearn-rds-subnets`) covering at least two distinct Availability Zones (`ap-southeast-1a` and `ap-southeast-1b`), even for a Single-AZ Free Tier `db.t3.micro` deployment.
3. **Why didn't you add a NAT Gateway to the private route table (`rtb-06e885a597a4dacf7`)?**  
   *Answer:* RDS only responds to internal VPC SQL traffic from EC2 and never needs outbound internet access, and NAT Gateways incur hourly + data processing fees outside Free Tier. Keeping `rtb-06e885a597a4dacf7` local-only guarantees both `$0` routing cost and complete internet isolation.
4. **Why store files in Amazon S3 (`ue-cloudlearn-files-ccs4301-7dfd0a`) instead of inside MySQL or on the EC2 disk?**  
   *Answer:* Storing large PDFs/ZIPs as MySQL BLOBs bloats database backups and slows queries, while EC2 EBS local disk does not decouple compute from storage. S3 stores durable binary objects with `AES256` encryption while RDS holds lightweight metadata (`file_name`, `s3_key`, `mime_type`, `file_size`).
5. **How does the app serve files securely if S3 Block All Public Access is ON?**  
   *Answer:* Direct S3 URLs return `HTTP 403 AccessDenied`. When an authorized user clicks Download, Express verifies their JWT (`ue_cloudlearn_token`) and course enrollment/ownership in RDS, then generates a short-lived **300-second (5-minute) S3 presigned GET URL** via `getSignedUrl()` in `backend/src/config/s3.js`.
6. **How does EC2 authenticate to Amazon S3 without placing `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` in `.env`?**  
   *Answer:* We attached IAM Instance Profile `ue-cloudlearn-ec2-role` (`UECloudlearnEC2S3Policy`) to EC2 `i-0613bbaf4edddf9be`. AWS SDK v3 automatically uses the default credential provider chain to pull temporary, rotated credentials from EC2 Instance Metadata (`IMDSv2`).
7. **What happens if a student requests `GET /api/users` or tries to upload a material via `curl`?**  
   *Answer:* Express middleware (`requireAuth` + `requireRole('admin')` or `requireCourseWriteAccess`) rejects the request on the server with `HTTP 403 Forbidden`, regardless of the React frontend.
8. **How do you prevent SQL injection without using an ORM like Prisma or Sequelize?**  
   *Answer:* Every query in `backend/src/services/*.js` uses `mysql2/promise` `db.execute(sql, params)` with explicit `?` placeholders alongside `zod` input validation (`backend/src/middleware/validate.js`), keeping every `CREATE`, `INSERT`, `SELECT`, `UPDATE`, `DELETE`, and `JOIN` auditable for Chapter 4.4.
9. **What happens in AWS when an instructor deletes a material or a student deletes an ungraded submission?**  
   *Answer:* The controller checks authorization (`409 ALREADY_GRADED` blocks students from deleting graded work), deletes the row from Amazon RDS, and invokes `storage.deleteObject({ key })` on Amazon S3 (`DeleteObjectCommand`) so no orphaned objects remain.
10. **Why is Nginx running on port `80` in front of Express on port `5000`?**  
    *Answer:* Nginx (`infra/nginx/ue-cloudlearn.conf`) serves static `frontend/dist` bundles efficiently (`1y` cache on `/assets/`), enforces `client_max_body_size 16M` for 15 MB uploads, and reverse-proxies `/api/*` to Express (`127.0.0.1:5000`) on the same origin, avoiding CORS complexity and saving Free Tier RAM.
11. **Why is `COOKIE_SECURE=false` set in EC2 `.env`, and is the JWT cookie still safe from JavaScript access?**  
    *Answer:* Because the class demo runs over plain HTTP (`http://<EC2_PUBLIC_IP>`) without a TLS domain, `Secure=true` would cause browsers to drop the cookie (controlled by the configurable `COOKIE_SECURE` `.env` variable). Meanwhile, `HttpOnly: true` blocks `document.cookie` XSS access and `SameSite: 'lax'` mitigates CSRF.
12. **Why did `ec2-bootstrap.sh` create a 1 GB `/swapfile` on `t3.micro`?**  
    *Answer:* A `t3.micro` instance has 1 GiB physical RAM, so `tsc --noEmit && vite build` can exhaust memory without swap. Pairing the 1 GB `/swapfile` with `NODE_OPTIONS="--max-old-space-size=768"` enabled the production frontend build to finish cleanly in `5.42s`.
13. **Why does `database/seed.sql` contain `PENDING_BCRYPTJS_HASH_RUN_SEED_SCRIPT` instead of real password hashes?**  
    *Answer:* Our seed password hygiene policy keeps reusable demo passwords and crackable hashes out of public Git. Operators activate demo accounts at runtime via `SEED_DEMO_PASSWORD="..." npm run seed:passwords`, which hashes with `bcryptjs` (10 rounds).
14. **Explain how `GET /api/records/me` computes a student's Learning Records and average score.**  
    *Answer:* `getStudentLearningRecords` in `backend/src/services/records.service.js` executes a 4-table parameterized `JOIN` (`enrollments -> courses -> users` + `LEFT JOIN assignments -> submissions`), maps unsubmitted items to `'not_submitted'`, and computes per-course and overall percentage averages across graded/returned items.
15. **How did your team conserve Free Tier hours before November 27 without losing data?**  
    *Answer:* Per `infra/aws-architecture-checklist.md` Section 5 (Free Tier pause-and-resume strategy), stopping EC2 and RDS pauses compute billing while keeping EBS volumes, RDS tables, and S3 objects intact. Upon resuming (verified `2026-11-20` at `54.255.186.17`), only the new dynamic EC2 public IPv4 needs updating in `CORS_ORIGIN` inside `.env` followed by `pm2 restart ue-cloudlearn-api --update-env`.

---

## 5. Pre-Presentation Verification Checklist (Run 30 Minutes Before Demo!)

- [ ] **Start & Verify AWS:** Confirm `ue-cloudlearn-db` is `Available` and `ue-cloudlearn-app-ec2` (`i-0613bbaf4edddf9be`) is `running` in `ap-southeast-1`.
- [ ] **Verify Public IP & Health:** If EC2 was stopped/restarted, fetch new Public IP, update `CORS_ORIGIN` in `/var/www/ue-cloudlearn/.env`, restart PM2, and run `bash /var/www/ue-cloudlearn/infra/scripts/verify-live.sh` (`ALL LIVE CHECKS PASSED.`).
- [ ] **Open Browser Tabs Cleanly:** App URL, AWS Console (`VPC Resource Map`, `Security Groups`, `RDS`, `S3`, `IAM`, `EC2`), and `https://github.com/rocumen/UE-Cloudlearn`.
- [ ] **NEVER expose secrets on projector:** NEVER `cat .env`, reveal `DB_PASSWORD`, reveal `JWT_SECRET`, or display `.pem` private key files on screen.
- [ ] **Keep 1 sample PDF file (`<= 1 MB`) ready on Desktop** for Part 3 live upload demonstration!
