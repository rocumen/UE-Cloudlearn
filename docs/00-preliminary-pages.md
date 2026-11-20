# UE CLOUDLEARN: AN ONLINE LEARNING AND COURSE MANAGEMENT SYSTEM HOSTED ON AMAZON WEB SERVICES (AWS)

---

## TITLE PAGE

**UNIVERSITY OF THE EAST – CALOOCAN**  
**College of Engineering**  
**Department of Computer Studies and Systems**  
105 Samson Road, Caloocan City, Metro Manila  

---

<div align="center">

### **UE CLOUDLEARN: AN ONLINE LEARNING AND COURSE MANAGEMENT SYSTEM HOSTED ON AMAZON WEB SERVICES (AWS)**

<br/>

A Final Cloud Computing System Documentation  
Presented to the Faculty of the  
Department of Computer Studies and Systems  
College of Engineering  
University of the East – Caloocan  

<br/>

In Partial Fulfillment of the Requirements for the Course  
**CCS_4301 / CS1G — Cloud Computing**  
First Semester, Academic Year 2026–2027  

<br/>

Submitted to:  
**Prof. Ryan Paul Obligar, MIT**  
*Course Instructor*  

<br/>

Submitted by:  
**Group ________**  

**Mark Costin** *(Group Leader — System Integration & Architecture Lead)*  
**Zac Dacquel** *(Backend & Authentication Lead)*  
**Isabel Lopez** *(Frontend & UI/UX Lead)*  
**Mark Cyron Feratero** *(Database & Amazon RDS Lead)*  
**Ryan Palacios** *(Cloud Storage & IAM Security Lead)*  
**Mark Bautista** *(Cloud Hosting & Deployment Lead)*  
**Reynald Ocumen** *(Cloud Networking & QA Lead)*  

<br/>

**November 2026**  

</div>

---

## APPROVAL SHEET

This final project documentation entitled **"UE Cloudlearn: An Online Learning and Course Management System Hosted on Amazon Web Services (AWS)"**, prepared and submitted by **Group ________** (Mark Costin, Zac Dacquel, Isabel Lopez, Mark Cyron Feratero, Ryan Palacios, Mark Bautista, and Reynald Ocumen) in partial fulfillment of the requirements for **CCS_4301 / CS1G — Cloud Computing** during the First Semester of Academic Year 2026–2027, has been examined and recommended for acceptance and approval.

<br/>

**Prof. Ryan Paul Obligar, MIT**  
Course Instructor, CCS_4301 / CS1G — Cloud Computing  
College of Engineering, University of the East – Caloocan  
Date Signed: ___________________________

<br/>

### Academic Integrity Declaration

We hereby declare that this technical documentation and its accompanying source code, relational database scripts, and cloud infrastructure configurations represent the original academic work of **Group ________**. Every source file path, database table, SQL statement, automated test output, live AWS resource identifier, and screenshot included in this paper corresponds directly to the verified repository (`https://github.com/rocumen/UE-Cloudlearn`) and live AWS Free Tier deployment in the Asia Pacific (Singapore) `ap-southeast-1` region. All external standards, frameworks, and technical references are cited in accordance with the American Psychological Association (APA) 7th Edition guidelines.

---

## ABSTRACT

Higher education coursework routinely depends on distributed file sharing and asynchronous digital submissions, yet many classes rely on fragmented messaging threads, informal email attachments, and unsecured personal drives. This fragmentation causes misplaced student submissions, unclear deadline visibility, inconsistent access governance, and manual grading overhead. **UE Cloudlearn** addresses these operational gaps by providing a centralized, role-based Online Learning and Course Management System hosted on **Amazon Web Services (AWS)** in the `ap-southeast-1` (Singapore) region under strict AWS Free Tier cost controls.

The system follows a multi-tier cloud architecture built with a **React 18**, **TypeScript**, **Vite**, and **Tailwind CSS** single-page application served statically by **Nginx**, reverse-proxied to a **Node.js** and **Express.js** REST API (35 endpoints across 9 route modules) managed by **PM2** on an **Ubuntu 24.04 LTS Amazon EC2** (`t3.micro`) instance. Structured relational records are persisted in a private Single-AZ **Amazon RDS for MySQL 8.0.46** (`db.t3.micro`) database containing six normalized InnoDB tables (`users`, `courses`, `enrollments`, `materials`, `assignments`, `submissions`) accessed exclusively via explicit `?`-parameterized `mysql2/promise` queries without an Object-Relational Mapper. Course handouts, assignment attachments, and student submissions are stored in a private **Amazon S3** bucket (`ue-cloudlearn-files-ccs4301-7dfd0a`) with Block All Public Access enabled, Server-Side Encryption (`AES256`), and 5-minute presigned GET URLs issued only after JWT (`HttpOnly` cookie) and role/enrollment verification.

Network and identity boundaries isolate EC2 inside a public subnet (`10.0.1.0/24`) and RDS across two private subnets (`10.0.2.0/24`, `10.0.3.0/24`) within a custom **Amazon VPC** (`10.0.0.0/16`) with zero NAT Gateway cost. Stateful Security Group referencing restricts MySQL port `3306` exclusively to traffic originating from the EC2 Security Group, while EC2 authenticates to S3 via an attached **AWS IAM Instance Profile** (`ue-cloudlearn-ec2-role`) scoped by a least-privilege policy (`UECloudlearnEC2S3Policy`) with zero static AWS keys stored on disk or in Git. Verification across 27 automated Vitest + Supertest integration tests, static TypeScript/UI audits, and 30 live AWS end-to-end cloud test cases recorded a 100% pass rate, confirming functional correctness, SQL injection immunity, private database isolation (`ETIMEDOUT` externally on port `3306`), private S3 access denial (`HTTP 403` direct vs. `HTTP 200` presigned), and role-based access enforcement (`HTTP 403` for unauthorized roles).

---

## TABLE OF CONTENTS

| Section | Title | Document File |
|---|---|---|
| **Preliminary Pages** | Title Page, Approval Sheet, Abstract, Table of Contents, List of Figures, List of Tables | `docs/00-preliminary-pages.md` |
| **Chapter 1** | **Introduction** | `docs/01-chapter-1-introduction.md` |
| 1.1 | Project Background | `docs/01-chapter-1-introduction.md#11-project-background` |
| 1.2 | Problem Statement | `docs/01-chapter-1-introduction.md#12-problem-statement` |
| 1.3 | Objectives of the Project (1.3.1 General, 1.3.2 Specific) | `docs/01-chapter-1-introduction.md#13-objectives-of-the-project` |
| 1.4 | Project Description | `docs/01-chapter-1-introduction.md#14-project-description` |
| 1.5 | Scope and Limitations | `docs/01-chapter-1-introduction.md#15-scope-and-limitations` |
| 1.6 | Target Users (Students, Instructors, Administrators) | `docs/01-chapter-1-introduction.md#16-target-users` |
| 1.7 | Significance of the Project | `docs/01-chapter-1-introduction.md#17-significance-of-the-project` |
| **Chapter 2** | **System Analysis and Design** | `docs/02-chapter-2-analysis-design.md` |
| 2.1 | System Requirements (Functional, Non-Functional, Hardware, Software) | `docs/02-chapter-2-analysis-design.md#21-system-requirements` |
| 2.2 | System Architecture | `docs/02-chapter-2-analysis-design.md#22-system-architecture` |
| 2.3 | System Workflow (Admin, Instructor, Student Flowcharts) | `docs/02-chapter-2-analysis-design.md#23-system-workflow` |
| 2.4 | User Interface Design (Minimalist Visual System & UE Crimson Tokens) | `docs/02-chapter-2-analysis-design.md#24-user-interface-design` |
| 2.5 | Use Case Diagram | `docs/02-chapter-2-analysis-design.md#25-use-case-diagram` |
| 2.6 | Data Flow Diagram (Level 0 & Level 1 DFD) | `docs/02-chapter-2-analysis-design.md#26-data-flow-diagram` |
| 2.7 | Database Design (Normalization, ERD & 6-Table Data Dictionary) | `docs/02-chapter-2-analysis-design.md#27-database-design` |
| **Chapter 3** | **System Development and Implementation** | `docs/03-chapter-3-development.md` |
| 3.1 | Development Environment | `docs/03-chapter-3-development.md#31-development-environment` |
| 3.2 | Frontend Development | `docs/03-chapter-3-development.md#32-frontend-development` |
| 3.3 | Backend Development | `docs/03-chapter-3-development.md#33-backend-development` |
| 3.4 | System Functionalities | `docs/03-chapter-3-development.md#34-system-functionalities` |
| 3.5 | User Authentication and Access Management | `docs/03-chapter-3-development.md#35-user-authentication-and-access-management` |
| 3.6 | GitHub Repository and Version Control | `docs/03-chapter-3-development.md#36-github-repository-and-version-control` |
| **Chapter 4** | **Database Implementation (Amazon RDS — MySQL 8.0)** | `docs/04-chapter-4-database.md` |
| 4.1 | Database Environment | `docs/04-chapter-4-database.md#41-database-environment` |
| 4.2 | Database Creation | `docs/04-chapter-4-database.md#42-database-creation` |
| 4.3 | Database Tables and Structures | `docs/04-chapter-4-database.md#43-database-tables-and-structures` |
| 4.4 | SQL Implementation (`CREATE`, `INSERT`, `SELECT`, `UPDATE`, `DELETE`, `JOIN`) | `docs/04-chapter-4-database.md#44-sql-implementation` |
| 4.5 | Database Connectivity | `docs/04-chapter-4-database.md#45-database-connectivity` |
| 4.6 | Database Testing | `docs/04-chapter-4-database.md#46-database-testing` |
| **Chapter 5** | **AWS Cloud Infrastructure and Deployment** | `docs/05-chapter-5-aws-infrastructure.md` |
| 5.1 | AWS Environment Overview | `docs/05-chapter-5-aws-infrastructure.md#51-aws-environment-overview` |
| 5.2 | Amazon S3 Configuration | `docs/05-chapter-5-aws-infrastructure.md#52-amazon-s3-configuration` |
| 5.3 | Amazon EC2 Configuration | `docs/05-chapter-5-aws-infrastructure.md#53-amazon-ec2-configuration` |
| 5.4 | Amazon VPC Configuration | `docs/05-chapter-5-aws-infrastructure.md#54-amazon-vpc-configuration` |
| 5.5 | Security Groups Configuration | `docs/05-chapter-5-aws-infrastructure.md#55-security-groups-configuration` |
| 5.6 | Amazon RDS Configuration | `docs/05-chapter-5-aws-infrastructure.md#56-amazon-rds-configuration` |
| 5.7 | AWS IAM Configuration | `docs/05-chapter-5-aws-infrastructure.md#57-aws-iam-configuration` |
| 5.8 | AWS Service Integration | `docs/05-chapter-5-aws-infrastructure.md#58-aws-service-integration` |
| 5.9 | Application Deployment and Free Tier Operations | `docs/05-chapter-5-aws-infrastructure.md#59-application-deployment-and-free-tier-operations` |
| **Chapter 6** | **System Testing and Evaluation** | `docs/06-chapter-6-testing-evaluation.md` |
| 6.1 | Testing Methodology | `docs/06-chapter-6-testing-evaluation.md#61-testing-methodology` |
| 6.2 | Functional Testing | `docs/06-chapter-6-testing-evaluation.md#62-functional-testing` |
| 6.3 | Database Testing | `docs/06-chapter-6-testing-evaluation.md#63-database-testing` |
| 6.4 | Cloud Storage Testing | `docs/06-chapter-6-testing-evaluation.md#64-cloud-storage-testing` |
| 6.5 | Network and Security Testing | `docs/06-chapter-6-testing-evaluation.md#65-network-and-security-testing` |
| 6.6 | Integration Testing | `docs/06-chapter-6-testing-evaluation.md#66-integration-testing` |
| 6.7 | Testing Results and Discussion | `docs/06-chapter-6-testing-evaluation.md#67-testing-results-and-discussion` |
| **References** | **APA 7th Edition Reference List** | `docs/07-references-apa7.md` |
| **Appendices** | **Appendices A through F** | `docs/08-appendices.md` |
| Appendix A | Database SQL Scripts (`schema.sql`, `seed.sql`, `sample_queries.sql`, `seed-passwords.js`) | `docs/08-appendices.md#appendix-a--database-sql-scripts` |
| Appendix B | GitHub Repository Structure and Commit History | `docs/08-appendices.md#appendix-b--github-repository-structure-and-commit-history` |
| Appendix C | Master Web Application Screenshot Index and Checklist | `docs/08-appendices.md#appendix-c--master-web-application-screenshot-index-and-checklist` |
| Appendix D | Master AWS Management Console Screenshot Index and Checklist | `docs/08-appendices.md#appendix-d--master-aws-management-console-screenshot-index-and-checklist` |
| Appendix E | Group Member Contributions Matrix | `docs/08-appendices.md#appendix-e--group-member-contributions-matrix` |
| Appendix F | Technical Configs, Pause/Resume Runbook, and Print/Export Checklist | `docs/08-appendices.md#appendix-f--additional-technical-and-operational-documentation` |

---

## LIST OF FIGURES

| Figure | Caption | Chapter / File |
|---|---|---|
| **Figure 2.1** | UE Cloudlearn Multi-Tier AWS Cloud System Architecture Diagram | `docs/02-chapter-2-analysis-design.md` |
| **Figure 2.2** | Administrator Role System Workflow Flowchart | `docs/02-chapter-2-analysis-design.md` |
| **Figure 2.3** | Instructor Role System Workflow Flowchart | `docs/02-chapter-2-analysis-design.md` |
| **Figure 2.4** | Student Role System Workflow Flowchart | `docs/02-chapter-2-analysis-design.md` |
| **Figure 2.5** | UE Cloudlearn Sign In Interface (`/login`) | `docs/02-chapter-2-analysis-design.md` |
| **Figure 2.6** | UE Cloudlearn Student Registration Interface (`/register`) | `docs/02-chapter-2-analysis-design.md` |
| **Figure 2.7** | Role Overview Dashboard Interface (`/`) | `docs/02-chapter-2-analysis-design.md` |
| **Figure 2.8** | Dark Theme Adaptive Interface (`/records`) | `docs/02-chapter-2-analysis-design.md` |
| **Figure 2.9** | UE Cloudlearn System Use Case Diagram Across Student, Instructor, and Administrator Actors | `docs/02-chapter-2-analysis-design.md` |
| **Figure 2.10** | Context-Level (Level 0) Data Flow Diagram of UE Cloudlearn | `docs/02-chapter-2-analysis-design.md` |
| **Figure 2.11** | Level 1 Data Flow Diagram Showing Core Processes (`P1`–`P6`) and Data Stores (`D1`: Amazon RDS MySQL, `D2`: Amazon S3 Bucket) | `docs/02-chapter-2-analysis-design.md` |
| **Figure 2.12** | Entity-Relationship Diagram (ERD) of the `ue_cloudlearn` MySQL 8.0 Database Schema | `docs/02-chapter-2-analysis-design.md` |
| **Figure 3.1** | Administrator Overview Dashboard and System KPIs | `docs/03-chapter-3-development.md` |
| **Figure 3.2** | Administrator Courses Directory and Instructor Assignment | `docs/03-chapter-3-development.md` |
| **Figure 3.3** | Administrator User Accounts and Role Management | `docs/03-chapter-3-development.md` |
| **Figure 3.4** | Instructor Overview Dashboard | `docs/03-chapter-3-development.md` |
| **Figure 3.5** | Course Detail Workspace — Learning Materials Tab with Amazon S3 Upload and Presigned Download | `docs/03-chapter-3-development.md` |
| **Figure 3.6** | Course Detail Workspace — Course Assignments Tab | `docs/03-chapter-3-development.md` |
| **Figure 3.7** | Course Detail Workspace — Enrolled Students Roster Tab | `docs/03-chapter-3-development.md` |
| **Figure 3.8** | Instructor Submissions Inbox and Review Queue | `docs/03-chapter-3-development.md` |
| **Figure 3.9** | Instructor Assignment Grading Modal Sheet | `docs/03-chapter-3-development.md` |
| **Figure 3.10** | Student Overview Dashboard with Upcoming Assignments and Recent Grades | `docs/03-chapter-3-development.md` |
| **Figure 3.11** | Student Consolidated Learning Records Powered by Multi-Table SQL `JOIN` | `docs/03-chapter-3-development.md` |
| **Figure 3.12** | JWT Cookie Authentication and Role-Based Access Control (RBAC) Sequence Diagram | `docs/03-chapter-3-development.md` |
| **Figure 3.13** | GitHub Repository Structure Overview (`https://github.com/rocumen/UE-Cloudlearn`) *(Post-Push Placeholder)* | `docs/03-chapter-3-development.md` |
| **Figure 3.14** | GitHub Commit History and Milestone Verification Log *(Post-Push Placeholder)* | `docs/03-chapter-3-development.md` |
| **Figure 4.1** | Amazon RDS for MySQL 8.0.46 Instance (`ue-cloudlearn-db`) Summary in AWS Console | `docs/04-chapter-4-database.md` |
| **Figure 4.2** | Live Relational Data Verification — Enrolled Students Roster Retrieved from Amazon RDS | `docs/04-chapter-4-database.md` |
| **Figure 4.3** | Live Multi-Table `JOIN` Verification — Consolidated Student Learning Records Retrieved from Amazon RDS | `docs/04-chapter-4-database.md` |
| **Figure 5.1** | Amazon S3 Private Bucket (`ue-cloudlearn-files-ccs4301-7dfd0a`) Objects and Prefix Hierarchy | `docs/05-chapter-5-aws-infrastructure.md` |
| **Figure 5.2** | Amazon S3 Block All Public Access Configuration | `docs/05-chapter-5-aws-infrastructure.md` |
| **Figure 5.3** | Amazon EC2 Instance (`ue-cloudlearn-app-ec2` / `i-0613bbaf4edddf9be`) Running Summary | `docs/05-chapter-5-aws-infrastructure.md` |
| **Figure 5.4** | Amazon EC2 Security Group and IAM Instance Profile Attachment | `docs/05-chapter-5-aws-infrastructure.md` |
| **Figure 5.5** | Amazon VPC (`ue-cloudlearn-vpc` / `vpc-08e1bc74978acedfc`) Visual Resource Map Across Availability Zones | `docs/05-chapter-5-aws-infrastructure.md` |
| **Figure 5.6** | Public and Private Route Tables Configuration (`rtb-0d13cd600ecf44dbb` and `rtb-06e885a597a4dacf7`) | `docs/05-chapter-5-aws-infrastructure.md` |
| **Figure 5.7** | Security Groups (`sg-0ffdde6854196014f` and `sg-06ac3f3f332f7b98a`) Inbound and Outbound Rules | `docs/05-chapter-5-aws-infrastructure.md` |
| **Figure 5.8** | Amazon RDS Private Database Instance (`ue-cloudlearn-db`) Configuration | `docs/05-chapter-5-aws-infrastructure.md` |
| **Figure 5.9** | AWS IAM Role (`ue-cloudlearn-ec2-role`) and Least-Privilege S3 Policy (`UECloudlearnEC2S3Policy`) | `docs/05-chapter-5-aws-infrastructure.md` |
| **Figure 5.10** | Deployed AWS Production Topology and Service Integration Diagram in `ap-southeast-1` | `docs/05-chapter-5-aws-infrastructure.md` |

---

## LIST OF TABLES

| Table | Title | Chapter / File |
|---|---|---|
| **Table 1.1** | Summary of System Scope and Functional Modules by User Role | `docs/01-chapter-1-introduction.md` |
| **Table 1.2** | Target User Roles and Core Platform Capabilities | `docs/01-chapter-1-introduction.md` |
| **Table 2.1** | Functional Requirements Specification of UE Cloudlearn | `docs/02-chapter-2-analysis-design.md` |
| **Table 2.2** | Non-Functional Requirements Specification | `docs/02-chapter-2-analysis-design.md` |
| **Table 2.3** | Development and Cloud Server Hardware Specifications | `docs/02-chapter-2-analysis-design.md` |
| **Table 2.4** | Software, Framework, and Cloud Service Specifications | `docs/02-chapter-2-analysis-design.md` |
| **Table 2.5** | UE Crimson Light and Dark Theme Color Tokens and WCAG AA Contrast Ratios | `docs/02-chapter-2-analysis-design.md` |
| **Table 2.6** | Data Dictionary for the `users` Table | `docs/02-chapter-2-analysis-design.md` |
| **Table 2.7** | Data Dictionary for the `courses` Table | `docs/02-chapter-2-analysis-design.md` |
| **Table 2.8** | Data Dictionary for the `enrollments` Table | `docs/02-chapter-2-analysis-design.md` |
| **Table 2.9** | Data Dictionary for the `materials` Table | `docs/02-chapter-2-analysis-design.md` |
| **Table 2.10** | Data Dictionary for the `assignments` Table | `docs/02-chapter-2-analysis-design.md` |
| **Table 2.11** | Data Dictionary for the `submissions` Table | `docs/02-chapter-2-analysis-design.md` |
| **Table 2.12** | Summary of Primary Keys, Foreign Keys, Unique Keys, Check Constraints, and Referential Integrity Rules | `docs/02-chapter-2-analysis-design.md` |
| **Table 3.1** | Local Development and Production Runtime Environment Versions | `docs/03-chapter-3-development.md` |
| **Table 3.2** | Frontend Application Directory and Component Architecture (`frontend/src/`) | `docs/03-chapter-3-development.md` |
| **Table 3.3** | Backend Application Directory and Service Architecture (`backend/src/`) | `docs/03-chapter-3-development.md` |
| **Table 3.4** | Complete REST API Endpoint Contract and Role Authorization Matrix | `docs/03-chapter-3-development.md` |
| **Table 3.5** | Role-Based Access Control (RBAC) Permission Matrix Across System Modules | `docs/03-chapter-3-development.md` |
| **Table 3.6** | Repository Directory Structure and Module Ownership | `docs/03-chapter-3-development.md` |
| **Table 4.1** | Amazon RDS for MySQL 8.0 Production Database Environment Parameters | `docs/04-chapter-4-database.md` |
| **Table 4.2** | Summary of the Six Normalized Tables in `ue_cloudlearn` | `docs/04-chapter-4-database.md` |
| **Table 4.3** | Parameterized SQL Query Modules in `backend/src/services/` | `docs/04-chapter-4-database.md` |
| **Table 4.4** | Live Amazon RDS Verification Summary (`SHOW TABLES`, Row Counts, and Multi-Table `JOIN` Results) | `docs/04-chapter-4-database.md` |
| **Table 5.1** | Live AWS Free Tier Deployment Resource Ledger (`ap-southeast-1` Singapore) | `docs/05-chapter-5-aws-infrastructure.md` |
| **Table 5.2** | Amazon S3 Bucket Configuration and Object Key Prefix Structure | `docs/05-chapter-5-aws-infrastructure.md` |
| **Table 5.3** | Amazon EC2 Instance Specifications and Runtime Stack (`ue-cloudlearn-app-ec2`) | `docs/05-chapter-5-aws-infrastructure.md` |
| **Table 5.4** | Amazon VPC Subnet Allocation and Route Table Associations (`ue-cloudlearn-vpc`) | `docs/05-chapter-5-aws-infrastructure.md` |
| **Table 5.5** | Security Group Inbound and Outbound Rules (`ue-cloudlearn-ec2-sg` and `ue-cloudlearn-rds-sg`) | `docs/05-chapter-5-aws-infrastructure.md` |
| **Table 5.6** | Amazon RDS Instance Configuration (`ue-cloudlearn-db`) | `docs/05-chapter-5-aws-infrastructure.md` |
| **Table 5.7** | AWS IAM Role (`ue-cloudlearn-ec2-role`) and Policy (`UECloudlearnEC2S3Policy`) Scope | `docs/05-chapter-5-aws-infrastructure.md` |
| **Table 6.1** | Testing Levels, Scope, and Verification Environments | `docs/06-chapter-6-testing-evaluation.md` |
| **Table 6.2** | Automated Backend Vitest + Supertest Suite Summary (`27/27` Passing Tests Across 8 Suites) | `docs/06-chapter-6-testing-evaluation.md` |
| **Table 6.3** | Complete End-to-End System Testing and Evaluation Matrix | `docs/06-chapter-6-testing-evaluation.md` |
| **Table 6.4** | Summary of Technical Issues Encountered and Resolved During Development and Cloud Deployment | `docs/06-chapter-6-testing-evaluation.md` |
