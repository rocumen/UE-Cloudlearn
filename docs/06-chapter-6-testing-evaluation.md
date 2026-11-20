# CHAPTER 6: SYSTEM TESTING AND EVALUATION

## 6.1 Testing Methodology

System quality assurance followed a three-tier verification methodology designed to verify code correctness locally, enforce strict UI/UX accessibility compliance, and validate every cloud boundary against live AWS Free Tier services (`ap-southeast-1`). Table 6.1 summarizes the three testing stages, and Table 6.2 records the complete automated Vitest + Supertest suite output (`27/27` tests passing across 8 test suites).

**Table 6.1**  
*Testing Levels, Scope, and Verification Environments*

| Testing Tier | Tooling & Harness | Scope Verified |
|---|---|---|
| **1. Automated Backend Unit & API Integration Tests** | `Vitest v3.0.7` + `Supertest v7.0.0` + `mockDb.js` + `mockStorage.js` | Health ping, Auth JWT cookies/Bearer, RBAC guards, Admin Users CRUD, Courses/Enrollments, 15 MB/MIME validation, S3 rollback, Submissions/Grading bounds, SQL `JOIN` records (`27/27` PASS) |
| **2. Frontend Static Build & 15-Point UI Compliance Audit** | `tsc --noEmit`, `vite build`, Node regex/hit-area audits | Zero TypeScript errors, clean production bundle, zero emojis, zero uppercase classes, zero stray hex colors, `>= 44x44px` interactive controls across all 35 frontend source files (`15/15` PASS) |
| **3. Live AWS Cloud End-to-End Verification** | Live EC2 (`http://47.131.249.155` initial / `http://54.255.186.17` post-resume), SSH, `mysql-client`, `aws-cli`, browser | Live EC2 Nginx+PM2, RDS MySQL `8.0.46` DDL/seed/JOINs, S3 upload/presigned `200`/direct `403`, EC2 IMDSv2 IAM role, external port `3306` `ETIMEDOUT`, all 23 live screenshots |

**Table 6.2**  
*Automated Backend Vitest + Supertest Suite Summary (`27/27` Passing Tests Across 8 Suites)*

| Test File (`backend/tests/`) | Test Count | Verified Behaviors | Outcome |
|---|---|---|---|
| `health.test.js` | 3 | `GET /api/health` (`200`), DB failure (`503 DB_UNAVAILABLE`), unknown route (`404 NOT_FOUND`) | **PASS (3/3)** |
| `auth.test.js` | 5 | Student registration (`201`, lowercase email, forced `student` role, `HttpOnly` cookie), duplicate email (`409`), Zod/JSON `400`, login (`200`/`401`/`403`), logout & Bearer fallback | **PASS (5/5)** |
| `users.test.js` | 5 | Admin-only RBAC (`401`/`403`), `GET /api/users?role=`, `POST /api/users` (`201`/`409`), `PATCH` self-modify block (`400`), `DELETE` self-delete & FK `409 USER_IN_USE` | **PASS (5/5)** |
| `seed-passwords.test.js` | 2 | `SEED_DEMO_PASSWORD` length validation (`>= 8`), `bcryptjs` hashing scoped strictly to `%@ue-cloudlearn.edu.ph` | **PASS (2/2)** |
| `s3.test.js` | 2 | `sanitizeFileName`, S3 key builders (`materials/`, `assignments/`, `submissions/`), `PutObjectCommand` / `DeleteObjectCommand` | **PASS (2/2)** |
| `courses-enrollments.test.js` | 5 | Search & scope filtering, detail counts, Admin/Instructor write guards, S3 cascade on delete, student enroll/reactivate/drop, roster authorization | **PASS (5/5)** |
| `materials-assignments.test.js` | 3 | 15 MB & MIME rejection (`400`), S3 rollback on DB insert failure, material & assignment CRUD, replacement cleanup, 300s presigned downloads | **PASS (3/3)** |
| `submissions-records.test.js` | 2 | Enrolled submission upload/replace, `409 ALREADY_GRADED` lock, staff filters, `0..maxScore` grading bounds, `GET /api/records/me` SQL `JOIN`, dashboard KPIs | **PASS (2/2)** |

---

## 6.2 Functional Testing

Functional testing verified every user workflow across both automated Supertest assertions and live browser interaction on `http://47.131.249.155` (and confirmed post-resume on `http://54.255.186.17`). Public registration created student accounts while ignoring any injected role property; login verified `bcryptjs` hashes and issued `ue_cloudlearn_token` cookies; Admin user management enforced role creation, active/inactive toggles, and self-deletion guards; course creation and enrollment workflows correctly updated course counts and prevented duplicate enrollments; and instructor grading validated numeric bounds (`0 <= score <= maxScore`) while locking graded student submissions (`409 ALREADY_GRADED`) against unapproved overwrites or deletions. All 15 items of the UI/UX accessibility and theme compliance checklist passed across light and dark modes.

---

## 6.3 Database Testing

Database verification executed directly on private Amazon RDS (`ue-cloudlearn-db`, MySQL `8.0.46`) via the authorized EC2 host during live deployment verification. Running `SHOW TABLES;` confirmed all six expected InnoDB tables (`assignments`, `courses`, `enrollments`, `materials`, `submissions`, `users`). Initial seed execution inserted 6 users, 3 courses, 7 enrollments, 4 materials, 4 assignments, and 4 submissions, and `npm run seed:passwords` cleanly activated all 6 `@ue-cloudlearn.edu.ph` accounts. Live execution of `database/sample_queries.sql` Section 6 `JOIN` queries verified multi-table aggregation across courses, active students, assignments, and grades. Live HTTP writes (`POST /api/courses/1/materials` and `POST /api/assignments/4/submissions`) persisted new rows (`id=5`) that immediately updated student summary counts returned by `GET /api/records/me` (`enrolledCoursesCount: 3`, `totalAssignments: 4`, `submittedCount: 2`, `gradedCount: 1`, `averagePercent: 95`).

---

## 6.4 Cloud Storage Testing

Live Amazon S3 testing verified object security and lifecycle synchronization against bucket `ue-cloudlearn-files-ccs4301-7dfd0a`:

1. **Authenticated Upload via EC2 IAM Role:** Logging in as `instructor.santos@ue-cloudlearn.edu.ph` and posting a valid PDF to `POST /api/courses/1/materials` returned `HTTP 201`, storing `materials/course-1/ffe53225-2ab6-4e7b-b3b7-0e738e637433-ccs4301-live-s3-handout.pdf` in S3 without any static AWS keys on EC2. Student submission `POST /api/assignments/4/submissions` similarly returned `HTTP 201`, storing `submissions/assignment-4/student-4/bc7e3329-6dd0-433d-a6b3-f2690e1f5440-cruz-assignment-4-live.pdf`.
2. **Presigned URL Retrieval (`200 OK`):** Calling `GET /api/materials/5/download` as an authorized user returned a 300-second presigned URL; fetching that signed URL returned `HTTP 200` (`568` bytes, valid `%PDF-1.4` header).
3. **Public Access Denial (`403 AccessDenied`):** Requesting the raw S3 object URL directly (`https://ue-cloudlearn-files-ccs4301-7dfd0a.s3.ap-southeast-1.amazonaws.com/materials/course-1/...`) without a signature immediately returned `HTTP 403` (`AccessDenied`), confirming Block All Public Access enforcement.
4. **File Validation & Rollback:** Disallowed extensions/MIMEs (`400 INVALID_FILE_TYPE`), files over 15 MB (`400 FILE_TOO_LARGE`), and simulated RDS insert failures (triggering `storage.deleteObject` rollback) passed cleanly in `materials-assignments.test.js`.

---

## 6.5 Network and Security Testing

Network, identity, and authorization controls underwent five live security tests on the deployed AWS infrastructure:

1. **Private RDS Isolation Test:** Attempting a direct TCP connection on port `3306` from an external Windows workstation outside `ue-cloudlearn-vpc` to `ue-cloudlearn-db.c9guuy4809t8.ap-southeast-1.rds.amazonaws.com:3306` failed with `BLOCKED (ETIMEDOUT (5000ms))`, proving both private subnet isolation (`PubliclyAccessible = false`) and `ue-cloudlearn-rds-sg` enforcement.
2. **RBAC Privilege Escalation Test:** Authenticating as student `student.cruz@ue-cloudlearn.edu.ph` and requesting `GET /api/users` returned `HTTP 403 Forbidden`, while unauthenticated requests to protected endpoints returned `HTTP 401 Unauthorized`.
3. **IMDSv2 IAM Role Verification:** Running `infra/scripts/verify-live.sh` on EC2 retrieved an IMDSv2 token and verified `ue-cloudlearn-ec2-role` attachment without requesting or logging temporary credentials, while `/var/www/ue-cloudlearn/.env` contained zero AWS keys.
4. **S3 Direct Object Block:** Direct unauthenticated HTTP requests to S3 object URLs returned `HTTP 403 AccessDenied`.
5. **Parameterized SQL & Secret Hygiene Verification:** Static scans confirmed `100%` `?`-parameterized `mysql2/promise` queries and zero leaked secrets in Git.

---

## 6.6 Integration Testing

End-to-end integration verified seamless data flow across all tiers (`Browser -> IGW -> EC2 Nginx (:80) -> Express PM2 (:5000) -> RDS (:3306) & S3 (:443)`):

1. `GET http://47.131.249.155/` delivered the production React SPA (`HTTP 200`, `html_len=673`), while `GET http://47.131.249.155/api/health` returned `HTTP 200` (`{"status":"ok","db":"connected"}`).
2. Instructor login issued the `HttpOnly` cookie, uploaded a PDF to S3 via EC2 IAM Role, persisted metadata in RDS, and verified the object via `aws s3 ls s3://ue-cloudlearn-files-ccs4301-7dfd0a/ --recursive`.
3. Student login (`student.cruz@ue-cloudlearn.edu.ph`) verified presigned download (`200`), uploaded an assignment submission PDF (`201`), verified `GET /api/records/me` SQL `JOIN` aggregation (`200`), and confirmed RBAC rejection on `/api/users` (`403`).
4. Admin login (`admin@ue-cloudlearn.edu.ph`) retrieved all `6` users via `GET /api/users` (`200`).

---

## 6.7 Testing Results and Discussion

Table 6.3 consolidates all 30 functional, database, cloud storage, network/security, and integration test cases executed across the project, achieving a **30/30 (100%) PASS** rate. Table 6.4 documents real technical issues encountered during implementation and cloud provisioning alongside their verified root-cause resolutions.

**Table 6.3**  
*Complete End-to-End System Testing and Evaluation Matrix*

| Test ID | Category | Test Case Description | Expected Result | Actual Result (Verified Evidence) | Status |
|---|---|---|---|---|---|
| **TC-FUNC-01** | Functional | Student self-registration (`POST /api/auth/register`) | Creates active `student`, ignores elevated role, sets `HttpOnly` cookie (`201`) | Created `student` user, `password_hash` omitted, `ue_cloudlearn_token` cookie set (`201`) | **PASS** |
| **TC-FUNC-02** | Functional | Duplicate email registration | Rejects duplicate email (`409 EMAIL_ALREADY_EXISTS`) | Returned `409` JSON error envelope without creating row | **PASS** |
| **TC-FUNC-03** | Functional | User login (`POST /api/auth/login`) with valid credentials | Authenticates via `bcryptjs`, sets JWT cookie (`200`) | Returned `200` with user payload and `HttpOnly; SameSite=Lax` cookie on EC2 | **PASS** |
| **TC-FUNC-04** | Functional | Login with invalid password or placeholder hash | Rejects credentials (`401 INVALID_CREDENTIALS`) | Returned `401` with friendly message `"Incorrect email or password. Try again."` | **PASS** |
| **TC-FUNC-05** | Functional | Login with `inactive` account status | Blocks access (`403 ACCOUNT_INACTIVE`) | Returned `403 ACCOUNT_INACTIVE` during login and active-session `requireAuth` check | **PASS** |
| **TC-FUNC-06** | Functional | Admin list & filter users (`GET /api/users?role=instructor`) | Returns filtered user list (`200`) | Returned `200` (`6` total seeded users; filtered by role cleanly) | **PASS** |
| **TC-FUNC-07** | Functional | Admin self-demotion / self-delete prevention | Rejects self-modification (`400`) | Returned `400 SELF_MODIFY_FORBIDDEN` and `400 SELF_DELETE_FORBIDDEN` | **PASS** |
| **TC-FUNC-08** | Functional | Course creation (`POST /api/courses`) with active instructor | Persists course with uppercase `courseCode` (`201`) | Created course and returned detail with instructor name (`201`) | **PASS** |
| **TC-FUNC-09** | Functional | Student course enrollment & duplicate check | Enrolls (`201`); repeat returns `409 ALREADY_ENROLLED` | Initial enroll returned `201`; duplicate rejected `409`; dropped row reactivated cleanly | **PASS** |
| **TC-FUNC-10** | Functional | Assignment creation (`POST /api/courses/:id/assignments`) | Validates `dueDate`, `maxScore > 0`, optional S3 file (`201`) | Created assignment (`201`) and linked optional attachment key | **PASS** |
| **TC-FUNC-11** | Functional | Student submission replacement before grading | Replaces RDS file metadata and deletes prior S3 object (`200`) | Updated `submissions` row (`200`) and invoked `deleteObject` on old `s3_key` | **PASS** |
| **TC-FUNC-12** | Functional | Student update/delete attempt after grading | Blocks modification (`409 ALREADY_GRADED`) | Both `POST` replace and `DELETE` rejected with `409 ALREADY_GRADED` | **PASS** |
| **TC-FUNC-13** | Functional | Instructor grading validation (`0 <= score <= maxScore`) | Rejects `score > maxScore` (`400`); saves valid score (`200`) | Out-of-bounds rejected `400`; valid score set `status='graded'` & `graded_at` | **PASS** |
| **TC-DB-01** | Database | RDS schema initialization (`database/schema.sql`) | Creates `ue_cloudlearn` and 6 InnoDB tables (`SHOW TABLES`) | `SHOW TABLES;` on `ue-cloudlearn-db` confirmed all 6 tables | **PASS** |
| **TC-DB-02** | Database | Seed script & `seed:passwords` activation | Inserts 6 users, 3 courses, 7 enrollments, 4 materials/asg/sub; updates 6 hashes | Live counts verified (`6/3/7/4/4/4`); `seed:passwords` updated `6` accounts | **PASS** |
| **TC-DB-03** | Database | Foreign key `ON DELETE RESTRICT` check | Blocks deleting user referenced by course/material (`409 USER_IN_USE`) | Triggered `ER_ROW_IS_REFERENCED_2` mapped cleanly to `409 USER_IN_USE` | **PASS** |
| **TC-DB-04** | Database | Multi-table `JOIN` learning records (`GET /api/records/me`) | Aggregates courses, assignments, submissions, averages (`200`) | Live RDS returned `courses=3`, `totalAssignments=4`, `submittedCount=2`, `averagePercent=95` | **PASS** |
| **TC-S3-01** | Cloud Storage | Instructor learning material upload to S3 (`POST .../materials`) | Uploads PDF to `materials/course-{id}/...` & inserts RDS row (`201`) | Live HTTP `201` (`id=5`); `aws s3 ls` confirmed PDF object in `ue-cloudlearn-files-ccs4301-7dfd0a` | **PASS** |
| **TC-S3-02** | Cloud Storage | Student assignment upload to S3 (`POST .../submissions`) | Uploads PDF to `submissions/assignment-{id}/student-{id}/...` (`201`) | Live HTTP `201` (`id=5`); `aws s3 ls` confirmed submission PDF in S3 | **PASS** |
| **TC-S3-03** | Cloud Storage | Authenticated 5-minute presigned GET download | Returns signed URL (`200`); GET yields original PDF bytes | Presigned download returned `HTTP 200` (`568` bytes, `%PDF-1.4` header verified) | **PASS** |
| **TC-S3-04** | Cloud Storage | Direct S3 object URL access without presignature | Denied by Block All Public Access (`403 AccessDenied`) | Direct HTTPS request to S3 URL returned `HTTP 403 AccessDenied` | **PASS** |
| **TC-S3-05** | Cloud Storage | Upload MIME/extension & 15 MB ceiling enforcement | Rejects invalid MIME or `> 15 MB` (`400`) | Returned `400 INVALID_FILE_TYPE` and `400 FILE_TOO_LARGE` before touching S3 | **PASS** |
| **TC-S3-06** | Cloud Storage | Coordinated delete & S3 rollback on DB insert failure | Deletes S3 object on delete or DB insert error | Verified `storage.deleteObject` executed on course/material delete and DB failure rollback | **PASS** |
| **TC-SEC-01** | Network/Security | External direct TCP connection to RDS port `3306` | Blocked by private subnet & `ue-cloudlearn-rds-sg` (`ETIMEDOUT`) | Workstation connection to RDS endpoint `:3306` returned `BLOCKED (ETIMEDOUT (5000ms))` | **PASS** |
| **TC-SEC-02** | Network/Security | Role privilege escalation test (`student` -> `GET /api/users`) | Rejects unauthorized role (`403 FORBIDDEN`) | Live EC2 test with student cookie returned `HTTP 403` | **PASS** |
| **TC-SEC-03** | Network/Security | Unauthenticated protected API access | Rejects missing/invalid JWT (`401 UNAUTHORIZED`) | Verified `401` across protected routes and expired/malformed tokens | **PASS** |
| **TC-SEC-04** | Network/Security | EC2 IAM Instance Profile & IMDSv2 verification | `ue-cloudlearn-ec2-role` attached; zero AWS keys in `.env` | `verify-live.sh` confirmed `IAM Instance Profile role attached: ue-cloudlearn-ec2-role` | **PASS** |
| **TC-INT-01** | Integration | Public SPA serving & Nginx reverse-proxy health check | `/` returns HTML `200`; `/api/health` returns `db: "connected"` | `GET http://47.131.249.155/` `HTTP 200`; `/api/health` `{"status":"ok","db":"connected"}` | **PASS** |
| **TC-INT-02** | Integration | Production frontend build & 15-point UI/UX accessibility audit | `tsc --noEmit && vite build` exits `0`; zero emoji/uppercase/hex violations | Built cleanly on EC2 in `5.42s`; `AUDIT_HITS: {"emoji":[],"uppercase":[],"strayHex":[]}` | **PASS** |
| **TC-INT-03** | Integration | Reboot persistence (`pm2-ubuntu.service` & `nginx`) | System services enabled and `verify-live.sh` exits `0` | `systemctl is-enabled pm2-ubuntu` returned `enabled`; `ALL LIVE CHECKS PASSED.` | **PASS** |

**Table 6.4**  
*Summary of Technical Issues Encountered and Resolved During Development and Cloud Deployment*

| Issue ID & Area | Problem Encountered | Root Cause | Verified Resolution |
|---|---|---|---|
| **ISS-01 (IAM Pre-Flight)** | AWS CLI pre-flight failed with `AccessDenied` on `iam:ListPolicies`, `ListInstanceProfiles`, and `GetRole` while `PowerUser` EC2/VPC/RDS/S3 dry-runs passed. | Deployment IAM user lacked IAM policy, role, and `iam:PassRole` permissions needed to create `ue-cloudlearn-ec2-role`. | Refused insecure EC2 access keys; attached scoped `UECloudlearnProvisionIAM` policy, enabling clean creation of `UECloudlearnEC2S3Policy` and `ue-cloudlearn-ec2-role`. |
| **ISS-02 (Tarball Line Endings)** | Initial `git archive` execution of shell scripts on Ubuntu 24.04 EC2 failed with `set: pipefail\r: invalid option name`. | Windows Git global config `core.autocrlf=true` emitted CRLF line endings into the generated `.tar.gz` archive. | Regenerated source archive using `git -c core.autocrlf=false archive --format=tar.gz HEAD` and verified LF line endings on EC2 via `file`. |
| **ISS-03 (Free Tier Build RAM)** | Risk of Node.js out-of-memory (OOM) failure while running `tsc --noEmit && vite build` on 1 GiB RAM `t3.micro` EC2. | Vite + TypeScript bundling temporarily spikes memory near 1 GiB physical RAM limits. | Provisioned 1 GB `/swapfile` in `ec2-bootstrap.sh` and set `NODE_OPTIONS="--max-old-space-size=768"` in `deploy.sh`; production build finished cleanly in `5.42s`. |
| **ISS-04 (Grading Header Metadata)** | Assignment-scoped submissions response (`GET /api/assignments/:assignmentId/submissions`) omitted assignment title and `maxScore` needed by the grading form header. | `listSubmissionsForAssignment` returned raw submission rows only. | Updated `SubmissionsPage.tsx` in assignment mode to fetch `/api/courses/:courseId/assignments` concurrently, keeping `0..maxScore` validation accurate. |

Overall evaluation confirms that **UE Cloudlearn** achieves 100% pass status across all automated and live cloud verification suites (`27/27` Vitest tests, `15/15` UI accessibility audit points, and `30/30` end-to-end QA matrix test cases) while operating completely inside AWS Free Tier cost boundaries (`$0.00`).
