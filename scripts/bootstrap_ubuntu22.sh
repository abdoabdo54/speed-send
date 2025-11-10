#!/usr/bin/env bash
set -euo pipefail

# Enhanced Bootstrap script for Speed-Send on Ubuntu 22.04
# This script installs Docker and sets up the basic environment
# For complete installation, use setup.sh instead
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/yourusername/speed-send/main/scripts/bootstrap_ubuntu22.sh -o bootstrap.sh
#   bash bootstrap.sh

if [ "${EUID}" -ne 0 ]; then
  echo "Please run as root: sudo bash scripts/bootstrap_ubuntu22.sh"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg lsb-release

# Install Docker Engine and Docker Compose plugin (Ubuntu 22.04)
install_docker() {
  if command -v docker >/dev/null 2>&1; then
    echo "Docker already installed"
    return
  fi

  install_dir=/etc/apt/keyrings
  mkdir -p "$install_dir"
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o "$install_dir/docker.gpg"
  chmod a+r "$install_dir/docker.gpg"

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=$install_dir/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update -y
  apt-get install -y \
    docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  systemctl enable docker
  systemctl start docker
}

install_docker

# Allow current non-root user to run docker (optional; requires re-login)
if id "${SUDO_USER:-$USER}" >/dev/null 2>&1; then
  usermod -aG docker "${SUDO_USER:-$USER}" || true
fi

echo "Docker version: $(docker --version)"
echo "Docker Compose version: $(docker compose version || true)"

echo "\nBootstrap complete. Next steps:" 
echo "1) Clone your repository (if not already):"
echo "   git clone https://github.com/abdoabdo54/speed-send.git && cd speed-send"
echo "2) Create a .env file at project root to override secrets (optional)."
echo "3) Build and start services:"
echo "   docker compose up -d --build"
echo "4) Check status/logs:"
echo "   docker compose ps && docker compose logs -f"
