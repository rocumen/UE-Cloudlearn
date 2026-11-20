#!/usr/bin/env bash
set -euo pipefail

# Bootstrap Ubuntu 24.04 EC2 instance (t2.micro / t3.micro Free Tier) for UE Cloudlearn.
# Idempotently configures 1 GB swap, Node.js 20 LTS, Nginx, mysql-client, PM2, and /var/www/ue-cloudlearn.

if [[ "${EUID}" -eq 0 ]]; then
  SUDO=""
else
  SUDO="sudo"
fi

echo "==> [1/6] Configuring 1 GB swapfile (prevents Vite build OOM on 1 GB RAM)..."
if [[ ! -f /swapfile ]] && [[ "$(swapon --show --noheadings | wc -l)" -eq 0 ]]; then
  ${SUDO} fallocate -l 1G /swapfile || ${SUDO} dd if=/dev/zero of=/swapfile bs=1M count=1024 status=progress
  ${SUDO} chmod 600 /swapfile
  ${SUDO} mkswap /swapfile
  ${SUDO} swapon /swapfile
elif [[ -f /swapfile ]] && ! swapon --show | grep -q '/swapfile'; then
  ${SUDO} chmod 600 /swapfile
  ${SUDO} swapon /swapfile
fi

if [[ -f /swapfile ]] && ! grep -q '^/swapfile ' /etc/fstab; then
  echo '/swapfile none swap sw 0 0' | ${SUDO} tee -a /etc/fstab >/dev/null
fi

echo "==> [2/6] Installing base packages (curl, git, nginx, mysql-client)..."
${SUDO} apt-get update -y
${SUDO} env DEBIAN_FRONTEND=noninteractive apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  git \
  nginx \
  mysql-client

echo "==> [3/6] Installing Node.js 20 LTS (if missing or < v20)..."
NEED_NODE=true
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
  if [[ "${NODE_MAJOR}" -ge 20 ]]; then
    NEED_NODE=false
  fi
fi

if [[ "${NEED_NODE}" == "true" ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | ${SUDO} -E bash -
  ${SUDO} env DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
fi

echo "==> [4/6] Installing global PM2..."
if ! command -v pm2 >/dev/null 2>&1; then
  ${SUDO} npm install -g pm2
fi

echo "==> [5/6] Preparing application directory /var/www/ue-cloudlearn..."
${SUDO} mkdir -p /var/www/ue-cloudlearn
if id -u ubuntu >/dev/null 2>&1; then
  ${SUDO} chown -R ubuntu:ubuntu /var/www/ue-cloudlearn
fi

echo "==> [6/6] Enabling and starting Nginx..."
${SUDO} systemctl enable nginx
${SUDO} systemctl start nginx

echo ""
echo "Bootstrap complete:"
echo "  Node:   $(node -v)"
echo "  npm:    $(npm -v)"
echo "  PM2:    $(pm2 -v)"
echo "  Nginx:  $(nginx -v 2>&1)"
echo "  MySQL:  $(mysql --version)"
free -h
