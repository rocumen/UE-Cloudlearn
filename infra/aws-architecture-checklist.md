# AWS Free Tier Architecture & Provisioning Runbook — UE Cloudlearn

**Target Region:** `ap-southeast-1` (Singapore)  
**Provisioning Status:** `LIVE (ap-southeast-1 — Production Verified)` — Provisioned on `2026-11-19` and resumed/verified on `2026-11-20` at `http://54.255.186.17`; EC2 (`i-0613bbaf4edddf9be`) and RDS (`ue-cloudlearn-db`) are running for live inspection and screenshots.  
**Security Rule:** NEVER paste AWS Access Keys, `.pem` contents, RDS passwords, `JWT_SECRET`, or 12-digit AWS Account IDs into this document or any committed file.

---

## 1. Strict AWS Free Tier Cost Guardrails

All provisioned resources MUST adhere to AWS Free Tier limits (`$0.00` target):

- **Allowed Compute & Storage:**
  - **Amazon EC2:** 1x `t2.micro` or `t3.micro` (Ubuntu 24.04 LTS, 20 GB gp3 root EBS volume, 1 GB `/swapfile`).
  - **Amazon RDS:** 1x `db.t3.micro` or `db.t4g.micro` (MySQL 8.0, Single-AZ, 20 GB gp2/gp3 storage, `PubliclyAccessible = No`).
  - **Amazon S3:** 1x standard bucket (`< 5 GB` Free Tier allowance).
  - **Amazon VPC:** 1x custom VPC, 3 subnets, 1 Internet Gateway, 2 Route Tables, 2 Security Groups (`$0` base VPC resources).
- **Strictly Prohibited Without Explicit Owner Approval:**
  - **NO NAT Gateway** (incurs hourly + per-GB charges; `ue-cloudlearn-private-rt` routes `10.0.0.0/16 -> local` only).
  - **NO Application Load Balancer (ALB) / Network Load Balancer (NLB)** (Nginx on EC2 serves `/` and proxies `/api/` directly).
  - **NO Multi-AZ RDS**, oversized instances, provisioned IOPS (`io1`/`io2`), or unattached Elastic IPs.

---

## 2. Step-by-Step Provisioning Blueprint (`ap-southeast-1`)

Execute in order so Security Groups, Subnets, IAM Role, and RDS Endpoint flow cleanly into EC2 `.env`.

### Step 1 — Amazon VPC (`ue-cloudlearn-vpc`)
- Create VPC `ue-cloudlearn-vpc` with IPv4 CIDR `10.0.0.0/16`.
- Enable **DNS resolution** (`enableDnsSupport = true`) and **DNS hostnames** (`enableDnsHostnames = true`).

### Step 2 — Subnets (1 Public + 2 Private Across 2 AZs)
- `ue-cloudlearn-public-a`: `10.0.1.0/24` in `ap-southeast-1a` — enable **Auto-assign public IPv4 address**.
- `ue-cloudlearn-private-a`: `10.0.2.0/24` in `ap-southeast-1a` — Auto-assign public IPv4 **OFF**.
- `ue-cloudlearn-private-b`: `10.0.3.0/24` in `ap-southeast-1b` — Auto-assign public IPv4 **OFF** (second AZ satisfies RDS DB Subnet Group requirement).

### Step 3 — Internet Gateway & Route Tables
- Create Internet Gateway `ue-cloudlearn-igw` and attach to `ue-cloudlearn-vpc`.
- Create Public Route Table `ue-cloudlearn-public-rt`:
  - Routes: `10.0.0.0/16 -> local`, `0.0.0.0/0 -> ue-cloudlearn-igw`.
  - Subnet association: `ue-cloudlearn-public-a`.
- Create Private Route Table `ue-cloudlearn-private-rt`:
  - Routes: `10.0.0.0/16 -> local` **ONLY** (zero internet route, zero NAT Gateway = `$0` cost).
  - Subnet associations: `ue-cloudlearn-private-a`, `ue-cloudlearn-private-b`.

### Step 4 — Security Groups (Least-Privilege Network Ingress)
- Create `ue-cloudlearn-ec2-sg` inside `ue-cloudlearn-vpc`:
  - Inbound:
    - TCP `80` from `0.0.0.0/0` (Nginx HTTP web traffic)
    - TCP `443` from `0.0.0.0/0` (optional HTTPS if domain/TLS added later)
    - TCP `22` from `<ADMIN_IP>/32` (SSH restricted strictly to operator public IP)
  - Outbound: All traffic (required for `apt-get`/npm package installs, AWS S3 HTTPS 443 API calls, and TCP 3306 to RDS SG).
- Create `ue-cloudlearn-rds-sg` inside `ue-cloudlearn-vpc`:
  - Inbound:
    - TCP `3306` ONLY from source Security Group `ue-cloudlearn-ec2-sg` (NEVER `0.0.0.0/0`).
  - Outbound: Default.

### Step 5 — Private Amazon S3 Bucket
- Create bucket `ue-cloudlearn-files-<unique-suffix>` in `ap-southeast-1`.
- Confirm **Block All Public Access = ON** (all 4 public access block flags `true`).
- Confirm Default Encryption = **SSE-S3 (AES-256)**.
- Leave Bucket Policy empty (no public read/write). Object key prefixes created automatically on upload:
  - `materials/course-{courseId}/{uuid}-{sanitizedFileName}`
  - `assignments/course-{courseId}/{uuid}-{sanitizedFileName}`
  - `submissions/assignment-{assignmentId}/student-{studentId}/{uuid}-{sanitizedFileName}`

### Step 6 — AWS IAM Policy, Role & Instance Profile
- Update `REPLACE_SUFFIX` locally (never commit real personal suffix/Account IDs if restricted, or substitute the bucket suffix at provisioning time) when creating IAM Policy `UECloudlearnEC2S3Policy` from `infra/iam/ec2-s3-least-privilege-policy.json`:
  - Statement 1 (`AllowBucketList`): `s3:ListBucket` on bucket ARN.
  - Statement 2 (`AllowObjectCRUD`): `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on bucket `/*` ARN.
- Create IAM Role `ue-cloudlearn-ec2-role` using trust policy `infra/iam/ec2-trust-policy.json` (`ec2.amazonaws.com`).
- Attach `UECloudlearnEC2S3Policy` to `ue-cloudlearn-ec2-role`.
- Create Instance Profile `ue-cloudlearn-ec2-role` and add role `ue-cloudlearn-ec2-role`.

### Step 7 — Private Amazon RDS for MySQL 8.0
- Create DB Subnet Group `ue-cloudlearn-rds-subnets` spanning `ue-cloudlearn-private-a` and `ue-cloudlearn-private-b`.
- Create RDS instance `ue-cloudlearn-db`:
  - Engine: MySQL 8.0 (InnoDB, `utf8mb4_unicode_ci`)
  - Instance class: `db.t3.micro` or `db.t4g.micro` (Free Tier)
  - Availability: Single-AZ
  - Storage: 20 GB gp2/gp3 (disable storage autoscaling beyond Free Tier if undesired)
  - Initial database name: `ue_cloudlearn`
  - Connectivity: `PubliclyAccessible = No`, VPC `ue-cloudlearn-vpc`, DB Subnet Group `ue-cloudlearn-rds-subnets`, VPC Security Group `ue-cloudlearn-rds-sg`.
- Record the generated RDS writer endpoint (`<rds-endpoint>:3306`) after status becomes `available`.

### Step 8 — Amazon EC2 Application Host (`ue-cloudlearn-app-ec2`)
- Launch EC2 instance `ue-cloudlearn-app-ec2` in `ap-southeast-1a`:
  - AMI: Ubuntu Server 24.04 LTS (64-bit x86)
  - Instance type: `t2.micro` or `t3.micro` (Free Tier)
  - Root volume: 20 GB gp3
  - Network: `ue-cloudlearn-vpc` / `ue-cloudlearn-public-a`, Auto-assign public IP enabled
  - Security Group: `ue-cloudlearn-ec2-sg`
  - IAM Instance Profile: `ue-cloudlearn-ec2-role`
  - Key pair: `<team-keypair>.pem` (kept strictly outside the Git repository)

### Step 9 — Bootstrap, Database Initialization & Deployment on EC2
Run via SSH (`ssh -i /path/to/key.pem ubuntu@<EC2_PUBLIC_IP>`):
1. Copy repository to `/var/www/ue-cloudlearn` (e.g., `git clone` into `/var/www/ue-cloudlearn`) and run bootstrap:
   ```bash
   bash infra/scripts/ec2-bootstrap.sh
   ```
2. Create production `/var/www/ue-cloudlearn/.env` from `.env.example` and lock permissions (`chmod 600 /var/www/ue-cloudlearn/.env`):
   - Set `NODE_ENV=production`, `PORT=5000`
   - Set `CORS_ORIGIN=http://<EC2_PUBLIC_IP>`
   - Set `COOKIE_SECURE=false` (required for plain HTTP demo over EC2 public IP; set `true` only if HTTPS/TLS is added)
   - Set strong 64+ char random `JWT_SECRET`
   - Set `DB_HOST=<rds-endpoint>`, `DB_PORT=3306`, `DB_NAME=ue_cloudlearn`, `DB_USER`, `DB_PASSWORD`
   - Set `AWS_REGION=ap-southeast-1`, `S3_BUCKET_NAME=ue-cloudlearn-files-<unique-suffix>`, `STORAGE_MODE=s3`
   - Omit `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` (automatically resolved from `ue-cloudlearn-ec2-role`).
3. Initialize RDS MySQL schema and seed records directly from EC2 (the ONLY authorized host able to reach `ue-cloudlearn-rds-sg:3306`):
   ```bash
   mysql -h <rds-endpoint> -P 3306 -u <db-user> -p < /var/www/ue-cloudlearn/database/schema.sql
   mysql -h <rds-endpoint> -P 3306 -u <db-user> -p ue_cloudlearn < /var/www/ue-cloudlearn/database/seed.sql
   ```
4. Install backend prod deps and activate seeded `@ue-cloudlearn.edu.ph` demo passwords:
   ```bash
   cd /var/www/ue-cloudlearn/backend
   npm ci --omit=dev
   SEED_DEMO_PASSWORD="<chosen-demo-password>" npm run seed:passwords
   ```
5. Run automated deployment & verification:
   ```bash
   cd /var/www/ue-cloudlearn
   bash infra/scripts/deploy.sh
   ```
6. Configure PM2 boot persistence (run the exact `sudo env PATH=...` command printed by `pm2 startup`):
   ```bash
   pm2 startup
   pm2 save
   ```

---

## 3. Live Deployment Resource Ledger (`ap-southeast-1` — Production Verified)

> Records ONLY non-secret AWS resource names, IDs, AZs, CIDRs, and public HTTP endpoint. Passwords, JWT secrets, key material, and 12-digit AWS Account IDs remain strictly outside Git (`C:\Users\Admin\.ssh\`).

| Resource | Resource Name | Live AWS ID / Endpoint | Verified Notes |
|---|---|---|---|
| AWS Region | `ap-southeast-1` | `ap-southeast-1` | Singapore |
| VPC | `ue-cloudlearn-vpc` (`10.0.0.0/16`) | `vpc-08e1bc74978acedfc` | DNS hostnames & support ON |
| Public Subnet | `ue-cloudlearn-public-a` (`10.0.1.0/24`) | `subnet-0b6a8f718c4fa638f` | `ap-southeast-1a`, auto-assign IPv4 ON |
| Private Subnet A | `ue-cloudlearn-private-a` (`10.0.2.0/24`) | `subnet-04f0f74b1e94dcb53` | `ap-southeast-1a` |
| Private Subnet B | `ue-cloudlearn-private-b` (`10.0.3.0/24`) | `subnet-09ad1b8fa7b8bbeea` | `ap-southeast-1b` |
| Internet Gateway | `ue-cloudlearn-igw` | `igw-0f79d6733305e4cd1` | Attached to `vpc-08e1bc74978acedfc` |
| Public Route Table | `ue-cloudlearn-public-rt` | `rtb-0d13cd600ecf44dbb` | `0.0.0.0/0 -> igw-0f79d6733305e4cd1` |
| Private Route Table | `ue-cloudlearn-private-rt` | `rtb-06e885a597a4dacf7` | `10.0.0.0/16 -> local` ONLY (no NAT GW) |
| EC2 Security Group | `ue-cloudlearn-ec2-sg` | `sg-0ffdde6854196014f` | TCP 80/443 `0.0.0.0/0`, TCP 22 `<OPERATOR_IP>/32` |
| RDS Security Group | `ue-cloudlearn-rds-sg` | `sg-06ac3f3f332f7b98a` | TCP 3306 ONLY from `sg-0ffdde6854196014f` |
| DB Subnet Group | `ue-cloudlearn-rds-subnets` | `ue-cloudlearn-rds-subnets` | `subnet-04f0f74b1e94dcb53` + `subnet-09ad1b8fa7b8bbeea` |
| RDS Instance | `ue-cloudlearn-db` (MySQL `8.0.46`) | `ue-cloudlearn-db.c9guuy4809t8.ap-southeast-1.rds.amazonaws.com:3306` | `db.t3.micro`, Single-AZ, 20 GB `gp2`, `PubliclyAccessible=false` |
| S3 Bucket | `ue-cloudlearn-files-ccs4301-7dfd0a` | `s3://ue-cloudlearn-files-ccs4301-7dfd0a` | Block All Public Access ON (all 4 flags), SSE-S3 `AES256` |
| IAM Policy | `UECloudlearnEC2S3Policy` | `arn:aws:iam::<ACCOUNT_ID>:policy/UECloudlearnEC2S3Policy` | Scoped only to `ue-cloudlearn-files-ccs4301-7dfd0a` |
| IAM Role / Profile | `ue-cloudlearn-ec2-role` | `arn:aws:iam::<ACCOUNT_ID>:instance-profile/ue-cloudlearn-ec2-role` | Verified via EC2 IMDSv2 |
| EC2 Key Pair | `ue-cloudlearn-ec2-key` | `ue-cloudlearn-ec2-key` | `.pem` stored outside repo at `C:\Users\Admin\.ssh\` |
| EC2 Instance | `ue-cloudlearn-app-ec2` (`t3.micro`) | `i-0613bbaf4edddf9be` (`10.0.1.57` private, `54.255.186.17` current public; `47.131.249.155` initial deploy) | Ubuntu 24.04 (`ami-071c84f5b32b09602`), 20 GB `gp3`, Nginx + PM2 (`pm2-ubuntu` enabled), 1 GB swap; public IPv4 refreshes on stop/start without Elastic IP |
| Live App URL | `http://54.255.186.17` | `http://54.255.186.17/api/health` | `GET /` HTTP 200; `/api/health` `{"status":"ok","db":"connected"}` |

---

## 4. Chapter 5 & Live Demo Evidence Checklist (Parts 2 & 3)

Verify and capture clean screenshots for the formal paper (`docs/05-chapter-5-aws-infrastructure.md`) and presentation:

- [ ] **VPC & Networking (`Reynald Ocumen`):** VPC resource map showing `ue-cloudlearn-vpc`, `public-a`, `private-a`, `private-b`, `ue-cloudlearn-igw`, and both Route Tables (`private-rt` has local route only).
- [ ] **Security Groups (`Reynald Ocumen`):** `ue-cloudlearn-ec2-sg` inbound rules (`80`, `443`, `22/32`) and `ue-cloudlearn-rds-sg` inbound rule (`3306` referencing `ue-cloudlearn-ec2-sg`).
- [ ] **Amazon RDS (`Mark Cyron Feratero`):** `ue-cloudlearn-db` summary showing `PubliclyAccessible = No`, Private Subnets, and EC2 `mysql` query proof (`SHOW TABLES; SELECT COUNT(*) FROM users;`).
- [ ] **Amazon S3 & IAM (`Ryan Palacios`):** S3 bucket Block Public Access = ON, uploaded prefix objects (`materials/`, `assignments/`, `submissions/`), IAM Role `ue-cloudlearn-ec2-role` with `UECloudlearnEC2S3Policy`, and `verify-live.sh` IMDSv2 role output.
- [ ] **Amazon EC2 Deployment (`Mark Bautista`):** Running EC2 instance console view, `pm2 status`, `sudo nginx -t`, and `curl -s http://127.0.0.1/api/health`.
- [ ] **Live Integration Demo (`Mark Costin`):** End-to-end browser login -> course enrollment -> S3 upload -> presigned URL download -> grading -> learning records verified in RDS.

---

## 5. Pause & Resume AWS (Zero-Waste Free Tier Workflow)

To conserve Free Tier compute hours (`750 hrs/month`) between screenshot capture and the **Nov 27, 2026** defense without deleting RDS data or S3 objects:

### Pause After Capturing Console & App Screenshots
```bash
aws ec2 stop-instances --region ap-southeast-1 --instance-ids i-0613bbaf4edddf9be
aws rds stop-db-instance --region ap-southeast-1 --db-instance-identifier ue-cloudlearn-db
```
> **7-Day RDS Note:** AWS automatically restarts a stopped RDS instance after **7 days** (stopping on Nov 19 means RDS auto-starts right around **Nov 26** in time for final defense rehearsal). Confirm `stopped` status via `describe-instances` and `describe-db-instances`.

### Resume Before Rehearsal / Nov 27 Live Defense
1. Start RDS first, then EC2 (both start cleanly in ~3–5 minutes):
   ```bash
   aws rds start-db-instance --region ap-southeast-1 --db-instance-identifier ue-cloudlearn-db
   aws ec2 start-instances --region ap-southeast-1 --instance-ids i-0613bbaf4edddf9be
   aws rds wait db-instance-available --region ap-southeast-1 --db-instance-identifier ue-cloudlearn-db
   aws ec2 wait instance-status-ok --region ap-southeast-1 --instance-ids i-0613bbaf4edddf9be
   ```
2. Fetch the newly assigned EC2 Public IPv4 (since no paid/unattached Elastic IP is used):
   ```bash
   aws ec2 describe-instances --region ap-southeast-1 --instance-ids i-0613bbaf4edddf9be --query "Reservations[0].Instances[0].PublicIpAddress" --output text
   ```
3. If your operator public IP changed, authorize the new `<NEW_OPERATOR_IP>/32` for TCP `22` on `sg-0ffdde6854196014f`.
4. SSH into EC2 (`ssh -i C:\Users\Admin\.ssh\ue-cloudlearn-ec2-key.pem ubuntu@<NEW_EC2_PUBLIC_IP>`):
   - If the EC2 Public IPv4 changed, update `CORS_ORIGIN=http://<NEW_EC2_PUBLIC_IP>` inside `/var/www/ue-cloudlearn/.env` (`chmod 600` stays intact).
   - Reload PM2 environment and verify live services (`pm2-ubuntu` and `nginx` auto-start on boot):
     ```bash
     pm2 restart ue-cloudlearn-api --update-env
     bash /var/www/ue-cloudlearn/infra/scripts/verify-live.sh
     ```

---

## 6. Cost Guardrail & Post-Demo Teardown Checklist

After final CCS4301 grading/defense (or whenever shutting down the environment to keep billing at `$0.00`):

1. **Terminate EC2 instance** `ue-cloudlearn-app-ec2` (confirm EBS root volume `DeleteOnTermination` cleans up; release any manually allocated Elastic IP if unused).
2. **Delete RDS instance** `ue-cloudlearn-db` (skip final snapshot when tearing down temporary class demo data, and disable deletion protection if set).
3. **Empty and delete S3 bucket** `ue-cloudlearn-files-<unique-suffix>` (`aws s3 rm s3://<bucket> --recursive`, then delete bucket).
4. **Delete DB Subnet Group** `ue-cloudlearn-rds-subnets` (after RDS deletion completes).
5. **Delete Security Groups** `ue-cloudlearn-rds-sg` and `ue-cloudlearn-ec2-sg`.
6. **Detach and delete Internet Gateway** `ue-cloudlearn-igw`, delete Subnets (`public-a`, `private-a`, `private-b`), Route Tables (`public-rt`, `private-rt`), and VPC `ue-cloudlearn-vpc`.
7. **Remove IAM Instance Profile, Role, and Policy** (`ue-cloudlearn-ec2-role`, `UECloudlearnEC2S3Policy`).
8. **Verify AWS Billing & Cost Management** shows `$0.00` active/accrued non-Free-Tier charges and zero orphaned EC2/RDS/EBS/EIP resources in `ap-southeast-1`.
