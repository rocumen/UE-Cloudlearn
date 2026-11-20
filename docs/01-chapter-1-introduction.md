# CHAPTER 1: INTRODUCTION

## 1.1 Project Background

Modern university instruction relies heavily on digital distribution of syllabi, lecture presentations, laboratory rubrics, student deliverables, and evaluation records. In practice, however, many college classes still coordinate academic artifacts through ad-hoc combinations of group messaging applications, personal cloud folders, and scattered email threads. When course materials and student submissions reside across disconnected channels, instructors lose auditability over submission timestamps, students struggle to locate authoritative handouts, and academic administrators lack a unified view of course rosters and assessment progress.

Cloud computing provides a resilient, cost-efficient foundation for solving these coordination gaps through on-demand compute, managed relational databases, durable object storage, and software-defined network isolation. Rather than deploying monolithic applications onto shared university servers or committing binary files onto local host disks that do not scale reliably, cloud-native architectures separate presentation, application logic, structured relational state, and unstructured binary objects across purpose-built cloud services.

**UE Cloudlearn** was engineered within the **CCS_4301 / CS1G — Cloud Computing** curriculum at the **University of the East – Caloocan** to demonstrate a production-oriented **Online Learning and Course Management System** hosted on **Amazon Web Services (AWS)** in the `ap-southeast-1` (Singapore) region. The platform unifies course discovery, enrollment management, cloud file distribution, assignment submission, grading, and consolidated student learning records inside a calm, role-scoped web application backed by **Amazon EC2**, **Amazon RDS for MySQL 8.0**, **Amazon S3**, **Amazon VPC**, **Security Groups**, and **AWS IAM**, while operating strictly within AWS Free Tier cost boundaries.

---

## 1.2 Problem Statement

Informal classroom workflows introduce measurable operational and security risks for students, faculty members, and academic departments:

1. **Fragmented Course Content and Handout Distribution:** Lecture decks, laboratory guides, and assignment rubrics shared across chat logs become buried under casual messages, leading students to download outdated copies or lose access mid-semester.
2. **Unreliable Assignment Collection and Version Tracking:** Receiving student deliverables via email or unindexed shared drives creates duplicate filenames, manual sorting overhead, and ambiguity regarding whether a submission was uploaded before or after grading.
3. **Lack of Granular Access Control and Privacy:** Publicly shared drive links permit anyone holding a URL to view or redistribute restricted course files and student work, without verifying course enrollment or user role.
4. **Disconnected Grade Visibility:** Students frequently lack a real-time, consolidated summary linking each enrolled course, assignment deadline, submission status, numeric score, and instructor feedback in one structured view.
5. **Single-Host Coupling and Credential Risks:** Academic prototypes often store uploaded files on the local web server disk or embed database and cloud credentials directly inside application source code, risking data loss and accidental credential leakage in version control.

UE Cloudlearn directly addresses these five challenges by enforcing server-side Role-Based Access Control (RBAC), storing structured relational data in a network-isolated private **Amazon RDS MySQL 8.0** database, persisting binary artifacts inside a private **Amazon S3** bucket served solely via authenticated short-lived presigned URLs, and eliminating static AWS credentials through an **EC2 IAM Instance Profile**.

---

## 1.3 Objectives of the Project

### 1.3.1 General Objective

The general objective of this project is to design, develop, deploy, and evaluate **UE Cloudlearn**, a centralized, secure, role-based Online Learning and Course Management System hosted on Amazon Web Services (`ap-southeast-1`) using Free Tier cloud infrastructure.

### 1.3.2 Specific Objectives

To fulfill the general objective, the project established five measurable engineering objectives:

1. **Implement Role-Based Authentication and Access Control:** Build an authenticated web API and React single-page application supporting student self-registration, `bcryptjs` password hashing (10 salt rounds), `HttpOnly` JWT session cookies (`ue_cloudlearn_token`), and strict RBAC separating `admin`, `instructor`, and `student` permissions across 35 REST API endpoints.
2. **Design a Normalized Relational Database on Amazon RDS:** Model and deploy a Third Normal Form (3NF) six-table schema (`users`, `courses`, `enrollments`, `materials`, `assignments`, `submissions`) on a private **Amazon RDS for MySQL 8.0.46** instance (`ue-cloudlearn-db`), queried exclusively with explicit `?`-parameterized `mysql2/promise` SQL statements without an ORM to ensure SQL transparency and immunity to SQL injection.
3. **Integrate Private Cloud Object Storage via Amazon S3:** Store all course learning materials, assignment reference attachments, and student submissions in a private **Amazon S3** bucket (`ue-cloudlearn-files-ccs4301-7dfd0a`) configured with Block All Public Access enabled, SSE-S3 (`AES256`) encryption, MIME/15 MB file validation, and 5-minute presigned GET download URLs generated only after verifying JWT and course authorization.
4. **Harden AWS VPC Networking, Security Groups, and IAM:** Provision a custom **Amazon VPC** (`vpc-08e1bc74978acedfc`, `10.0.0.0/16`) isolating RDS across two private subnets (`10.0.2.0/24`, `10.0.3.0/24`) with a local-only route table (zero NAT Gateway), restricting MySQL port `3306` exclusively to the EC2 Security Group (`sg-0ffdde6854196014f`), serving the production React + Express stack via **Nginx** and **PM2** on Ubuntu 24.04 LTS EC2 (`i-0613bbaf4edddf9be`), and authenticating EC2 to S3 solely through an attached **IAM Role** (`ue-cloudlearn-ec2-role`).
5. **Verify System Reliability Through Automated and Live Cloud Testing:** Validate all functional workflows, relational `JOIN` persistence, S3 private access denial (`HTTP 403`) versus presigned access (`HTTP 200`), RBAC rejections (`HTTP 403`), and external port `3306` isolation (`ETIMEDOUT`) through automated Vitest + Supertest suites and live AWS end-to-end testing.

---

## 1.4 Project Description

UE Cloudlearn is a full-stack cloud web application engineered for academic course delivery and assessment management. Its client interface is built with **React 18**, **TypeScript**, **Vite**, and **Tailwind CSS**, following a calm, minimalist high-contrast UI/UX design system paired with University of the East institutional **UE Crimson** (`#A61C1C` light / `#F27474` dark) accents and automatic light/dark theme parity. Static compiled client assets (`frontend/dist`) are served directly by **Nginx** listening on port `80` of an **Amazon EC2** instance (`t3.micro`), while all `/api/*` requests are reverse-proxied locally to an **Express.js** ES Module server listening on `127.0.0.1:5000` under **PM2** process management.

Every authenticated business operation synchronizes structured relational records in **Amazon RDS** with cloud object storage in **Amazon S3**. When an instructor uploads a lecture handout or attaches a rubric to an assignment, `multer` validates the file type and 15 MB ceiling in memory, the backend streams the binary buffer to S3 under a structured UUID prefix (`materials/course-{courseId}/...` or `assignments/course-{courseId}/...`), and MySQL records the file metadata and unique `s3_key`. Conversely, when an enrolled student requests a handout or an instructor reviews a submission, the backend verifies both JWT validity and course authorization before requesting a 300-second presigned GET URL from S3 via the AWS SDK v3 default credential provider chain powered by IMDSv2. Deleting a material, assignment, submission, or course coordinates cleanup across both Amazon RDS and Amazon S3 so orphaned cloud objects do not accumulate.

---

## 1.5 Scope and Limitations

The first production version (`v1`) of UE Cloudlearn delivers the complete academic lifecycle required for CCS_4301 deployment and live evaluation while intentionally deferring secondary synchronous communication features to maintain architectural clarity and Free Tier stability. Table 1.1 summarizes the functional scope allocated across the three system roles.

**Table 1.1**  
*Summary of System Scope and Functional Modules by User Role*

| Module | Administrator (`admin`) | Instructor (`instructor`) | Student (`student`) |
|---|---|---|---|
| **Authentication & Session** | Sign in, sign out, session check (`/api/auth/me`) | Sign in, sign out, session check (`/api/auth/me`) | Self-register, sign in, sign out, session check |
| **Role Overview Dashboard** | System counts (`users`, `courses`, active `enrollments`) + recent records | Assigned courses count, pending review count, total students + recent submissions | Enrolled courses count, pending assignments, overall average + upcoming work & recent grades |
| **User Management** | List/filter users by role, create users across any role, update name/role/status, delete non-self users | Not permitted (`403 Forbidden`) | Not permitted (`403 Forbidden`) |
| **Course & Enrollment Management** | Create/edit/delete courses, assign/reassign instructors, view rosters, drop students | View assigned courses, edit title/description/term, view enrolled student rosters | Browse/search catalog, view enrolled courses, self-enroll, drop enrollment |
| **Learning Materials (S3 + RDS)** | Full upload, edit, download, delete access across courses | Upload (<= 15 MB), edit metadata/replace file, download (5-min presigned URL), delete | View and download materials for enrolled courses via 5-min presigned URL |
| **Assignments & Submissions (S3 + RDS)** | Create/edit/delete assignments, view submissions, grade, delete any submission | Create/edit/delete assignments (+ optional S3 attachment) for assigned courses, download submissions, grade & return feedback | View assignments, upload/replace ungraded submissions (+ note), delete own ungraded submission, download own submission |
| **Learning Records** | View via course/submission management | View via assignment gradebooks | Consolidated `GET /api/records/me` SQL `JOIN` scorecard per enrolled course with overall average |

### System Limitations (Version 1)

1. **No Real-Time Video Conferencing or Streaming:** Live lecture broadcasting and recorded video transcoding are excluded from v1; lecture artifacts are shared as downloadable PDF, DOCX, PPTX, XLSX, TXT, image, or ZIP files up to 15 MB.
2. **No Threaded Chat or Discussion Forums:** Course communication occurs through structured course overviews, assignment instructions, student submission notes, and instructor grading feedback rather than real-time WebSocket chat rooms.
3. **No Timed Auto-Graded Objective Quiz Engine:** Assessments center on file-based submissions graded by instructors with numeric scores (`0..maxScore`) and qualitative feedback.
4. **No Online Billing or Tuition Payment Processing:** Financial enrollment clearance and payment gateways are outside the scope of the academic LMS core.
5. **Responsive Web Application Instead of Native Mobile Binaries:** Mobile access is supported across phone and tablet viewports via a responsive mobile bottom tab bar and touch-friendly (`>= 44x44px`) controls rather than separate iOS or Android app packages.
6. **Public HTTP IPv4 Refresh Upon Free Tier Stop/Start:** To avoid unattached Elastic IP charges during the pre-defense pause window, the EC2 instance (`i-0613bbaf4edddf9be`) uses a dynamic public IPv4 address (`47.131.249.155` during initial deployment) that refreshes whenever EC2 is stopped and restarted, requiring a one-line `CORS_ORIGIN` update in `/var/www/ue-cloudlearn/.env` per `infra/aws-architecture-checklist.md`.

---

## 1.6 Target Users

UE Cloudlearn is designed around three mutually exclusive role boundaries enforced identically at the Express middleware layer (`requireAuth`, `requireRole`) and React route guards (`ProtectedRoute`). Table 1.2 outlines the responsibilities and operational profile of each user group.

**Table 1.2**  
*Target User Roles and Core Platform Capabilities*

| Role | Primary Representative Users | Core Platform Goals | Primary Interface Screens |
|---|---|---|---|
| **Student (`student`)** | Enrolled UE undergraduates taking CCS and technical courses | Self-register, discover and enroll in courses, download verified handouts, submit or update assignment files before grading, and track scores and instructor feedback | `/register`, `/login`, `/`, `/courses`, `/courses/:id`, `/records` |
| **Instructor (`instructor`)** | Faculty members assigned to teach specific courses | Maintain course overviews, inspect student rosters, publish and organize learning materials in S3, create assignments with deadlines and rubrics, download submissions, and record grades and feedback | `/login`, `/`, `/courses`, `/courses/:id`, `/submissions`, `/courses/:id/assignments/:assignmentId` |
| **Administrator (`admin`)** | Department coordinators and system administrators | Provision and govern student, instructor, and admin accounts, enforce active/inactive account status, create/delete courses, assign instructors, and monitor system-wide KPIs | `/login`, `/`, `/courses`, `/courses/:id`, `/submissions`, `/users` |

---

## 1.7 Significance of the Project

UE Cloudlearn delivers practical educational and technical value across four stakeholder groups:

- **For Students:** Consolidates every handout, assignment prompt, submission status, numeric score, and instructor comment into a single calm interface accessible on both desktop and mobile browsers, eliminating missed files and uncertainty over whether work was received.
- **For Instructors:** Streamlines class management by linking each uploaded file and student submission to structured course rosters and grading workflows, replacing manual email sorting with filtered submission queues (`Pending review`, `Graded`, `Returned`) and one-click presigned file downloads.
- **For Academic Administrators:** Establishes clear institutional governance over course creation, instructor assignment, and user status (`active` vs. `inactive`), backed by verifiable database referential integrity (`ON DELETE RESTRICT` on active instructors and uploaders).
- **For Cloud Computing Learners and Future Researchers:** Serves as a complete, auditable reference implementation of AWS Free Tier architecture (`ap-southeast-1`) combining custom VPC public/private subnet segmentation, Security Group chaining, IAM Instance Profile authentication (`IMDSv2`), raw parameterized SQL transparency (`mysql2/promise`), and private S3 presigned URL distribution without secret exposure in source control.
