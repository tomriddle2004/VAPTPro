import { ScanDetail, Finding, Severity } from '@/types';
import { formatDateTime, formatDuration } from './ipValidator';

// PDF generation using jsPDF (loaded dynamically)
// On Linux backend this uses pdfkit or puppeteer for server-side generation.

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

function getRiskRating(findings: Finding[]): string {
  if (findings.some(f => f.severity === 'critical')) return 'CRITICAL';
  if (findings.some(f => f.severity === 'high')) return 'HIGH';
  if (findings.some(f => f.severity === 'medium')) return 'MEDIUM';
  if (findings.some(f => f.severity === 'low')) return 'LOW';
  return 'CLEAN';
}

function getCVSSColor(score?: number): string {
  if (!score) return '#6b7280';
  if (score >= 9.0) return '#ef4444';
  if (score >= 7.0) return '#f97316';
  if (score >= 4.0) return '#eab308';
  return '#3b82f6';
}

function getSeverityColor(sev: Severity): string {
  const colors: Record<Severity, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#3b82f6',
    info: '#6b7280',
  };
  return colors[sev];
}

export async function generatePDFReport(scan: ScanDetail): Promise<void> {
  // Dynamically load jsPDF
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = 210; // A4 width mm
  const margin = 20;
  const contentW = W - margin * 2;
  let y = 0;

  const riskRating = getRiskRating(scan.findings);
  const sortedFindings = [...scan.findings].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );

  // ── COVER PAGE ──────────────────────────────────────────────────────────────
  // Dark header
  doc.setFillColor(11, 20, 38);
  doc.rect(0, 0, W, 80, 'F');

  // Shield icon area
  doc.setFillColor(16, 185, 129); // emerald
  doc.circle(W / 2, 35, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('🛡', W / 2, 38, { align: 'center' });

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('VULNERABILITY ASSESSMENT', W / 2, 62, { align: 'center' });
  doc.setFontSize(14);
  doc.text('& PENETRATION TEST REPORT', W / 2, 70, { align: 'center' });

  y = 90;
  // Meta box
  doc.setFillColor(240, 245, 255);
  doc.roundedRect(margin, y, contentW, 55, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 80);
  doc.setFont('helvetica', 'bold');
  doc.text('Target System', margin + 6, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.setTextColor(11, 20, 38);
  doc.text(scan.target_ip, margin + 6, y + 20);

  if (scan.hostname) {
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 120);
    doc.text(`Hostname: ${scan.hostname}`, margin + 6, y + 27);
  }

  doc.setDrawColor(220, 220, 240);
  doc.line(margin + 6, y + 31, margin + contentW - 6, y + 31);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 80);
  const col2 = margin + contentW / 2;
  doc.text('Scan Type', margin + 6, y + 39);
  doc.text('Report Date', col2, y + 39);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(11, 20, 38);
  doc.setFontSize(10);
  doc.text(scan.scan_type.toUpperCase(), margin + 6, y + 47);
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), col2, y + 47);

  // Risk badge
  const riskColor = riskRating === 'CRITICAL' ? [239, 68, 68] : riskRating === 'HIGH' ? [249, 115, 22] : riskRating === 'MEDIUM' ? [234, 179, 8] : [16, 185, 129];
  doc.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
  doc.roundedRect(margin, y + 64, contentW, 16, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`OVERALL RISK RATING: ${riskRating}`, W / 2, y + 74, { align: 'center' });

  y += 90;

  // ── EXECUTIVE SUMMARY ────────────────────────────────────────────────────────
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(11, 20, 38);
  doc.text('1. Executive Summary', margin, y + 10);
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.8);
  doc.line(margin, y + 12, margin + 50, y + 12);
  y += 16;

  const critCount = scan.findings.filter(f => f.severity === 'critical').length;
  const highCount = scan.findings.filter(f => f.severity === 'high').length;
  const medCount = scan.findings.filter(f => f.severity === 'medium').length;
  const lowCount = scan.findings.filter(f => f.severity === 'low').length;

  const summaryText = `An automated vulnerability assessment was conducted against target host ${scan.target_ip}${scan.hostname ? ` (${scan.hostname})` : ''} using a ${scan.scan_type} scan profile. The assessment identified ${scan.findings.length} finding(s) across ${new Set(scan.findings.map(f => f.port)).size} open port(s). Immediate remediation is required for ${critCount} critical and ${highCount} high severity findings to prevent potential system compromise.`;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 70);
  const lines = doc.splitTextToSize(summaryText, contentW);
  doc.text(lines, margin, y + 6);
  y += lines.length * 5 + 8;

  // Findings summary boxes
  const boxW = (contentW - 9) / 4;
  const boxes = [
    { label: 'Critical', count: critCount, color: [239, 68, 68] },
    { label: 'High', count: highCount, color: [249, 115, 22] },
    { label: 'Medium', count: medCount, color: [234, 179, 8] },
    { label: 'Low', count: lowCount, color: [59, 130, 246] },
  ];
  boxes.forEach((b, i) => {
    const bx = margin + i * (boxW + 3);
    doc.setFillColor(b.color[0], b.color[1], b.color[2]);
    doc.roundedRect(bx, y, boxW, 20, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(String(b.count), bx + boxW / 2, y + 11, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(b.label, bx + boxW / 2, y + 17, { align: 'center' });
  });
  y += 26;

  // ── SCAN DETAILS ─────────────────────────────────────────────────────────────
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(11, 20, 38);
  doc.text('2. Host & Scan Information', margin, y + 10);
  doc.setDrawColor(16, 185, 129);
  doc.line(margin, y + 12, margin + 65, y + 12);
  y += 18;

  const scanInfo = [
    ['Target IP', scan.target_ip],
    ['Hostname', scan.hostname || 'N/A'],
    ['OS Detection', scan.os_detection || 'N/A'],
    ['MAC Address', scan.mac_address || 'N/A'],
    ['Scan Profile', scan.scan_type.charAt(0).toUpperCase() + scan.scan_type.slice(1)],
    ['Scan Start', formatDateTime(scan.start_time)],
    ['Scan End', scan.end_time ? formatDateTime(scan.end_time) : 'N/A'],
    ['Duration', formatDuration(scan.start_time, scan.end_time)],
    ['Open Ports', String(new Set(scan.findings.map(f => f.port)).size)],
    ['Total Findings', String(scan.findings.length)],
  ];

  scanInfo.forEach((row, i) => {
    const rowY = y + i * 8;
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, rowY - 4, contentW, 8, 'F');
    }
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 100);
    doc.text(row[0], margin + 3, rowY + 1);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 50);
    doc.text(row[1], margin + 55, rowY + 1);
  });
  y += scanInfo.length * 8 + 6;

  // ── ADD NEW PAGE FOR FINDINGS ────────────────────────────────────────────────
  if (scan.findings.length > 0) {
    doc.addPage();
    y = margin;

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(11, 20, 38);
    doc.text('3. Vulnerability Matrix', margin, y + 4);
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.8);
    doc.line(margin, y + 6, margin + 55, y + 6);
    y += 14;

    // Table header
    const cols = { port: 18, service: 28, version: 40, cve: 35, cvss: 18, severity: 28 };
    doc.setFillColor(11, 20, 38);
    doc.rect(margin, y, contentW, 8, 'F');
    doc.setTextColor(16, 185, 129);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    let cx = margin + 2;
    doc.text('PORT', cx, y + 5); cx += cols.port;
    doc.text('SERVICE', cx, y + 5); cx += cols.service;
    doc.text('VERSION', cx, y + 5); cx += cols.version;
    doc.text('CVE ID', cx, y + 5); cx += cols.cve;
    doc.text('CVSS', cx, y + 5); cx += cols.cvss;
    doc.text('SEVERITY', cx, y + 5);
    y += 8;

    sortedFindings.forEach((f, i) => {
      if (y > 270) { doc.addPage(); y = margin; }
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentW, 8, 'F');
      }
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 50);
      let cx = margin + 2;
      doc.text(`${f.port}/${f.protocol}`, cx, y + 5); cx += cols.port;
      doc.text(f.service.substring(0, 14), cx, y + 5); cx += cols.service;
      doc.text((f.version || 'Unknown').substring(0, 22), cx, y + 5); cx += cols.version;
      doc.setTextColor(...(f.cve_id ? [59, 130, 246] : [150, 150, 170]) as [number, number, number]);
      doc.text(f.cve_id || '—', cx, y + 5); cx += cols.cve;
      doc.setTextColor(...(f.cvss_score ? hexToRgb(getCVSSColor(f.cvss_score)) : [150, 150, 170]));
      doc.setFont('helvetica', 'bold');
      doc.text(f.cvss_score ? String(f.cvss_score) : '—', cx, y + 5); cx += cols.cvss;
      const sColor = hexToRgb(getSeverityColor(f.severity));
      doc.setTextColor(...sColor);
      doc.text(f.severity.toUpperCase(), cx, y + 5);
      y += 8;
    });

    // Detailed findings
    y += 8;
    sortedFindings.slice(0, 8).forEach((f, i) => {
      if (y > 240) { doc.addPage(); y = margin; }

      doc.setFillColor(11, 20, 38);
      doc.rect(margin, y, contentW, 9, 'F');
      const sColor = hexToRgb(getSeverityColor(f.severity));
      doc.setFillColor(...sColor);
      doc.rect(margin, y, 3, 9, 'F');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`Finding ${String(i + 1).padStart(2, '0')}: Port ${f.port}/${f.protocol} — ${f.service}`, margin + 6, y + 6);

      if (f.cve_id) {
        doc.setFontSize(7);
        doc.setTextColor(16, 185, 129);
        doc.text(f.cve_id, W - margin - 2, y + 6, { align: 'right' });
      }
      y += 11;

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 80);
      doc.text('Description:', margin, y + 4);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 70);
      const descLines = doc.splitTextToSize(f.description, contentW - 4);
      const maxLines = descLines.slice(0, 4);
      doc.text(maxLines, margin + 2, y);
      y += maxLines.length * 4 + 2;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text('Remediation:', margin, y + 3);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 70, 50);
      const remLines = doc.splitTextToSize(f.remediation, contentW - 4);
      const maxRemLines = remLines.slice(0, 3);
      doc.text(maxRemLines, margin + 2, y);
      y += maxRemLines.length * 4 + 6;

      doc.setDrawColor(220, 220, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, y, margin + contentW, y);
      y += 4;
    });
  }

  // ── FOOTER ───────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFillColor(11, 20, 38);
    doc.rect(0, 285, W, 12, 'F');
    doc.setFontSize(7);
    doc.setTextColor(16, 185, 129);
    doc.text('VAPT Pro — Confidential Vulnerability Assessment Report', margin, 291);
    doc.setTextColor(150, 170, 200);
    doc.text(`Page ${p} of ${pageCount}`, W - margin, 291, { align: 'right' });
  }

  const filename = `VAPT_Report_${scan.target_ip.replace(/\./g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}
