# VAPT Pro — Vulnerability Assessment & Reporting Platform

A complete **web-based VAPT platform** designed to run natively on Linux (Ubuntu/Debian/Arch/Kali).  
Powered by **Nmap 7.94**, **Node.js 18+**, **SQLite**, and **Express.js**.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React/TS Frontend)  ←→  Express.js API Server     │
│                                         │                   │
│  ┌─────────────────────────┐           │                   │
│  │  Scope Guard (RFC1918)  │←─── POST /api/scans           │
│  │  net.isIP() validation  │           │                   │
│  │  targets.yaml allowlist │           ↓                   │
│  └─────────────────────────┘   child_process.spawn()       │
│                                /usr/bin/nmap [args] [ip]   │
│                                         │                   │
│                                    /tmp/scan_*.xml          │
│                                         │                   │
│                                    xml2js parser            │
│                                         │                   │
│                                 SQLite (findings table)     │
│                                         │                   │
│                                    PDF Report (pdfkit)      │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start (Linux)

```bash
# 1. Clone and navigate to project
git clone <repo> vapt-pro && cd vapt-pro

# 2. Run automated setup (installs nmap, sqlite3, nodejs, systemd service)
chmod +x setup.sh
sudo ./setup.sh

# 3. Open browser
open http://localhost:3000
```

## Manual Start

```bash
# Build frontend
npm install && npm run build

# Install and start server
cd server && npm install
node index.js
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/status` | Server health & version info |
| `GET`  | `/api/scans` | List all scans (with findings count) |
| `GET`  | `/api/scans/:id` | Get scan details + all findings |
| `POST` | `/api/scans` | Launch new scan `{target_ip, scan_type}` |
| `DELETE` | `/api/scans/:id` | Cancel running scan |
| `GET`  | `/api/scans/:id/report` | Get report JSON summary |
| `GET`  | `/api/allowlist` | View current targets.yaml allowlist |

## Scan Profiles

| Profile | Nmap Args | Estimated Time |
|---------|-----------|----------------|
| `fast` | `-F -sV --open` | 30–60s |
| `vulnerability` | `-sV --script vuln,vulners --open` | 2–5 min |
| `comprehensive` | `-A -sC --script vuln,vulners --open` | 5–15 min |

## Security Enforcement

- **Scope Control**: All IPs validated via `net.isIP()` + RFC 1918 check BEFORE spawning nmap
- **No Shell Injection**: Uses `child_process.spawn()` with argument arrays — never `exec()`
- **Temp File Cleanup**: XML output in `/tmp/scan_*.xml` deleted immediately after parsing
- **Allowlist**: `targets.yaml` defines authorized subnets and explicit IPs
- **systemd Hardening**: `NoNewPrivileges`, `PrivateTmp`, `ProtectSystem=strict`

## Database Schema

```sql
CREATE TABLE scans (
  id TEXT PRIMARY KEY,
  target_ip TEXT NOT NULL,
  scan_type TEXT NOT NULL,   -- fast | vulnerability | comprehensive
  status TEXT NOT NULL,      -- queued | running | completed | failed
  start_time TEXT NOT NULL,
  end_time TEXT,
  nmap_args TEXT,
  raw_xml_path TEXT
);

CREATE TABLE findings (
  id TEXT PRIMARY KEY,
  scan_id TEXT NOT NULL REFERENCES scans(id),
  port INTEGER NOT NULL,
  protocol TEXT,
  service TEXT,
  version TEXT,
  state TEXT,
  cve_id TEXT,               -- e.g., CVE-2017-7679
  cvss_score REAL,           -- e.g., 9.8
  severity TEXT,             -- critical | high | medium | low | info
  description TEXT,
  remediation TEXT,
  script_output TEXT         -- Raw NSE script output
);
```

## Legal Notice

> ⚠️ **Only scan systems you are explicitly authorized to test.**  
> Unauthorized port scanning may violate the Computer Fraud and Abuse Act (CFAA),  
> the Computer Misuse Act (UK), GDPR, and equivalent laws in your jurisdiction.  
> Ensure you have documented written authorization before initiating any scan.
