# Study & Presentation Packet 05 — Ryan Palacios

**Role:** Cloud Storage & IAM Security Lead (Amazon S3 & AWS IAM)  
**Project:** UE Cloudlearn (`CCS_4301 / CS1G` — First Semester 2026–2027)  
**Presentation Date:** November 27, 2026  
**Also Study:** `team-docs/00-MASTER-STUDY-GUIDE.md` (mandatory for Part 4 Q&A)

---

## 1. Your Project Responsibilities

- Own **Amazon S3** private bucket configuration (`ue-cloudlearn-files-ccs4301-7dfd0a`, `ap-southeast-1`), structured prefix hierarchy (`materials/`, `assignments/`, `submissions/`), Block All Public Access (`4/4` flags `true`), default encryption (`SSE-S3 AES256`), and 300-second presigned GET URL retrieval (`backend/src/config/s3.js`).
- Own **AWS IAM** least-privilege security: custom permissions policy (`UECloudlearnEC2S3Policy`), EC2 trust policy (`infra/iam/ec2-trust-policy.json`), and EC2 Instance Role / Profile (`ue-cloudlearn-ec2-role`) bound to `i-0613bbaf4edddf9be` via IMDSv2 with zero permanent AWS keys on disk or in Git.
- Lead the **Part 2 S3 & IAM Console Walkthrough** and support Mark Costin during **Part 3 Live Upload & Retrieval**.

## 2. Your Assigned Formal Paper Sections (`docs/`)

- **Chapter 5.2 (`docs/05-chapter-5-aws-infrastructure.md`):** Amazon S3 Configuration (`Table 5.2`, `Figures 5.1`–`5.2`).
- **Chapter 5.7 (`docs/05-chapter-5-aws-infrastructure.md`):** AWS IAM Configuration (`Table 5.7`, JSON policies, `Figure 5.9`).
- **Chapter 6.4 (`docs/06-chapter-6-testing-evaluation.md`):** Cloud Storage Testing (`TC-S3-01` through `TC-S3-06` in `Table 6.3`).
- **Appendix D (`docs/08-appendices.md`):** S3 & IAM AWS Console Screenshots (`aws-05`, `aws-06`, `aws-07`).

## 3. Your GitHub & Verification Checklist

- [x] `infra/iam/ec2-trust-policy.json` & `infra/iam/ec2-s3-least-privilege-policy.json` verified and provisioned in `ap-southeast-1`.
- [x] `backend/src/config/s3.js` (`createS3Client`, `createS3Storage`, `sanitizeFileName`, `getSignedUrl` `expiresInSeconds = 300`).
- [x] Live S3 + IAM verification: `HTTP 201` uploads (`materials/course-1/...` & `submissions/assignment-4/student-4/...`), `HTTP 200` presigned GET, `HTTP 403 AccessDenied` on direct S3 URL, IMDSv2 role verified.
- [x] Captured live S3 & IAM Console screenshots (`aws-05-s3-objects.png`, `aws-06-s3-permissions.png`, `aws-07-iam-role-policy.png`).

## 4. Your Live Presentation Script (Part 2 & Part 3 Support — 3–4 mins)

1. **Part 2 — Amazon S3 Console Walkthrough (2 mins):**
   - Open AWS Console (`ap-southeast-1`) -> **S3 -> `ue-cloudlearn-files-ccs4301-7dfd0a`**.
   - Show the **Objects** tab with structured prefixes (`materials/course-1/`, `submissions/assignment-4/student-4/`) containing real uploaded PDFs (`ffe53225-...-ccs4301-live-s3-handout.pdf` and `bc7e3329-...-cruz-assignment-4-live.pdf`).
   - Open the **Permissions** tab -> point out **Block all public access: On** (`4/4` flags) and demonstrate/explain that clicking the raw Object URL directly returns **`403 AccessDenied`**, while UE Cloudlearn issues a temporary 5-minute presigned URL after verifying JWT & enrollment.
   - Open **Properties** -> point out **Default encryption: Amazon S3 managed keys (SSE-S3 / AES256)**.
2. **Part 2 — AWS IAM Console Walkthrough (1.5 mins):**
   - Open AWS Console -> **IAM -> Roles -> `ue-cloudlearn-ec2-role`**.
   - Show **Trust relationships** (`ec2.amazonaws.com` -> `sts:AssumeRole`).
   - Expand **`UECloudlearnEC2S3Policy`** JSON -> highlight strict least-privilege scope: ONLY `s3:ListBucket` on `arn:aws:s3:::ue-cloudlearn-files-ccs4301-7dfd0a` and `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on `arn:aws:s3:::ue-cloudlearn-files-ccs4301-7dfd0a/*` (NOT `AmazonS3FullAccess`, NOT `*`).
3. **Part 3 Live Upload Verification:**
   - When **Mark Costin** uploads a new PDF in the live web app, click **Refresh** inside `ue-cloudlearn-files-ccs4301-7dfd0a` -> `materials/course-1/` so Prof. Obligar watches the brand-new UUID-prefixed object appear immediately in S3!

## 5. Role-Specific Q&A Practice

- **Q: What is least-privilege access, and how did you enforce it in `UECloudlearnEC2S3Policy`?**  
  *A:* Least privilege grants only the minimal actions on the exact resources needed. Instead of attaching `AmazonS3FullAccess` or `AdministratorAccess`, `UECloudlearnEC2S3Policy` permits only `s3:ListBucket` on our single project bucket ARN and `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on `arn:aws:s3:::ue-cloudlearn-files-ccs4301-7dfd0a/*`.
- **Q: Why use an EC2 IAM Role instead of putting `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` inside `.env`?**  
  *A:* Static IAM access keys never rotate automatically and create severe blast-radius risk if leaked. An attached Instance Profile (`ue-cloudlearn-ec2-role`) lets AWS SDK v3 (`new S3Client({ region })`) fetch temporary, automatically rotated credentials via IMDSv2 (`HttpTokens=required`), keeping `.env` 100% free of AWS secrets.
- **Q: What happens if someone copies an S3 file URL or shares a presigned URL next week?**  
  *A:* Raw S3 URLs immediately return `403 AccessDenied` because Block All Public Access is ON. Even presigned GET URLs issued by `getDownloadUrl()` carry `expiresInSeconds: 300`, so they automatically expire after 5 minutes.
- **Q: Why do object keys start with `materials/course-{id}/{uuid}-{sanitizedName}`?**  
  *A:* Folder prefixes make the S3 bucket cleanly auditable by course/assignment/student, while `crypto.randomUUID()` prevents filename collisions and overwrites when different students upload identically named files (e.g., `lab1.pdf`), and `sanitizeFileName()` strips unsafe path characters.

## 6. Live Project Evidence Index

- **S3 Bucket (`ap-southeast-1`):** `ue-cloudlearn-files-ccs4301-7dfd0a` (Block Public Access ON, SSE-S3 `AES256`)
- **IAM Policy & Role:** `UECloudlearnEC2S3Policy` (`arn:aws:iam::<ACCOUNT_ID>:policy/UECloudlearnEC2S3Policy`) & `ue-cloudlearn-ec2-role` (`arn:aws:iam::<ACCOUNT_ID>:instance-profile/ue-cloudlearn-ec2-role`)
- **Live Verified S3 Objects:**
  - `materials/course-1/ffe53225-2ab6-4e7b-b3b7-0e738e637433-ccs4301-live-s3-handout.pdf` (Presigned GET `200`, Direct URL `403`)
  - `submissions/assignment-4/student-4/bc7e3329-6dd0-433d-a6b3-f2690e1f5440-cruz-assignment-4-live.pdf` (Presigned GET `200`, Direct URL `403`)
- **Console Screenshots (`docs/screenshots/`):** `aws-05-s3-objects.png`, `aws-06-s3-permissions.png`, `aws-07-iam-role-policy.png`
