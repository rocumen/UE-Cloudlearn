# Study & Presentation Packet 07 — Reynald Ocumen

**Role:** Cloud Networking & QA Lead (Amazon VPC, Security Groups & Testing)  
**Project:** UE Cloudlearn (`CCS_4301 / CS1G` — First Semester 2026–2027)  
**Presentation Date:** November 27, 2026  
**Also Study:** `team-docs/00-MASTER-STUDY-GUIDE.md` (mandatory for Part 4 Q&A)

---

## 1. Your Project Responsibilities

- Own **Amazon VPC** network design (`ue-cloudlearn-vpc`, `vpc-08e1bc74978acedfc`, `10.0.0.0/16`): 1 Public Subnet (`ue-cloudlearn-public-a` `10.0.1.0/24`), 2 Private Subnets (`ue-cloudlearn-private-a` `10.0.2.0/24` in `1a`, `ue-cloudlearn-private-b` `10.0.3.0/24` in `1b`), Internet Gateway (`igw-0f79d6733305e4cd1`), Public Route Table (`rtb-0d13cd600ecf44dbb`), and local-only Private Route Table (`rtb-06e885a597a4dacf7`).
- Own **Security Groups** (`ue-cloudlearn-ec2-sg` `sg-0ffdde6854196014f` and `ue-cloudlearn-rds-sg` `sg-06ac3f3f332f7b98a`) enforcing least-privilege SG-to-SG isolation on port `3306`.
- Own **Chapter 6 System Testing & Evaluation**: automated (`27/27` Vitest), UI audit (`15/15`), and live AWS E2E testing (`30/30` cases PASS including `ETIMEDOUT` external port `3306` test).
- Lead the **Part 2 VPC, Subnets, Route Tables & Security Groups Console Demo** and present the **Chapter 6 QA Summary**.

## 2. Your Assigned Formal Paper Sections (`docs/`)

- **Chapter 5.4 & 5.5 (`docs/05-chapter-5-aws-infrastructure.md`):** Amazon VPC Configuration (`Table 5.4`, `Figures 5.5`–`5.6`) and Security Groups Configuration (`Table 5.5`, `Figure 5.7`).
- **Chapter 6 (`docs/06-chapter-6-testing-evaluation.md`, Sections 6.1–6.7):** Testing Methodology (`Tables 6.1`–`6.2`), Functional, Database, Cloud Storage, Network/Security, and Integration Testing, 30-Case Matrix (`Table 6.3`), and Issues Resolved (`Table 6.4`).
- **References & Appendix F (`docs/07-references-apa7.md`, `docs/08-appendices.md`):** APA 7th Edition Citations + Technical Configs, Pause/Resume Runbook, and UE Print/Export Checklist.

## 3. Your GitHub & Verification Checklist

- [x] Live VPC, Subnets, IGW, Route Tables, and Security Groups provisioned & documented in `infra/aws-architecture-checklist.md`.
- [x] Network isolation & security verification executed live: external `:3306` `ETIMEDOUT`, direct S3 `403`, RBAC `403`, IMDSv2 IAM role check.
- [x] Chapter 6 testing matrix (`30/30` PASS), APA 7th references, and Appendices finalized (`docs/06`, `docs/07`, `docs/08`).
- [x] Captured live VPC & Security Group Console screenshots (`aws-01-vpc-resource-map.png`, `aws-02-route-tables.png`, `aws-03-security-groups.png`).

## 4. Your Live Presentation Script (Part 2 — VPC, Subnets, SGs & QA Summary, 3–4 mins)

1. **Part 2 — Amazon VPC Console Walkthrough (2 mins):**
   - Open AWS Console (`ap-southeast-1`) -> **VPC -> Your VPCs -> `ue-cloudlearn-vpc` (`vpc-08e1bc74978acedfc`, `10.0.0.0/16`)**.
   - Click the **Resource map** tab -> visually trace:
     - **Public Subnet:** `ue-cloudlearn-public-a` (`10.0.1.0/24`, `ap-southeast-1a`) -> `rtb-0d13cd600ecf44dbb` -> `0.0.0.0/0` -> `ue-cloudlearn-igw` (`igw-0f79d6733305e4cd1`).
     - **Private Subnets (2 AZs):** `ue-cloudlearn-private-a` (`10.0.2.0/24`, `1a`) and `ue-cloudlearn-private-b` (`10.0.3.0/24`, `1b`) -> `rtb-06e885a597a4dacf7` -> **`10.0.0.0/16 -> local` ONLY** (emphasize zero IGW and zero paid NAT Gateway!).
2. **Part 2 — Security Groups Walkthrough (1 min):**
   - Open **Security Groups -> `ue-cloudlearn-ec2-sg` (`sg-0ffdde6854196014f`)**: show Inbound TCP `80`/`443` (`0.0.0.0/0`) and restricted SSH TCP `22` (`<OPERATOR_IP>/32`).
   - Open **`ue-cloudlearn-rds-sg` (`sg-06ac3f3f332f7b98a`)**: point directly to Inbound **TCP `3306` Source = `sg-0ffdde6854196014f` (`ue-cloudlearn-ec2-sg`)** — proving zero public `0.0.0.0/0` access to MySQL!
3. **Chapter 6 QA & Security Verification Summary (1 min):**
   - Summarize verified QA metrics (`Table 6.2` & `Table 6.3`): **27/27** Vitest automated tests passing, **15/15** UI accessibility audit passing, and **30/30** live cloud checks passing — including external `:3306` connection timeout (`ETIMEDOUT`), S3 direct `403` vs. presigned `200`, and student `GET /api/users` `403`.
   - Hand off to **Mark Costin** for **Part 3 Live Integration Demo**.

## 5. Role-Specific Q&A Practice

- **Q: What distinguishes a public subnet from a private subnet in Amazon VPC?**  
  *A:* A subnet is public when its associated Route Table contains a default route (`0.0.0.0/0`) targeting an Internet Gateway (`igw-0f79d6733305e4cd1`), as in `rtb-0d13cd600ecf44dbb`. A subnet is private when its Route Table (`rtb-06e885a597a4dacf7`) contains ONLY the local VPC CIDR (`10.0.0.0/16 -> local`), preventing direct internet routing.
- **Q: Explain how stateful Security Group referencing protects `ue-cloudlearn-db`.**  
  *A:* Instead of allowing `0.0.0.0/0` or brittle hardcoded IPs on TCP `3306`, `ue-cloudlearn-rds-sg` (`sg-06ac3f3f332f7b98a`) restricts inbound MySQL exclusively to traffic sourced from `sg-0ffdde6854196014f` (`ue-cloudlearn-ec2-sg`). Because AWS Security Groups are stateful, query responses back to EC2 are automatically allowed while all external connection attempts drop/timeout (`ETIMEDOUT`).
- **Q: Why did you configure two private subnets (`1a` and `1b`) without a NAT Gateway?**  
  *A:* Amazon RDS requires a DB Subnet Group spanning at least two Availability Zones (`subnet-04f0f74b1e94dcb53` in `1a`, `subnet-09ad1b8fa7b8bbeea` in `1b`). Meanwhile, RDS does not initiate outbound internet calls, and NAT Gateways cost ~$32+/month outside Free Tier — omitting NAT keeps the private tier both completely isolated and `$0`.
- **Q: What real deployment problems did your QA & DevOps workflow catch and fix?**  
  *A:* As documented in Chapter 6 (`Table 6.4`), pre-flight verification caught missing IAM provisioning permissions on the deployment user (resolved cleanly with `UECloudlearnProvisionIAM` instead of static EC2 keys), Windows `git archive` CRLF line endings on `.sh` scripts (fixed with `-c core.autocrlf=false`), and 1 GiB RAM headroom (fixed with 1 GB `/swapfile` + `768` MB Node heap cap).

## 6. Live Project Evidence Index

- **VPC & Subnets (`ap-southeast-1`):** `vpc-08e1bc74978acedfc` (`10.0.0.0/16`), `subnet-0b6a8f718c4fa638f` (`10.0.1.0/24`), `subnet-04f0f74b1e94dcb53` (`10.0.2.0/24`), `subnet-09ad1b8fa7b8bbeea` (`10.0.3.0/24`)
- **IGW & Route Tables:** `igw-0f79d6733305e4cd1`, `rtb-0d13cd600ecf44dbb` (public), `rtb-06e885a597a4dacf7` (private `local` only)
- **Security Groups:** `sg-0ffdde6854196014f` (`ue-cloudlearn-ec2-sg`), `sg-06ac3f3f332f7b98a` (`ue-cloudlearn-rds-sg`)
- **QA Matrix Results:** `27/27` Vitest PASS, `15/15` UI Audit PASS, `30/30` Chapter 6 Matrix PASS (`docs/06-chapter-6-testing-evaluation.md`)
- **Console Screenshots (`docs/screenshots/`):** `aws-01-vpc-resource-map.png`, `aws-02-route-tables.png`, `aws-03-security-groups.png`
