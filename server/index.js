/**
 * VAPT Pro — Express.js Backend Server
 * Linux-native Vulnerability Assessment & Reporting Platform
 * 
 * Stack: Node.js 18+, Express.js, better-sqlite3, xml2js, nmap (native)
 * Run: node server/index.js  |  or: systemctl start vapt-app
 */

'use strict';

const express = require('express');
const path    = require('path');
const net     = require('net');
const fs      = require('fs');
const os      = require('os');

const { spawn }  = require('child_process');
const { parseString } = require('xml2js');
const yaml   = require('js-yaml');
const Database = require('better-sqlite3');

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const PORT      = process.env.PORT || 3000;
const DB_DIR    = process.env.DB_DIR || path.join(__dirname, '..', 'data');
const DB_PATH   = path.join(DB_DIR, 'database.sqlite');
const TARGETS_YAML = path.join(__dirname, '..', 'targets.yaml');
const NMAP_BIN  = '/usr/bin/nmap';
const STATIC_DIR = path.join(__dirname, '..', 'dist'); // Vite build output

// ─── STARTUP CHECKS ──────────────────────────────────────────────────────────
if (!fs.existsSync(NMAP_BIN)) {
  console.error(`[FATAL] nmap not found at ${NMAP_BIN}. Run: sudo apt install nmap`);
  process.exit(1);
}
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

// ─── DATABASE SETUP ──────────────────────────────────────────────────────────
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS scans (
    id          TEXT PRIMARY KEY,
    target_ip   TEXT NOT NULL,
    scan_type   TEXT NOT NULL CHECK(scan_type IN ('fast','vulnerability','comprehensive')),
    status      TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','completed','failed')),
    start_time  TEXT NOT NULL,
    end_time    TEXT,
    nmap_args   TEXT,
    raw_xml_path TEXT
  );

  CREATE TABLE IF NOT EXISTS findings (
    id          TEXT PRIMARY KEY,
    scan_id     TEXT NOT NULL REFERENCES scans(id),
    port        INTEGER NOT NULL,
    protocol    TEXT NOT NULL DEFAULT 'tcp',
    service     TEXT,
    version     TEXT,
    state       TEXT,
    cve_id      TEXT,
    cvss_score  REAL,
    severity    TEXT CHECK(severity IN ('critical','high','medium','low','info')),
    description TEXT,
    remediation TEXT,
    script_output TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_findings_scan_id ON findings(scan_id);
  CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);
`);

console.log(`[DB] SQLite initialized at ${DB_PATH}`);

// ─── ALLOWLIST LOADING ───────────────────────────────────────────────────────
let allowlist = { subnets: [], ips: [] };

function loadAllowlist() {
  try {
    if (fs.existsSync(TARGETS_YAML)) {
      const raw = fs.readFileSync(TARGETS_YAML, 'utf8');
      allowlist = yaml.load(raw) || { subnets: [], ips: [] };
      console.log(`[SCOPE] Allowlist loaded: ${(allowlist.subnets||[]).length} subnets, ${(allowlist.ips||[]).length} explicit IPs`);
    }
  } catch (e) {
    console.warn('[SCOPE] Could not load targets.yaml, using RFC1918 defaults only');
  }
}
loadAllowlist();
// Reload allowlist on SIGHUP (e.g. systemctl reload vapt-app)
process.on('SIGHUP', () => { console.log('[SCOPE] Reloading allowlist...'); loadAllowlist(); });

// ─── IP VALIDATION ────────────────────────────────────────────────────────────
const RFC1918 = [
  { regex: /^10\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/, label: '10.0.0.0/8' },
  { regex: /^172\.(1[6-9]|2\d|3[01])\.(\d{1,3})\.(\d{1,3})$/, label: '172.16.0.0/12' },
  { regex: /^192\.168\.(\d{1,3})\.(\d{1,3})$/, label: '192.168.0.0/16' },
  { regex: /^127\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/, label: '127.0.0.0/8' },
];

function validateTarget(ip) {
  // 1. net.isIP() — returns 0 (invalid), 4 (IPv4), or 6 (IPv6)
  const version = net.isIP(ip);
  if (version === 0) return { valid: false, reason: `Invalid IP address format: "${ip}"` };
  if (version === 6) return { valid: false, reason: 'IPv6 targets are not currently supported.' };

  // 2. Check RFC 1918 private ranges
  const isPrivate = RFC1918.some(r => r.regex.test(ip));

  // 3. Check explicit allowlist from targets.yaml
  const explicitIPs   = (allowlist.ips     || []).map(e => e.ip     || e).filter(Boolean);
  const explicitNets  = (allowlist.subnets  || []).map(e => e.subnet || e).filter(Boolean);
  const isExplicit = explicitIPs.includes(ip);

  if (!isPrivate && !isExplicit) {
    return {
      valid: false,
      reason: `BLOCKED: "${ip}" is not a private RFC 1918 address and is not in targets.yaml allowlist. ` +
               `Only 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 or explicitly whitelisted IPs are permitted.`
    };
  }

  return { valid: true, isPrivate, range: RFC1918.find(r => r.regex.test(ip))?.label };
}

// ─── NMAP SCAN PROFILES ──────────────────────────────────────────────────────
const SCAN_PROFILES = {
  fast:          ['-F', '-sV', '--open'],
  vulnerability: ['-sV', '--script', 'vuln,vulners', '--open'],
  comprehensive: ['-A', '-sC', '--script', 'vuln,vulners', '--open'],
};

// ─── CVE SEVERITY MAPPING ────────────────────────────────────────────────────
function cvssToSeverity(score) {
  if (!score || isNaN(score)) return 'info';
  if (score >= 9.0) return 'critical';
  if (score >= 7.0) return 'high';
  if (score >= 4.0) return 'medium';
  if (score > 0)    return 'low';
  return 'info';
}

function extractCVSSFromScript(scriptOutput) {
  if (!scriptOutput) return null;
  const match = scriptOutput.match(/cvss:\s*([\d.]+)/i) ||
                scriptOutput.match(/CVSS Score:\s*([\d.]+)/i) ||
                scriptOutput.match(/Score:\s*([\d.]+)/i);
  return match ? parseFloat(match[1]) : null;
}

function extractCVEFromScript(scriptOutput) {
  if (!scriptOutput) return null;
  const match = scriptOutput.match(/CVE[-:](\d{4}[-]\d+)/i);
  return match ? `CVE-${match[1]}` : null;
}

// ─── XML PARSER ──────────────────────────────────────────────────────────────
function parseNmapXML(xmlPath) {
  return new Promise((resolve, reject) => {
    const xml = fs.readFileSync(xmlPath, 'utf8');
    parseString(xml, { explicitArray: true }, (err, result) => {
      if (err) return reject(err);
      try {
        const findings = [];
        const hosts = result?.nmaprun?.host || [];

        for (const host of hosts) {
          const ports = host?.ports?.[0]?.port || [];
          for (const port of ports) {
            const portNum  = parseInt(port.$.portid, 10);
            const protocol = port.$.protocol || 'tcp';
            const state    = port?.state?.[0]?.$.state || 'unknown';
            if (state !== 'open') continue;

            const service  = port?.service?.[0]?.$.name || 'unknown';
            const version  = [
              port?.service?.[0]?.$.product,
              port?.service?.[0]?.$.version,
              port?.service?.[0]?.$.extrainfo,
            ].filter(Boolean).join(' ') || 'Unknown';

            // Process NSE scripts
            const scripts = port?.script || [];
            let cveId = null;
            let cvssScore = null;
            let scriptOutputCombined = '';
            let descriptionParts = [];
            let remediationParts = [];

            for (const script of scripts) {
              const output = script.$.output || '';
              scriptOutputCombined += `${script.$.id}: ${output}\n`;

              if (!cveId) cveId = extractCVEFromScript(output);
              if (!cvssScore) cvssScore = extractCVSSFromScript(output);

              if (output.toLowerCase().includes('vulnerable')) {
                descriptionParts.push(`${script.$.id}: ${output.substring(0, 300)}`);
              }
            }

            const severity = cvssToSeverity(cvssScore);
            const findingId = `${Date.now()}-${portNum}-${Math.random().toString(36).slice(2, 7)}`;

            findings.push({
              id: findingId,
              port: portNum, protocol, service, version, state,
              cve_id: cveId,
              cvss_score: cvssScore,
              severity,
              description: descriptionParts.join('\n') || `${service} service detected on port ${portNum}/${protocol} running ${version}.`,
              remediation: cveId
                ? `Apply patches for ${cveId}. Consult vendor advisory and NVD entry.`
                : `Review ${service} configuration. Apply principle of least privilege. Update to latest version.`,
              script_output: scriptOutputCombined.trim() || null,
            });
          }
        }
        resolve(findings);
      } catch (e) {
        reject(e);
      }
    });
  });
}

// ─── ACTIVE SCANS MAP ────────────────────────────────────────────────────────
const activeScans = new Map(); // scanId -> { process, xmlPath }

// ─── EXPRESS APP ─────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.static(STATIC_DIR));

// CORS for development
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// ── GET /api/scans ─────────────────────────────────────────────────────────
app.get('/api/scans', (req, res) => {
  const scans = db.prepare(`
    SELECT s.*, 
           COUNT(f.id) AS findings_count,
           MAX(CASE f.severity WHEN 'critical' THEN 4 WHEN 'high' THEN 3 
                               WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0 END) AS max_severity_rank
    FROM scans s
    LEFT JOIN findings f ON f.scan_id = s.id
    GROUP BY s.id
    ORDER BY s.start_time DESC
    LIMIT 100
  `).all();
  res.json(scans);
});

// ── GET /api/scans/:id ─────────────────────────────────────────────────────
app.get('/api/scans/:id', (req, res) => {
  const scan = db.prepare('SELECT * FROM scans WHERE id = ?').get(req.params.id);
  if (!scan) return res.status(404).json({ error: 'Scan not found' });
  const findings = db.prepare('SELECT * FROM findings WHERE scan_id = ? ORDER BY cvss_score DESC NULLS LAST').all(req.params.id);
  res.json({ ...scan, findings });
});

// ── POST /api/scans ─────────────────────────────────────────────────────────
app.post('/api/scans', (req, res) => {
  const { target_ip, scan_type } = req.body;

  // 1. Validate input
  if (!target_ip || !scan_type) {
    return res.status(400).json({ error: 'target_ip and scan_type are required.' });
  }
  if (!SCAN_PROFILES[scan_type]) {
    return res.status(400).json({ error: `Invalid scan_type. Must be one of: ${Object.keys(SCAN_PROFILES).join(', ')}` });
  }

  // 2. IP scope enforcement (CRITICAL SECURITY CHECK)
  const validation = validateTarget(target_ip.trim());
  if (!validation.valid) {
    console.warn(`[SECURITY] Blocked scan request for ${target_ip}: ${validation.reason}`);
    return res.status(403).json({ error: validation.reason, blocked: true });
  }

  // 3. Create scan record
  const scanId    = `scan-${Date.now()}`;
  const startTime = new Date().toISOString();
  const xmlPath   = path.join(os.tmpdir(), `scan_${Date.now()}.xml`);
  const nmapArgs  = [...SCAN_PROFILES[scan_type], '-oX', xmlPath, target_ip.trim()];

  db.prepare(`
    INSERT INTO scans (id, target_ip, scan_type, status, start_time, nmap_args, raw_xml_path)
    VALUES (?, ?, ?, 'running', ?, ?, ?)
  `).run(scanId, target_ip.trim(), scan_type, startTime, nmapArgs.join(' '), xmlPath);

  console.log(`[SCAN] Starting: ${scanId} | ${target_ip} | ${scan_type}`);
  console.log(`[SCAN] Exec: /usr/bin/nmap ${nmapArgs.join(' ')}`);

  // 4. Spawn nmap safely (no shell, no exec())
  const nmapProcess = spawn(NMAP_BIN, nmapArgs, {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  activeScans.set(scanId, { process: nmapProcess, xmlPath });

  let stderr = '';
  nmapProcess.stderr.on('data', chunk => { stderr += chunk.toString(); });

  nmapProcess.on('close', async (code) => {
    activeScans.delete(scanId);
    const endTime = new Date().toISOString();

    if (code !== 0) {
      console.error(`[SCAN] Failed: ${scanId} | exit code ${code}\n${stderr}`);
      db.prepare("UPDATE scans SET status='failed', end_time=? WHERE id=?").run(endTime, scanId);
      // Cleanup temp file
      if (fs.existsSync(xmlPath)) fs.unlinkSync(xmlPath);
      return;
    }

    try {
      // 5. Parse XML output
      const findings = await parseNmapXML(xmlPath);
      console.log(`[SCAN] Complete: ${scanId} | ${findings.length} findings`);

      // 6. Store findings in SQLite
      const insertFinding = db.prepare(`
        INSERT INTO findings (id, scan_id, port, protocol, service, version, state, cve_id, cvss_score, severity, description, remediation, script_output)
        VALUES (@id, @scan_id, @port, @protocol, @service, @version, @state, @cve_id, @cvss_score, @severity, @description, @remediation, @script_output)
      `);
      const insertMany = db.transaction((rows) => rows.forEach(r => insertFinding.run(r)));
      insertMany(findings.map(f => ({ ...f, scan_id: scanId })));

      db.prepare("UPDATE scans SET status='completed', end_time=? WHERE id=?").run(endTime, scanId);
    } catch (parseErr) {
      console.error(`[SCAN] Parse error: ${scanId}`, parseErr.message);
      db.prepare("UPDATE scans SET status='failed', end_time=? WHERE id=?").run(endTime, scanId);
    } finally {
      // 7. Cleanup temp XML file
      if (fs.existsSync(xmlPath)) {
        fs.unlinkSync(xmlPath);
        console.log(`[SCAN] Cleaned up temp file: ${xmlPath}`);
      }
    }
  });

  res.status(202).json({
    id: scanId,
    status: 'running',
    target_ip: target_ip.trim(),
    scan_type,
    start_time: startTime,
    message: `Scan initiated. Poll GET /api/scans/${scanId} for status.`,
  });
});

// ── DELETE /api/scans/:id ───────────────────────────────────────────────────
app.delete('/api/scans/:id', (req, res) => {
  const { id } = req.params;
  const active = activeScans.get(id);
  if (active) {
    active.process.kill('SIGTERM');
    activeScans.delete(id);
    if (fs.existsSync(active.xmlPath)) fs.unlinkSync(active.xmlPath);
  }
  db.prepare("UPDATE scans SET status='failed' WHERE id=? AND status='running'").run(id);
  res.json({ message: `Scan ${id} cancelled.` });
});

// ── GET /api/scans/:id/report ───────────────────────────────────────────────
app.get('/api/scans/:id/report', (req, res) => {
  const scan = db.prepare('SELECT * FROM scans WHERE id = ?').get(req.params.id);
  if (!scan) return res.status(404).json({ error: 'Scan not found' });
  if (scan.status !== 'completed') return res.status(400).json({ error: 'Scan is not yet completed.' });

  const findings = db.prepare('SELECT * FROM findings WHERE scan_id = ? ORDER BY cvss_score DESC NULLS LAST').all(req.params.id);

  // Server-side PDF generation with pdfkit (see server/report.js)
  // For now, return JSON summary — integrate report.js for full PDF
  const summary = {
    scan,
    findings,
    executive_summary: {
      target: scan.target_ip,
      risk_rating: findings.some(f => f.severity === 'critical') ? 'CRITICAL' :
                   findings.some(f => f.severity === 'high')     ? 'HIGH'     :
                   findings.some(f => f.severity === 'medium')   ? 'MEDIUM'   :
                   findings.some(f => f.severity === 'low')      ? 'LOW'      : 'CLEAN',
      total_findings: findings.length,
      critical: findings.filter(f => f.severity === 'critical').length,
      high:     findings.filter(f => f.severity === 'high').length,
      medium:   findings.filter(f => f.severity === 'medium').length,
      low:      findings.filter(f => f.severity === 'low').length,
    },
  };
  res.json(summary);
});

// ── GET /api/allowlist ──────────────────────────────────────────────────────
app.get('/api/allowlist', (req, res) => {
  res.json(allowlist);
});

// ── GET /api/status ─────────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.4.1',
    nmap: NMAP_BIN,
    database: DB_PATH,
    active_scans: activeScans.size,
    uptime: process.uptime(),
    platform: process.platform,
    node_version: process.version,
  });
});

// ── SPA Fallback ─────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  const indexPath = path.join(STATIC_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(503).json({ error: 'Frontend not built. Run: npm run build' });
  }
});

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('[SERVER] SIGTERM received. Graceful shutdown...');
  for (const [id, { process: proc, xmlPath }] of activeScans) {
    console.log(`[SERVER] Killing active scan ${id}`);
    proc.kill('SIGTERM');
    if (fs.existsSync(xmlPath)) fs.unlinkSync(xmlPath);
  }
  db.close();
  process.exit(0);
});

// ─── START ────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🛡  VAPT Pro Server`);
  console.log(`   Listening:  http://0.0.0.0:${PORT}`);
  console.log(`   Database:   ${DB_PATH}`);
  console.log(`   Nmap:       ${NMAP_BIN}`);
  console.log(`   Static:     ${STATIC_DIR}`);
  console.log(`   Allowlist:  ${TARGETS_YAML}\n`);
});
