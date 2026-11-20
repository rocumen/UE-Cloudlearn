# Study & Presentation Packet 01 — Mark Costin (Group Leader)

**Role:** Group Leader, System Integrator & Architecture Presenter  
**Project:** UE Cloudlearn (`CCS_4301 / CS1G` — First Semester 2026–2027)  
**Presentation Date:** November 27, 2026  
**Also Study:** `team-docs/00-MASTER-STUDY-GUIDE.md` (mandatory for Part 4 Q&A)

---

## 1. Your Project Responsibilities

- Coordinate the 7-person group timeline, milestones, and integration readiness before submission and live defense.
- Manage GitHub repository governance (`https://github.com/rocumen/UE-Cloudlearn`), PR/milestone reviews, root `README.md` accuracy, and full-team commit visibility.
- Orchestrate the **end-to-end integration test** (`Browser -> IGW -> EC2 Nginx (:80) -> Express PM2 (:5000) -> Private RDS MySQL (:3306) & Private S3 (:443)`) verified live on AWS.
- Open the live presentation and lead **Part 3: Live End-to-End Integration Demonstration**.

## 2. Your Assigned Formal Paper Sections (`docs/`)

- **Preliminary Pages (`docs/00-preliminary-pages.md`):** Title Page (`Group ________`), Approval Sheet, Abstract, Table of Contents, List of Figures, List of Tables.
- **Chapter 1 (`docs/01-chapter-1-introduction.md`):** Sections 1.1–1.7 (Background, Problem Statement, General & Specific Objectives, Project Description, Scope & Limitations `Table 1.1`, Target Users `Table 1.2`, Significance).
- **Chapter 5.1 & 5.8 (`docs/05-chapter-5-aws-infrastructure.md`):** AWS Environment Overview (`ap-southeast-1`, `Table 5.1`) and AWS Service Integration (`Figure 5.10`).
- **Appendix E (`docs/08-appendices.md`):** 7-Member Group Contributions Matrix.

## 3. Your GitHub & Verification Checklist

- [x] `README.md` verified against live AWS deployment (`http://47.131.249.155` initial / `http://54.255.186.17` post-resume).
- [x] `docs/00-preliminary-pages.md`, `docs/01-chapter-1-introduction.md`, `docs/05-chapter-5-aws-infrastructure.md` (5.1 & 5.8), and `docs/08-appendices.md` (Appendix E) authored and cross-verified.
- [ ] Fill in the assigned Group Number (`________` -> final number) and coordinate final Git push + Word/PDF export for submission.

## 4. Your Live Presentation Script (Exact Clicks & Coordination)

1. **Opening (2 mins):**
   - Greet Prof. Ryan Paul Obligar, introduce all 7 group members and their specialized AWS/system duties.
   - State the problem (scattered class handouts, email/drive submission chaos, weak access control, manual grading) and introduce **UE Cloudlearn** and its 3 roles (`Administrator`, `Instructor`, `Student`).
2. **Overall Architecture Hand-Off (1 min):**
   - Display **Figure 2.1** (`docs/02-chapter-2-analysis-design.md`) or **Figure 5.10** (`docs/05-chapter-5-aws-infrastructure.md`): trace traffic from Browser -> Internet Gateway (`igw-0f79d6733305e4cd1`) -> EC2 `ue-cloudlearn-app-ec2` (`i-0613bbaf4edddf9be`, Nginx `:80` + Express `:5000` + IAM Role `ue-cloudlearn-ec2-role`) -> Private RDS `ue-cloudlearn-db` (`3306`) and Private S3 (`ue-cloudlearn-files-ccs4301-7dfd0a`).
   - Hand off to **Zac** & **Isabel** for Part 1.
3. **Part 3 — Live End-to-End Integration Demo (3–4 mins, immediately after Part 2 AWS Console tour):**
   - **Step A:** Open the live EC2 URL (`http://54.255.186.17` — or the refreshed Nov 27 EC2 public IP verified before class).
   - **Step B (Live S3 + RDS Write as Instructor):** Sign in as `instructor.santos@ue-cloudlearn.edu.ph` -> open course **CCS4301** -> **Materials** tab -> click **`Upload material`** -> select a small demo PDF -> click **`Upload`** (toast confirms `"Learning material uploaded successfully."`).
   - **Step C (Live S3 Proof with Ryan):** Switch to **S3 Console -> `ue-cloudlearn-files-ccs4301-7dfd0a` -> `materials/course-1/`** and click **Refresh** -> show the newly uploaded UUID-prefixed PDF object immediately present!
   - **Step D (Live Presigned Download + Student Submission + RDS Proof with Mark Cyron):** Sign in as `student.cruz@ue-cloudlearn.edu.ph` -> open **CCS4301** -> click **`Download`** on the new handout (opens 5-minute presigned URL cleanly) -> switch to **Assignments** -> submit a sample PDF -> have **Mark Cyron** run a quick `SELECT` on EC2 `mysql` showing the new `materials` and `submissions` rows persisted in `ue-cloudlearn-db` in real time!
   - **Step E (Closing):** Summarize how VPC isolation, Security Group referencing, IAM IMDSv2 credentials, parameterized SQL, and React/Express operated seamlessly together with `$0` Free Tier architecture.

## 5. Role-Specific Q&A Practice

- **Q: What makes UE Cloudlearn an integrated cloud application rather than a static website?**  
  *A:* Every request integrates multiple AWS tiers: Nginx on EC2 (`i-0613bbaf4edddf9be`) serves `frontend/dist` and proxies `/api/*` to Express, Express authenticates JWT cookies and persists structured records in private Amazon RDS (`ue-cloudlearn-db`) via `sg-06ac3f3f332f7b98a`, and Express exchanges binary files with private Amazon S3 (`ue-cloudlearn-files-ccs4301-7dfd0a`) via EC2 IAM Role `ue-cloudlearn-ec2-role` and 5-minute presigned URLs.
- **Q: What are the key limitations of version 1?**  
  *A:* Per Chapter 1.5, v1 deliberately focuses on courses, enrollments, S3 materials, assignments, submissions, grading, and learning records — excluding live video conferencing, real-time chat rooms, timed auto-graded quizzes, and tuition payments, while using dynamic EC2 public IPv4 (no paid EIP) during pre-defense Free Tier pauses.
- **Q: How did your team verify the entire integrated stack worked before defense day?**  
  *A:* We executed 27 automated Vitest + Supertest tests, a 15-point UI/contrast/hit-area accessibility audit, live `verify-live.sh` EC2 checks, and 30 end-to-end live AWS verification checks (Chapter 6 Table 6.3) achieving 100% PASS.

## 6. Live Project Evidence Index

- **Deployed Live URL:** `http://54.255.186.17` (`http://54.255.186.17/api/health`; initial screenshot verification at `http://47.131.249.155`) — *re-check IP on Nov 26/27 after resume*
- **Official GitHub Repository:** `https://github.com/rocumen/UE-Cloudlearn`
- **Architecture Diagrams:** `docs/02-chapter-2-analysis-design.md` (`Figure 2.1`) & `docs/05-chapter-5-aws-infrastructure.md` (`Figure 5.10`)
- **Verification Documentation:** `docs/06-chapter-6-testing-evaluation.md` & `infra/aws-architecture-checklist.md` (AWS provisioning, EC2/RDS deploy, E2E verification, formal docs)
