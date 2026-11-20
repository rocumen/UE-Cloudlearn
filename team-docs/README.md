# UE Cloudlearn — Member Study & Presentation Packets (`team-docs/`)

**Project:** UE Cloudlearn — Online Learning and Course Management System  
**Course / Section:** CCS_4301 / CS1G — First Semester 2026–2027  
**Institution:** University of the East – Caloocan, College of Engineering  
**Instructor:** Prof. Ryan Paul Obligar, MIT  
**Group Leader:** Mark Costin  
**Group Number:** `________`  
**Target Live Presentation Date:** November 27, 2026  
**Official GitHub Repository:** `https://github.com/rocumen/UE-Cloudlearn`  
**Live AWS Deployment Endpoint (`ap-southeast-1`):** `http://54.255.186.17` *(resumed `2026-11-20`; initial screenshot capture at `http://47.131.249.155` — dynamic public IPv4 refreshes upon EC2 stop/start per `infra/aws-architecture-checklist.md` Section 5)*

---

## Why This Folder Exists

During the **Mandatory Live System and AWS Demonstration**, Prof. Obligar requires two things:
1. **Individual Ownership:** Every group member demonstrates and explains their assigned area of the system, AWS environment, formal paper documentation (`docs/`), and GitHub contributions.
2. **Whole-System Mastery (Part 4 Q&A):** *"The instructor may ask any member to explain or demonstrate a particular part of the system. Each member is expected to understand the overall implementation, not only their assigned task."*

Every member should study **TWO documents**:
1. **[00-MASTER-STUDY-GUIDE.md](00-MASTER-STUDY-GUIDE.md)** — Required shared reading for ALL 7 members (complete AWS resource IDs, architecture diagram, seeded demo accounts, and 15 cross-system Q&A flashcards).
2. **Your Individual Packet** below — Exact presentation click script, verified code/SQL/AWS evidence index, GitHub & formal paper checklist, and role-specific Q&A practice.

---

## Presentation Flow & Individual Packets

| Order | Group Member | Designated Role | Packet File | Live Presentation Segment |
|---|---|---|---|---|
| **ALL** | Everyone (7 Members) | Shared Whole-System Mastery | `00-MASTER-STUDY-GUIDE.md` | **Part 4** Cross-System Technical Q&A |
| **1** | **Mark Costin** *(Leader)* | Group Leader, System Integrator & Architecture | `01-mark-costin-leader-integration.md` | **Opening** (Problem, Objectives, Architecture) + **Part 3 Live Integration Demo** + Closing |
| **2** | **Zac Dacquel** | Backend & Authentication Lead | `02-zac-dacquel-backend-auth.md` | **Part 1 Auth & RBAC Demo** (Login/Register/Role Control) + Backend API Flow |
| **3** | **Isabel Lopez** | Frontend & UI/UX Lead | [Packet 03 — Isabel Lopez](03-isabel-lopez-frontend%2Dui.md) | **Part 1 Live App Walkthrough** (Dashboards, Courses, Materials, Assignments, Records, Dark Mode) |
| **4** | **Mark Cyron Feratero** | Database & Amazon RDS Lead | `04-mark-cyron-feratero-rds-database.md` | **Part 2 Amazon RDS Console & Live SQL Tables/Records** + Part 3 Live CRUD Proof |
| **5** | **Ryan Palacios** | Cloud Storage & IAM Security Lead | `05-ryan-palacios-s3-iam.md` | **Part 2 Amazon S3 & AWS IAM Console** + **Part 3 Live File Upload/Presigned URL Proof** |
| **6** | **Mark Bautista** | Cloud Hosting & Deployment Lead | `06-mark-bautista-ec2-deployment.md` | **Part 2 Amazon EC2 Console & Running Server (Nginx/PM2)** + GitHub Workflow |
| **7** | **Reynald Ocumen** | Cloud Networking & QA Lead | `07-reynald-ocumen-vpc-sg-qa.md` | **Part 2 Amazon VPC, Subnets, Route Tables & Security Groups** + **Ch. 6 QA Results** |

---

## Formal Paper Reference Map (`docs/`)

- `docs/00-preliminary-pages.md` — Title Page, Approval Sheet, Abstract, TOC, List of Figures (39), List of Tables (35)
- `docs/01-chapter-1-introduction.md` — Chapter 1 (Introduction)
- `docs/02-chapter-2-analysis-design.md` — Chapter 2 (Requirements, Architecture, Workflows, UI, Use Case, DFDs, 3NF ERD & Data Dictionary)
- `docs/03-chapter-3-development.md` — Chapter 3 (Dev Env, Frontend, Backend 35 Endpoints, Live App Screenshots, Auth/RBAC, GitHub)
- `docs/04-chapter-4-database.md` — Chapter 4 (Amazon RDS MySQL `8.0.46`, SQL `CREATE`/`INSERT`/`SELECT`/`UPDATE`/`DELETE`/`JOIN`, Connectivity, Live DB Tests)
- `docs/05-chapter-5-aws-infrastructure.md` — Chapter 5 (Live `ap-southeast-1` S3, EC2, VPC, SGs, RDS, IAM, Integration, Deploy & Pause/Resume)
- `docs/06-chapter-6-testing-evaluation.md` — Chapter 6 (Methodology, Functional/DB/S3/Security/Integration Tests, 30-Case Matrix, Resolved Issues)
- `docs/07-references-apa7.md` — APA 7th Edition References
- `docs/08-appendices.md` — Appendices A–F (SQL Scripts, GitHub Tree & History, 23 Screenshot Checklists, Contributions, Print/Export Guide)
