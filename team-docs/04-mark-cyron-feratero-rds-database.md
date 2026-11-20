# Study & Presentation Packet 04 — Mark Cyron Feratero

**Role:** Database & Amazon RDS Lead (`database/`)  
**Project:** UE Cloudlearn (`CCS_4301 / CS1G` — First Semester 2026–2027)  
**Presentation Date:** November 27, 2026  
**Also Study:** `team-docs/00-MASTER-STUDY-GUIDE.md` (mandatory for Part 4 Q&A)

---

## 1. Your Project Responsibilities

- Own the **3NF relational database design (ERD)**, constraints, indexes, and standalone MySQL 8.0 SQL scripts (`database/schema.sql`, `database/seed.sql`, `database/sample_queries.sql`).
- Own **Amazon RDS for MySQL 8.0.46** (`ue-cloudlearn-db`), DB Subnet Group (`ue-cloudlearn-rds-subnets` across Private Subnets A & B), connectivity verification from EC2, and SQL CRUD/`JOIN` verification.
- Lead the **Part 2 Amazon RDS Console & Live SQL Tables/Records Demo** and prove real-time relational persistence during Mark Costin's **Part 3 Live Integration Demo**.

## 2. Your Assigned Formal Paper Sections (`docs/`)

- **Chapter 2.7 (`docs/02-chapter-2-analysis-design.md`):** Normalization (1NF–3NF), Mermaid ERD (`Figure 2.12`), and Complete 6-Table Data Dictionary (`Tables 2.6`–`2.12`).
- **Chapter 4 (`docs/04-chapter-4-database.md`, Sections 4.1–4.6):** RDS Environment (`Table 4.1`, `Figure 4.1`), Database Creation, Table Structures (`Table 4.2`), SQL Implementation (`CREATE`, `INSERT`, `SELECT`, `UPDATE`, `DELETE`, `JOIN`, `Table 4.3`), `db.js` Connectivity, and Live RDS Testing (`Table 4.4`, `Figures 4.2`–`4.3`).
- **Chapter 5.6 (`docs/05-chapter-5-aws-infrastructure.md`):** Amazon RDS Configuration (`Table 5.6`, `Figure 5.8`).
- **Appendix A (`docs/08-appendices.md`):** Database SQL Scripts documentation.

## 3. Your GitHub & Verification Checklist

- [x] `database/schema.sql` (6 InnoDB tables, `utf8mb4_unicode_ci`, 9 named FKs, 2 named `CHECK` constraints, 6 indexes).
- [x] `database/seed.sql` (idempotent `INSERT IGNORE INTO`: 6 users, 3 courses, 7 enrollments, 4 materials, 4 assignments, 4 submissions).
- [x] `database/sample_queries.sql` (Chapter 4.4 evidence queries across Schema Inspection, CRUD, and 3 Multi-Table `JOIN`s).
- [x] Verified live against private Amazon RDS `ue-cloudlearn-db` (`SHOW TABLES`, counts, Section 6 `JOIN`s `6a`–`6c`).
- [x] Captured live RDS Console screenshot (`docs/screenshots/aws-04-rds-instance.png`).

## 4. Your Live Presentation Script (Part 2 & Part 3 Support — 3–4 mins)

1. **Part 2 — Amazon RDS Console Walkthrough (2 mins):**
   - Open AWS Console (`ap-southeast-1`) -> **RDS -> Databases -> `ue-cloudlearn-db`**.
   - Show **Engine:** `MySQL 8.0.46`, **Class:** `db.t3.micro` (20 GB `gp2`, Single-AZ Free Tier).
   - Open **Connectivity & security** tab -> point out:
     - **Endpoint:** `ue-cloudlearn-db.c9guuy4809t8.ap-southeast-1.rds.amazonaws.com:3306`
     - **Publicly accessible:** **`No`**
     - **VPC:** `ue-cloudlearn-vpc` (`vpc-08e1bc74978acedfc`)
     - **DB subnet group:** `ue-cloudlearn-rds-subnets` (`subnet-04f0f74b1e94dcb53` in `1a` + `subnet-09ad1b8fa7b8bbeea` in `1b`)
     - **VPC security groups:** `ue-cloudlearn-rds-sg` (`sg-06ac3f3f332f7b98a`)
2. **Live MySQL Tables & `JOIN` Records Proof from EC2 SSH (1.5 mins):**
   - Connect inside the already-open EC2 SSH session (never typing passwords into tracked files or echoing `.env`!):
     ```bash
     mysql -h ue-cloudlearn-db.c9guuy4809t8.ap-southeast-1.rds.amazonaws.com -P 3306 -u ue_cloudlearn_app -p ue_cloudlearn
     ```
   - Run live SQL proofs:
     ```sql
     SHOW TABLES;
     SELECT 'users' AS tbl, COUNT(*) AS cnt FROM users
     UNION ALL SELECT 'courses', COUNT(*) FROM courses
     UNION ALL SELECT 'enrollments', COUNT(*) FROM enrollments
     UNION ALL SELECT 'materials', COUNT(*) FROM materials
     UNION ALL SELECT 'assignments', COUNT(*) FROM assignments
     UNION ALL SELECT 'submissions', COUNT(*) FROM submissions;
     ```
   - Run Query `6b` (Student 4 Learning Records 4-table `JOIN`) or `SELECT id, course_id, title, s3_key, created_at FROM materials ORDER BY id DESC LIMIT 5;`.
3. **Part 3 Live Persistence Proof:**
   - Immediately after **Mark Costin** uploads a new material or submits an assignment in the browser, re-run `SELECT id, title, file_name, s3_key, created_at FROM materials ORDER BY id DESC LIMIT 3;` (or `submissions`) so Prof. Obligar observes the exact new row saved in RDS live!

## 5. Role-Specific Q&A Practice

- **Q: Explain the relationships across your 6 tables.**  
  *A:* `users` has 1-to-many links to `courses` (`instructor_id`), `materials` (`uploaded_by`), `assignments` (`created_by`), and `submissions` (`student_id`). `enrollments` resolves the many-to-many relationship between students and courses with `UNIQUE KEY uq_enrollment (student_id, course_id)`. `submissions` enforces `UNIQUE KEY uq_submission (assignment_id, student_id)` so resubmissions update one active submission cleanly.
- **Q: Why did you choose `ON DELETE RESTRICT` on `courses.instructor_id` vs. `ON DELETE CASCADE` on `enrollments`?**  
  *A:* Deleting a course should cleanly cascade-delete its enrollments, materials, and assignments (`ON DELETE CASCADE`) without orphan rows. Deleting an instructor who still owns active courses or uploaded materials is blocked (`ON DELETE RESTRICT`, handled in `user.service.js` as `409 USER_IN_USE`) so courses aren't accidentally wiped before reassigning an instructor.
- **Q: Why didn't you use Prisma, Sequelize, or TypeORM?**  
  *A:* Using `mysql2/promise` with explicit `?` parameterized SQL (`backend/src/services/*.js`) makes every `CREATE`, `INSERT`, `SELECT`, `UPDATE`, `DELETE`, and `JOIN` readable and verifiable for CCS4301 Chapter 4.4 while giving 100% SQL injection protection alongside Zod validation.
- **Q: How does Express maintain fast, safe connections to RDS?**  
  *A:* `backend/src/config/db.js` configures `mysql.createPool` with `connectionLimit: 10`, `charset: 'utf8mb4'`, and `decimalNumbers: true`, reusing pooled TCP connections over `sg-06ac3f3f332f7b98a:3306` instead of reconnecting per HTTP request.

## 6. Live Project Evidence Index

- **SQL Scripts:** `database/schema.sql`, `database/seed.sql`, `database/sample_queries.sql` (`backend/src/config/db.js`, `backend/src/services/*.js`)
- **Live RDS Instance:** `ue-cloudlearn-db` (`MySQL 8.0.46`, `db.t3.micro`, `20 GB gp2`, `PubliclyAccessible=false`)
- **RDS Endpoint:** `ue-cloudlearn-db.c9guuy4809t8.ap-southeast-1.rds.amazonaws.com:3306`
- **Live Verified RDS Counts:** `6` tables (`users=6`, `courses=3`, `enrollments=7`, `materials=5` post-E2E upload, `assignments=4`, `submissions=5` post-E2E upload); external `:3306` connection blocked (`ETIMEDOUT`)
- **Console Screenshot:** `docs/screenshots/aws-04-rds-instance.png`
