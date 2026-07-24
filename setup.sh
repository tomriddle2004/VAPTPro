#!/usr/bin/env bash
# ============================================================
# VAPT Pro — Linux Setup & Deployment Script
# Supports: Ubuntu 20.04+, Debian 11+, Arch Linux, Kali Linux
#
# Usage:
#   chmod +x setup.sh
#   sudo ./setup.sh
# ============================================================

set -euo pipefail

# ── Colors ────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
header()  { echo -e "\n${BOLD}${CYAN}$*${NC}\n$(printf '─%.0s' {1..60})"; }

# ── Root check ────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  error "This script must be run as root. Use: sudo ./setup.sh"
fi

# ── Detect OS ─────────────────────────────────────────────
if command -v apt-get &>/dev/null; then
  PKG_MGR="apt-get"
  PKG_UPDATE="apt-get update -qq"
  PKG_INSTALL="apt-get install -y -qq"
elif command -v pacman &>/dev/null; then
  PKG_MGR="pacman"
  PKG_UPDATE="pacman -Sy --noconfirm"
  PKG_INSTALL="pacman -S --noconfirm"
elif command -v dnf &>/dev/null; then
  PKG_MGR="dnf"
  PKG_UPDATE="dnf check-update || true"
  PKG_INSTALL="dnf install -y"
else
  error "Unsupported package manager. Install nmap, sqlite3, and nodejs manually."
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="/var/lib/vapt-app"
CONFIG_DIR="/etc/vapt-app"
LOG_DIR="/var/log/vapt-app"
SERVICE_USER="vapt"
SERVICE_FILE="/etc/systemd/system/vapt-app.service"
TIMER_FILE="/etc/systemd/system/vapt-app-cleanup.service"
PORT="${VAPT_PORT:-3000}"

echo -e "${BOLD}"
cat << 'BANNER'
  ██╗   ██╗ █████╗ ██████╗ ████████╗    ██████╗ ██████╗  ██████╗ 
  ██║   ██║██╔══██╗██╔══██╗╚══██╔══╝    ██╔══██╗██╔══██╗██╔═══██╗
  ██║   ██║███████║██████╔╝   ██║       ██████╔╝██████╔╝██║   ██║
  ╚██╗ ██╔╝██╔══██║██╔═══╝    ██║       ██╔═══╝ ██╔══██╗██║   ██║
   ╚████╔╝ ██║  ██║██║        ██║       ██║     ██║  ██║╚██████╔╝
    ╚═══╝  ╚═╝  ╚═╝╚═╝        ╚═╝       ╚═╝     ╚═╝  ╚═╝ ╚═════╝ 
  Vulnerability Assessment & Reporting Platform — Linux Setup v2.4.1
BANNER
echo -e "${NC}"

# ═══════════════════════════════════════════════════════════
header "PHASE 1: System Dependencies"
# ═══════════════════════════════════════════════════════════

info "Updating package index..."
$PKG_UPDATE 2>/dev/null || warn "Package update had warnings (continuing)"

# ── Install nmap ──────────────────────────────────────────
if command -v nmap &>/dev/null; then
  NMAP_VER=$(nmap --version | head -1)
  success "nmap already installed: $NMAP_VER"
else
  info "Installing nmap..."
  if [[ "$PKG_MGR" == "apt-get" ]]; then
    $PKG_INSTALL nmap
  elif [[ "$PKG_MGR" == "pacman" ]]; then
    $PKG_INSTALL nmap
  elif [[ "$PKG_MGR" == "dnf" ]]; then
    $PKG_INSTALL nmap
  fi
  success "nmap installed: $(nmap --version | head -1)"
fi

# Verify nmap path (must be /usr/bin/nmap for spawn safety)
NMAP_PATH=$(which nmap)
if [[ "$NMAP_PATH" != "/usr/bin/nmap" ]]; then
  warn "nmap found at $NMAP_PATH, expected /usr/bin/nmap"
  if [[ -f "$NMAP_PATH" ]]; then
    ln -sf "$NMAP_PATH" /usr/bin/nmap 2>/dev/null || warn "Could not symlink nmap to /usr/bin/nmap"
  fi
fi

# ── Install sqlite3 ───────────────────────────────────────
if command -v sqlite3 &>/dev/null; then
  success "sqlite3 already installed: $(sqlite3 --version | head -1)"
else
  info "Installing sqlite3..."
  if [[ "$PKG_MGR" == "apt-get" ]]; then
    $PKG_INSTALL sqlite3 libsqlite3-dev
  elif [[ "$PKG_MGR" == "pacman" ]]; then
    $PKG_INSTALL sqlite
  elif [[ "$PKG_MGR" == "dnf" ]]; then
    $PKG_INSTALL sqlite sqlite-devel
  fi
  success "sqlite3 installed"
fi

# ── Install Node.js 18+ ───────────────────────────────────
if command -v node &>/dev/null; then
  NODE_VER=$(node --version)
  NODE_MAJOR=$(echo "$NODE_VER" | cut -d'.' -f1 | tr -d 'v')
  if [[ "$NODE_MAJOR" -ge 18 ]]; then
    success "Node.js already installed: $NODE_VER"
  else
    warn "Node.js version $NODE_VER is too old (need v18+). Upgrading..."
    if [[ "$PKG_MGR" == "apt-get" ]]; then
      curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
      $PKG_INSTALL nodejs
    fi
    success "Node.js upgraded: $(node --version)"
  fi
else
  info "Installing Node.js 20 LTS..."
  if [[ "$PKG_MGR" == "apt-get" ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    $PKG_INSTALL nodejs
  elif [[ "$PKG_MGR" == "pacman" ]]; then
    $PKG_INSTALL nodejs npm
  elif [[ "$PKG_MGR" == "dnf" ]]; then
    $PKG_INSTALL nodejs npm
  fi
  success "Node.js installed: $(node --version)"
fi

# ── Install build tools (for native modules like better-sqlite3) ──
if [[ "$PKG_MGR" == "apt-get" ]]; then
  info "Installing build tools (for better-sqlite3 native module)..."
  $PKG_INSTALL build-essential python3 python3-pip 2>/dev/null || warn "Some build tools may not have installed"
fi

# ═══════════════════════════════════════════════════════════
header "PHASE 2: Directory & Permission Setup"
# ═══════════════════════════════════════════════════════════

# Create dedicated service user
if id "$SERVICE_USER" &>/dev/null; then
  success "Service user '$SERVICE_USER' already exists"
else
  info "Creating service user '$SERVICE_USER'..."
  useradd --system --no-create-home --shell /bin/false "$SERVICE_USER"
  success "Created user: $SERVICE_USER"
fi

# Create directories
for DIR in "$DATA_DIR" "$CONFIG_DIR" "$LOG_DIR"; do
  if [[ ! -d "$DIR" ]]; then
    mkdir -p "$DIR"
    info "Created directory: $DIR"
  fi
done

# Set permissions
chown -R "$SERVICE_USER:$SERVICE_USER" "$DATA_DIR" "$LOG_DIR"
chmod 750 "$DATA_DIR" "$LOG_DIR"

# Copy targets.yaml to config dir
if [[ -f "$PROJECT_DIR/targets.yaml" ]]; then
  cp "$PROJECT_DIR/targets.yaml" "$CONFIG_DIR/targets.yaml"
  chown "$SERVICE_USER:$SERVICE_USER" "$CONFIG_DIR/targets.yaml"
  chmod 640 "$CONFIG_DIR/targets.yaml"
  success "Copied targets.yaml to $CONFIG_DIR/"
fi

success "Directories configured with correct permissions"

# ═══════════════════════════════════════════════════════════
header "PHASE 3: Node.js Dependencies"
# ═══════════════════════════════════════════════════════════

# Install root package dependencies (frontend)
if [[ -f "$PROJECT_DIR/package.json" ]]; then
  info "Installing frontend dependencies..."
  cd "$PROJECT_DIR"
  npm install --silent 2>&1 | tail -3
  success "Frontend dependencies installed"
fi

# Install server dependencies
if [[ -f "$PROJECT_DIR/server/package.json" ]]; then
  info "Installing server dependencies (better-sqlite3, express, xml2js, pdfkit, js-yaml)..."
  cd "$PROJECT_DIR/server"
  npm install --silent 2>&1 | tail -3
  success "Server dependencies installed"
fi

# ═══════════════════════════════════════════════════════════
header "PHASE 4: Frontend Build"
# ═══════════════════════════════════════════════════════════

cd "$PROJECT_DIR"
if [[ -f "package.json" ]] && grep -q '"build"' package.json; then
  info "Building frontend with Vite..."
  npm run build 2>&1 | tail -5
  success "Frontend built to ./dist/"
else
  warn "No build script found. Skipping frontend build."
fi

# ═══════════════════════════════════════════════════════════
header "PHASE 5: systemd Service Setup"
# ═══════════════════════════════════════════════════════════

if command -v systemctl &>/dev/null; then
  info "Creating systemd service..."
  cat > "$SERVICE_FILE" << EOF
[Unit]
Description=VAPT Pro — Vulnerability Assessment & Reporting Server
Documentation=https://github.com/your-org/vapt-pro
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=${SERVICE_USER}
Group=${SERVICE_USER}
WorkingDirectory=${PROJECT_DIR}
ExecStart=$(which node) ${PROJECT_DIR}/server/index.js
ExecReload=/bin/kill -HUP \$MAINPID
Restart=on-failure
RestartSec=10
StandardOutput=append:${LOG_DIR}/vapt-app.log
StandardError=append:${LOG_DIR}/vapt-app-error.log

# Security hardening
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=${DATA_DIR} ${LOG_DIR} /tmp
CapabilityBoundingSet=

# Resource limits
LimitNOFILE=65536
LimitNPROC=512

# Environment
Environment=NODE_ENV=production
Environment=PORT=${PORT}
Environment=DB_DIR=${DATA_DIR}

[Install]
WantedBy=multi-user.target
EOF

  # Allow nmap to run with raw socket capabilities without full sudo
  info "Setting nmap capabilities (raw socket for SYN scanning)..."
  setcap cap_net_raw,cap_net_admin+eip /usr/bin/nmap 2>/dev/null || \
    warn "Could not set nmap capabilities. SYN scans may require sudo."

  # Add service user to group that can run nmap
  usermod -aG sudo "$SERVICE_USER" 2>/dev/null || true

  systemctl daemon-reload
  systemctl enable vapt-app.service
  systemctl start vapt-app.service

  sleep 2
  if systemctl is-active --quiet vapt-app.service; then
    success "systemd service started successfully"
  else
    warn "Service may not have started. Check: journalctl -u vapt-app.service -f"
  fi
else
  warn "systemd not available. Start manually: node server/index.js"
fi

# ═══════════════════════════════════════════════════════════
header "PHASE 6: Firewall Configuration (Optional)"
# ═══════════════════════════════════════════════════════════

if command -v ufw &>/dev/null; then
  info "Configuring UFW firewall..."
  ufw allow "$PORT/tcp" comment "VAPT Pro Web UI" 2>/dev/null || warn "UFW rule may already exist"
  success "UFW: Port $PORT allowed"
elif command -v firewall-cmd &>/dev/null; then
  firewall-cmd --permanent --add-port="${PORT}/tcp" 2>/dev/null || true
  firewall-cmd --reload 2>/dev/null || true
  success "firewalld: Port $PORT allowed"
fi

# ═══════════════════════════════════════════════════════════
header "PHASE 7: Verification"
# ═══════════════════════════════════════════════════════════

sleep 1
if curl -sf "http://localhost:${PORT}/api/status" &>/dev/null; then
  success "API health check passed"
  SERVER_STATUS=$(curl -s "http://localhost:${PORT}/api/status")
  echo -e "  ${CYAN}${SERVER_STATUS}${NC}"
else
  warn "API health check failed. Server may still be starting."
  warn "Check: curl http://localhost:${PORT}/api/status"
fi

# ═══════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════╗"
echo -e "║          VAPT Pro Setup Complete! 🛡                     ║"
echo -e "╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Web UI:${NC}       http://localhost:${PORT}"
echo -e "  ${BOLD}API Status:${NC}   http://localhost:${PORT}/api/status"
echo -e "  ${BOLD}Database:${NC}     ${DATA_DIR}/database.sqlite"
echo -e "  ${BOLD}Allowlist:${NC}    ${CONFIG_DIR}/targets.yaml"
echo -e "  ${BOLD}Logs:${NC}         ${LOG_DIR}/vapt-app.log"
echo ""
echo -e "  ${BOLD}Manage Service:${NC}"
echo -e "    sudo systemctl status vapt-app"
echo -e "    sudo systemctl restart vapt-app"
echo -e "    sudo systemctl reload vapt-app  # Reload targets.yaml"
echo -e "    sudo journalctl -u vapt-app -f  # Follow logs"
echo ""
echo -e "  ${YELLOW}⚠  IMPORTANT: Only scan systems you are authorized to test.${NC}"
echo -e "  ${YELLOW}   Ensure written authorization is in place before scanning.${NC}"
echo ""
