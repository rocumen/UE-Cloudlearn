#!/usr/bin/env bash
set -euo pipefail

# Verify live UE Cloudlearn EC2 runtime: PM2, Nginx, /api/health (DB ping), SPA root, and IMDSv2 IAM role name.
# Security guarantee: never requests or prints temporary IAM credentials or .env contents.

echo "==> [1/5] Checking PM2 process ue-cloudlearn-api..."
pm2 describe ue-cloudlearn-api >/dev/null
PM2_STATUS="$(pm2 jlist | node -e "const fs = require('fs'); const list = JSON.parse(fs.readFileSync(0, 'utf8')); const app = list.find((item) => item.name === 'ue-cloudlearn-api'); const status = app && app.pm2_env ? app.pm2_env.status : 'missing'; console.log(status); if (status !== 'online') process.exit(1);")"
echo "PM2 ue-cloudlearn-api status: ${PM2_STATUS}"

echo "==> [2/5] Checking Nginx configuration and service..."
sudo nginx -t
systemctl is-active --quiet nginx
echo "Nginx service: active"

echo "==> [3/5] Checking /api/health (App + RDS MySQL connectivity)..."
HEALTH_JSON="$(curl -fsS --max-time 10 http://127.0.0.1/api/health)"
node -e "const body = JSON.parse(process.argv[1]); if (!body.success || body.data?.status !== 'ok' || body.data?.db !== 'connected') { console.error('Unexpected health payload:', process.argv[1]); process.exit(1); } console.log('Health check passed:', JSON.stringify(body.data));" "${HEALTH_JSON}"

echo "==> [4/5] Checking frontend SPA root HTTP 200..."
ROOT_STATUS_LINE="$(curl -fsSI --max-time 10 http://127.0.0.1/ | head -n 1 | tr -d '\r')"
if ! echo "${ROOT_STATUS_LINE}" | grep -q " 200 "; then
  echo "ERROR: Expected HTTP 200 on /, got: ${ROOT_STATUS_LINE}" >&2
  exit 1
fi
echo "Frontend root response: ${ROOT_STATUS_LINE}"

echo "==> [5/5] Checking EC2 IMDSv2 IAM Instance Profile attachment..."
IMDS_TOKEN="$(curl -fsS --max-time 2 -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 60")"
IAM_ROLE_NAME="$(curl -fsS --max-time 2 -H "X-aws-ec2-metadata-token: ${IMDS_TOKEN}" "http://169.254.169.254/latest/meta-data/iam/security-credentials/" | tr -d '\r' | head -n 1)"
if [[ -z "${IAM_ROLE_NAME}" ]]; then
  echo "ERROR: No IAM role attached to EC2 instance metadata." >&2
  exit 1
fi
echo "IAM Instance Profile role attached: ${IAM_ROLE_NAME}"

echo ""
echo "ALL LIVE CHECKS PASSED."
