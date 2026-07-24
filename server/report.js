/**
 * VAPT Pro — Server-side PDF Report Generator
 * Uses pdfkit for server-side generation (Linux backend).
 * 
 * Usage:
 *   const { generatePDFBuffer } = require('./report');
 *   const pdfBuffer = await generatePDFBuffer(scan, findings);
 *   res.set('Content-Type', 'application/pdf');
 *   res.set('Content-Disposition', `attachment; filename="vapt-report-${scan.target_ip}.pdf"`);
 *   res.send(pdfBuffer);
 */

'use strict';

const PDFDocument = require('pdfkit');

const SEVERITY_COLORS = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#3b82f6',
  info:     '#6b7280',
};

function cvssColor(score) {
  if (!score) return '#6b7280';
  if (score >= 9.0) return '#ef4444';
  if (score >= 7.0) return '#f97316';
  if (score >= 4.0) return '#eab308';
  return '#3b82f6';
}

function getRiskRating(findings) {
  if (findings.some(f => f.severity === 'critical')) return 'CRITICAL';
  if (findings.some(f => f.severity === 'high'))     return 'HIGH';
  if (findings.some(f => f.severity === 'medium'))   return 'MEDIUM';
  if (findings.some(f => f.severity === 'low'))      return 'LOW';
  return 'CLEAN';
}

/**
 * Generate a PDF report buffer for a completed scan.
 * @param {Object} scan - Scan record from SQLite
 * @param {Array}  findings - Array of Finding records
 * @returns {Promise<Buffer>}
 */
function generatePDFBuffer(scan, findings) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width;
    const margin = 50;
    const contentW = W - margin * 2;
    const riskRating = getRiskRating(findings);
    const critCount  = findings.filter(f => f.severity === 'critical').length;
    const highCount  = findings.filter(f => f.severity === 'high').length;
    const medCount   = findings.filter(f => f.severity === 'medium').length;
    const lowCount   = findings.filter(f => f.severity === 'low').length;

    // ── COVER PAGE ──────────────────────────────────────────────────────────
    doc.rect(0, 0, W, 200).fill('#0b1426');
    doc.fill('#10b981').fontSize(28).font('Helvetica-Bold')
       .text('VAPT Pro', margin, 60, { width: contentW, align: 'center' });
    doc.fill('#ffffff').fontSize(16)
       .text('Vulnerability Assessment & Penetration Test Report', margin, 100, { width: contentW, align: 'center' });
    doc.fill('#64748b').fontSize(10)
       .text('Confidential — For Authorized Personnel Only', margin, 130, { width: contentW, align: 'center' });

    // Risk badge
    const riskBgColors = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#3b82f6', CLEAN: '#10b981' };
    doc.fill('#ffffff').fontSize(12)
       .text(`Overall Risk Rating: ${riskRating}`, margin, 160, { width: contentW, align: 'center' });

    doc.fill('#1e293b').fontSize(11).font('Helvetica')
       .text(`Target:  ${scan.target_ip}`, margin, 220)
       .text(`Profile: ${scan.scan_type}`)
       .text(`Date:    ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`)
       .text(`Status:  ${scan.status}`)
       .text(`Findings: ${findings.length} total (${critCount} Critical, ${highCount} High, ${medCount} Medium, ${lowCount} Low)`);

    // ── PAGE 2: VULNERABILITY MATRIX ────────────────────────────────────────
    doc.addPage();
    doc.fill('#0b1426').fontSize(18).font('Helvetica-Bold')
       .text('Vulnerability Matrix', margin, margin);
    doc.moveTo(margin, margin + 25).lineTo(margin + 200, margin + 25).strokeColor('#10b981').lineWidth(2).stroke();

    let y = margin + 40;
    const headers = ['Port', 'Service', 'Version', 'CVE ID', 'CVSS', 'Severity'];
    const colWidths = [60, 80, 120, 100, 50, 80];

    // Table header
    doc.fill('#0b1426').rect(margin, y - 4, contentW, 20).fill();
    doc.fill('#10b981').fontSize(8).font('Helvetica-Bold');
    let cx = margin + 4;
    headers.forEach((h, i) => { doc.text(h, cx, y); cx += colWidths[i]; });
    y += 20;

    // Table rows
    const sortedFindings = [...findings].sort((a, b) => {
      const order = ['critical', 'high', 'medium', 'low', 'info'];
      return order.indexOf(a.severity) - order.indexOf(b.severity);
    });

    sortedFindings.forEach((f, i) => {
      if (y > 750) { doc.addPage(); y = margin; }
      if (i % 2 === 0) doc.fill('#f8fafc').rect(margin, y - 3, contentW, 16).fill();
      doc.fill('#1e293b').fontSize(8).font('Helvetica');
      cx = margin + 4;
      const row = [
        `${f.port}/${f.protocol}`,
        (f.service || '').substring(0, 14),
        (f.version || 'Unknown').substring(0, 22),
        f.cve_id || '—',
        f.cvss_score ? String(f.cvss_score) : '—',
        f.severity.toUpperCase(),
      ];
      row.forEach((cell, j) => {
        if (j === 4 && f.cvss_score) doc.fill(cvssColor(f.cvss_score));
        else if (j === 5) doc.fill(SEVERITY_COLORS[f.severity] || '#6b7280');
        else doc.fill('#1e293b');
        doc.text(cell, cx, y);
        cx += colWidths[j];
      });
      y += 16;
    });

    // ── PAGE 3+: DETAILED FINDINGS ───────────────────────────────────────────
    doc.addPage();
    doc.fill('#0b1426').fontSize(18).font('Helvetica-Bold')
       .text('Detailed Findings', margin, margin);
    doc.moveTo(margin, margin + 25).lineTo(margin + 180, margin + 25).strokeColor('#10b981').lineWidth(2).stroke();
    y = margin + 40;

    sortedFindings.forEach((f, i) => {
      const boxH = 100 + (f.script_output ? 60 : 0);
      if (y + boxH > 780) { doc.addPage(); y = margin; }

      const sevColor = SEVERITY_COLORS[f.severity] || '#6b7280';
      doc.fill(sevColor).rect(margin, y, 4, 80).fill();
      doc.fill('#0b1426').rect(margin + 4, y, contentW - 4, 26).fill();
      doc.fill('#ffffff').fontSize(10).font('Helvetica-Bold')
         .text(`Finding ${String(i + 1).padStart(2, '0')}: Port ${f.port}/${f.protocol} — ${f.service}`, margin + 12, y + 8);
      if (f.cve_id) {
        doc.fill('#10b981').fontSize(9)
           .text(f.cve_id, W - margin - 80, y + 8, { width: 70, align: 'right' });
      }
      y += 30;

      doc.fill('#374151').fontSize(8.5).font('Helvetica-Bold').text('Description:', margin + 8, y);
      y += 12;
      doc.fill('#4b5563').font('Helvetica').fontSize(8)
         .text(f.description || '', margin + 8, y, { width: contentW - 16, lineBreak: true });
      y += doc.heightOfString(f.description || '', { width: contentW - 16 }) + 6;

      doc.fill('#059669').fontSize(8.5).font('Helvetica-Bold').text('Remediation:', margin + 8, y);
      y += 12;
      doc.fill('#065f46').font('Helvetica').fontSize(8)
         .text(f.remediation || '', margin + 8, y, { width: contentW - 16, lineBreak: true });
      y += doc.heightOfString(f.remediation || '', { width: contentW - 16 }) + 14;

      doc.moveTo(margin, y).lineTo(margin + contentW, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
      y += 10;
    });

    // ── FOOTER ON ALL PAGES ──────────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fill('#6b7280').fontSize(7).font('Helvetica')
         .text(
           `VAPT Pro — Confidential Assessment Report — ${scan.target_ip} — Page ${i + 1} of ${range.count}`,
           margin, doc.page.height - 30, { width: contentW, align: 'center' }
         );
    }

    doc.end();
  });
}

module.exports = { generatePDFBuffer };
