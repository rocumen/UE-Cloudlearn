#!/usr/bin/env bash
set -euo pipefail

# Deploy or update UE Cloudlearn on Ubuntu 24.04 EC2.
# Expects a pre-configured /var/www/ue-cloudlearn/.env file (never prints secret values).

APP_DIR="${APP_DIR:-/var/www/ue-cloudlearn}"
cd "${APP_DIR}"

echo "==> [1/6] Checking environment file..."
if [[ ! -f "${APP_DIR}/.env" ]]; then
  echo "ERROR: ${APP_DIR}/.env not found. Create it from .env.example and chmod 600 it before deploying." >&2
  exit 1
fi

ENV_MODE="$(stat -c '%a' "${APP_DIR}/.env" 2>/dev/null || echo 'unknown')"
if [[ "${ENV_MODE}" != "600" ]]; then
  echo "WARNING: ${APP_DIR}/.env permissions are ${ENV_MODE}; recommended is 600 (chmod 600 ${APP_DIR}/.env)." >&2
fi

echo "==> [2/6] Pulling latest code (if git origin is configured)..."
if [[ -d "${APP_DIR}/.git" ]] && git -C "${APP_DIR}" remote get-url origin >/dev/null 2>&1; then
  git -C "${APP_DIR}" pull --ff-only origin main
else
  echo "Skipping git pull (no .git/origin remote configured)."
fi

echo "==> [3/6] Installing backend production dependencies..."
(
  cd "${APP_DIR}/backend"
  npm ci --omit=dev
)

echo "==> [4/6] Installing frontend dependencies and building production bundle..."
(
  cd "${APP_DIR}/frontend"
  npm ci
  NODE_OPTIONS="--max-old-space-size=768" npm run build
)

echo "==> [5/6] Updating Nginx reverse-proxy configuration..."
sudo cp "${APP_DIR}/infra/nginx/ue-cloudlearn.conf" /etc/nginx/sites-available/ue-cloudlearn
sudo ln -sfn /etc/nginx/sites-available/ue-cloudlearn /etc/nginx/sites-enabled/ue-cloudlearn
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo "==> [6/6] Starting/reloading Express API with PM2..."
if pm2 describe ue-cloudlearn-api >/dev/null 2>&1; then
  pm2 restart "${APP_DIR}/infra/pm2/ecosystem.config.cjs" --update-env
else
  pm2 start "${APP_DIR}/infra/pm2/ecosystem.config.cjs"
fi
pm2 save
sleep 2

echo "==> Running post-deploy live verification..."
bash "${APP_DIR}/infra/scripts/verify-live.sh"
