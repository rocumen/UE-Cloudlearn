# Study & Presentation Packet 06 — Mark Bautista

**Role:** Cloud Hosting & Deployment Lead (Amazon EC2 & GitHub Workflow)  
**Project:** UE Cloudlearn (`CCS_4301 / CS1G` — First Semester 2026–2027)  
**Presentation Date:** November 27, 2026  
**Also Study:** `team-docs/00-MASTER-STUDY-GUIDE.md` (mandatory for Part 4 Q&A)

---

## 1. Your Project Responsibilities

- Own **Amazon EC2** (`ue-cloudlearn-app-ec2`, instance `i-0613bbaf4edddf9be`, `t3.micro`, Ubuntu 24.04 LTS `ami-071c84f5b32b09602`, 20 GB `gp3` + 1 GB `/swapfile`), host bootstrap (`infra/scripts/ec2-bootstrap.sh`), deployment (`infra/scripts/deploy.sh`), and live verification (`infra/scripts/verify-live.sh`).
- Own **Nginx 1.24.0** (`infra/nginx/ue-cloudlearn.conf`, `client_max_body_size 16M`, static React SPA `/` + `/api/*` proxy to `127.0.0.1:5000`) and **PM2 7.1.2** (`infra/pm2/ecosystem.config.cjs`, `ue-cloudlearn-api` + `pm2-ubuntu.service` boot persistence).
- Co-own **GitHub repository hygiene** (`.gitignore`, `.env.example`, root `README.md`, Free Tier Pause/Resume workflow in `infra/aws-architecture-checklist.md` Section 5).
- Lead the **Part 2 Amazon EC2 Console, Running Server & GitHub Walkthrough**.

## 2. Your Assigned Formal Paper Sections (`docs/`)

- **Chapter 3.6 (`docs/03-chapter-3-development.md`):** GitHub Repository & Version Control (`Table 3.6`, `Figures 3.13`–`3.14`).
- **Chapter 5.3 & 5.9 (`docs/05-chapter-5-aws-infrastructure.md`):** Amazon EC2 Configuration (`Table 5.3`, `Figures 5.3`–`5.4`) and Application Deployment & Pause/Resume Free Tier Operations.
- **Appendix B & Appendix D (`docs/08-appendices.md`):** GitHub Repo Tree & Commit Log + EC2 Console Screenshots (`aws-08`, `aws-09`).

## 3. Your GitHub & Verification Checklist

- [x] `.gitignore`, `.env.example`, `README.md`, `infra/nginx/ue-cloudlearn.conf`, `infra/pm2/ecosystem.config.cjs`.
- [x] `infra/scripts/{ec2-bootstrap.sh,deploy.sh,verify-live.sh}` verified with strict LF line endings (`100755` executable mode in Git).
- [x] Live EC2 deployment verified on Ubuntu 24.04 (`pm2-ubuntu` enabled, Nginx active, `verify-live.sh` passed all 5 live checks).
- [x] Captured live EC2 Console screenshots (`aws-08-ec2-instance.png`, `aws-09-ec2-security.png`) and GitHub repository screenshots (`github-01-repo-structure.png`, `github-02-commits.png`).

## 4. Your Live Presentation Script (Part 2 — EC2, Nginx/PM2 & GitHub Demo, 3–4 mins)

1. **Part 2 — Amazon EC2 Console Walkthrough (1.5 mins):**
   - Open AWS Console (`ap-southeast-1`) -> **EC2 -> Instances -> `ue-cloudlearn-app-ec2` (`i-0613bbaf4edddf9be`)**.
   - Show **Instance state:** `Running`, **Instance type:** `t3.micro` (Free Tier), **Public IPv4 address** (`47.131.249.155` at initial deploy; `54.255.186.17` post-resume `2026-11-20`; refreshed IP on Nov 27), **Private IPv4:** `10.0.1.57`.
   - Open **Networking** & **Security** tabs -> verify **VPC** `ue-cloudlearn-vpc`, **Subnet** `ue-cloudlearn-public-a`, **Security group** `ue-cloudlearn-ec2-sg`, and **IAM Role** `ue-cloudlearn-ec2-role`.
2. **Running Server Proof via SSH (1.5 mins — NEVER print `.env`!):**
   ```bash
   pm2 status
   sudo systemctl status nginx --no-pager
   bash /var/www/ue-cloudlearn/infra/scripts/verify-live.sh
   ```
   - Point out `ue-cloudlearn-api` `online`, Nginx `active`, `/api/health` returning `{"status":"ok","db":"connected"}`, `/` returning `HTTP/1.1 200 OK`, and IMDSv2 reporting `ue-cloudlearn-ec2-role`.
3. **GitHub Repository Walkthrough (1 min):**
   - Open `https://github.com/rocumen/UE-Cloudlearn` -> show clean folder structure (`frontend/`, `backend/`, `database/`, `infra/`, `docs/`, `team-docs/`), `.env.example` (zero real secrets), `README.md`, and **Commits** history showing clean progress across all system modules.

## 5. Role-Specific Q&A Practice

- **Q: Trace what happens when a user visits `http://<EC2_PUBLIC_IP>` vs. `http://<EC2_PUBLIC_IP>/api/courses`.**  
  *A:* Traffic arrives via `igw-0f79d6733305e4cd1` and passes `sg-0ffdde6854196014f` on TCP `80` into **Nginx**. For `/courses`, Nginx executes `try_files $uri $uri/ /index.html;` and serves the compiled React SPA from `/var/www/ue-cloudlearn/frontend/dist`. For `/api/courses`, `location /api/` proxies the request over HTTP/1.1 to Express listening on `http://127.0.0.1:5000`.
- **Q: Why run Express under PM2 (`ecosystem.config.cjs`) instead of `node src/server.js`?**  
  *A:* A foreground `node` process dies on SSH disconnect or unhandled crash. PM2 keeps `ue-cloudlearn-api` daemonized, caps restarts at `350M`, manages logs, and automatically boots Express when EC2 starts via `pm2-ubuntu.service`.
- **Q: Why did `ec2-bootstrap.sh` configure a 1 GB `/swapfile` and `deploy.sh` pass `NODE_OPTIONS="--max-old-space-size=768"`?**  
  *A:* A `t3.micro` instance has 1 GiB RAM, so TypeScript compilation plus Vite bundling can trigger an OOM kill without swap space. With 1 GB swap and the 768 MB heap cap, `tsc --noEmit && vite build` completed smoothly in `5.42s`.
- **Q: What happens if you stop and restart EC2 before the Nov 27 defense?**  
  *A:* Stopping EC2 pauses compute billing while keeping disk data intact, and starting it assigns a new dynamic public IPv4 (avoiding Elastic IP charges). Per `infra/aws-architecture-checklist.md` Section 5, we simply update `CORS_ORIGIN=http://<NEW_PUBLIC_IP>` in `/var/www/ue-cloudlearn/.env`, run `pm2 restart ue-cloudlearn-api --update-env`, and run `verify-live.sh`.

## 6. Live Project Evidence Index

- **EC2 Instance:** `ue-cloudlearn-app-ec2` (`i-0613bbaf4edddf9be`, `t3.micro`, Ubuntu 24.04 `ami-071c84f5b32b09602`, private `10.0.1.57`, initial `47.131.249.155` / resumed `54.255.186.17`)
- **Operational Files:** `infra/nginx/ue-cloudlearn.conf`, `infra/pm2/ecosystem.config.cjs`, `infra/scripts/{ec2-bootstrap,deploy,verify-live}.sh`, `infra/aws-architecture-checklist.md`
- **GitHub Repository:** `https://github.com/rocumen/UE-Cloudlearn`
- **Live Verification:** `verify-live.sh` -> `ALL LIVE CHECKS PASSED.` (`PM2 online`, `Nginx active`, `db: connected`, `HTTP 200`, `IMDSv2 ue-cloudlearn-ec2-role`)
- **Console & GitHub Screenshots (`docs/screenshots/`):** `aws-08-ec2-instance.png`, `aws-09-ec2-security.png`, `github-01-repo-structure.png`, `github-02-commits.png`
