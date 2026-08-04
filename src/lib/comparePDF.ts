import { ScanDetail, Finding, Severity } from '@/types';
import { formatDateTime } from './ipValidator';

interface FindingChange {
  fA: Finding;
  fB: Finding;
  cvssChange: number;
  severityChanged: boolean;
}

export interface ComparisonDiff {
  newInB: Finding[];
  resolvedInA: Finding[];
  changed: FindingChange[];
  unchanged: FindingChange[];
}

function severityRgb(sev: Severity): [number, number, number] {
  const map: Record<Severity, [number, number, number]> = {
    critical: [239, 68, 68],
    high:     [249, 115, 22],
    medium:   [234, 179, 8],
    low:      [59, 130, 246],
    info:     [107, 114, 128],
  };
  return map[sev] ?? [107, 114, 128];
}

export async function generateComparisonPDF(
  scanA: ScanDetail,
  scanB: ScanDetail,
  diff: ComparisonDiff,
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = 210;
  const M = 20;
  const CW = W - M * 2;
  let y = 0;

  // ── COVER PAGE ──────────────────────────────────────────────────────────────
  doc.setFillColor(11, 20, 38);
  doc.rect(0, 0, W, 72, 'F');

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('SCAN COMPARISON REPORT', W / 2, 28, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(16, 185, 129);
  doc.text('VAPT Pro — Vulnerability Diff Analysis', W / 2, 38, { align: 'center' });
  doc.text(
    new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    W / 2, 46, { align: 'center' },
  );

  y = 82;

  // Scan A & B boxes
  const half = (CW - 8) / 2;
  const boxes: Array<{
    scan: ScanDetail; label: string;
    border: [number, number, number]; accent: [number, number, number];
    x: number;
  }> = [
    { scan: scanA, label: 'SCAN A — BASELINE',    border: [59, 130, 246], accent: [59, 130, 246], x: M },
    { scan: scanB, label: 'SCAN B — COMPARISON',  border: [16, 185, 129], accent: [16, 185, 129], x: M + half + 8 },
  ];

  boxes.forEach(({ scan, label, border, accent, x }) => {
    doc.setFillColor(17, 24, 39);
    doc.roundedRect(x, y, half, 50, 3, 3, 'F');
    doc.setDrawColor(...border);
    doc.setLineWidth(1);
    doc.roundedRect(x, y, half, 50, 3, 3, 'S');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...accent);
    doc.text(label, x + 5, y + 9);
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text(scan.target_ip, x + 5, y + 20);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(scan.scan_type.toUpperCase() + ' scan', x + 5, y + 28);
    doc.text(formatDateTime(scan.start_time), x + 5, y + 34);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`${scan.findings.length} total finding${scan.findings.length !== 1 ? 's' : ''}`, x + 5, y + 44);
  });

  // VS circle
  doc.setFillColor(16, 185, 129);
  doc.circle(W / 2, y + 25, 9, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('VS', W / 2, y + 28, { align: 'center' });

  y += 60;

  // Summary stats
  const statW = (CW - 9) / 4;
  const stats: Array<{ label: string; count: number; color: [number, number, number] }> = [
    { label: 'New Findings',  count: diff.newInB.length,      color: [239, 68, 68] },
    { label: 'Resolved',      count: diff.resolvedInA.length, color: [16, 185, 129] },
    { label: 'Score Changed', count: diff.changed.length,     color: [234, 179, 8] },
    { label: 'Unchanged',     count: diff.unchanged.length,   color: [100, 116, 139] },
  ];
  stats.forEach((s, i) => {
    const sx = M + i * (statW + 3);
    doc.setFillColor(...s.color);
    doc.roundedRect(sx, y, statW, 22, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(String(s.count), sx + statW / 2, y + 12, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(s.label, sx + statW / 2, y + 19, { align: 'center' });
  });
  y += 32;

  // ── Section renderer ─────────────────────────────────────────────────────────
  type VariantColor = 'new' | 'resolved' | 'changed';

  const renderSection = (
    title: string,
    findings: Finding[],
    variant: VariantColor,
    cvssChanges?: Map<string, number>,
  ) => {
    if (y > 220) { doc.addPage(); y = M; }

    const headerRgb: Record<VariantColor, [number, number, number]> = {
      new:      [239, 68, 68],
      resolved: [16, 185, 129],
      changed:  [234, 179, 8],
    };
    const rgb = headerRgb[variant];

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(11, 20, 38);
    doc.text(title, M, y + 6);
    doc.setDrawColor(...rgb);
    doc.setLineWidth(0.8);
    doc.line(M, y + 8, M + Math.min(70, title.length * 2.2), y + 8);
    y += 14;

    if (findings.length === 0) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('No findings in this category.', M, y + 4);
      y += 12;
      return;
    }

    // Table header
    doc.setFillColor(11, 20, 38);
    doc.rect(M, y, CW, 7, 'F');
    doc.setTextColor(16, 185, 129);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    const COL = [20, 26, 44, 32, 22, cvssChanges ? 22 : 0];
    const HDRS = ['PORT', 'SERVICE', 'VERSION', 'CVE ID', 'SEVERITY', cvssChanges ? 'CVSS Δ' : ''];
    let cx = M + 2;
    HDRS.forEach((h, i) => { if (h) { doc.text(h, cx, y + 5); cx += COL[i]; } });
    y += 7;

    findings.forEach((f, i) => {
      if (y > 272) { doc.addPage(); y = M; }
      if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(M, y, CW, 7.5, 'F'); }
      doc.setFillColor(...rgb);
      doc.rect(M, y, 2.5, 7.5, 'F');

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 50);
      cx = M + 5;
      doc.text(`${f.port}/${f.protocol}`, cx, y + 5); cx += COL[0];
      doc.text(f.service.substring(0, 10), cx, y + 5); cx += COL[1];
      doc.text((f.version || '—').substring(0, 25), cx, y + 5); cx += COL[2];
      doc.setTextColor(59, 130, 246);
      doc.text(f.cve_id || '—', cx, y + 5); cx += COL[3];
      const sc = severityRgb(f.severity);
      doc.setTextColor(...sc);
      doc.setFont('helvetica', 'bold');
      doc.text(f.severity.toUpperCase(), cx, y + 5); cx += COL[4];

      if (cvssChanges) {
        const delta = cvssChanges.get(f.id) ?? 0;
        if (delta !== 0) {
          doc.setTextColor(delta > 0 ? 239 : 16, delta > 0 ? 68 : 185, delta > 0 ? 68 : 129);
          doc.text(`${delta > 0 ? '+' : ''}${delta.toFixed(1)}`, cx, y + 5);
        } else {
          doc.setTextColor(100, 116, 139);
          doc.text('—', cx, y + 5);
        }
      }
      y += 7.5;
    });
    y += 6;
  };

  // ── Render sections ──────────────────────────────────────────────────────────
  renderSection('New Vulnerabilities (Scan B Only)', diff.newInB, 'new');
  renderSection('Resolved Vulnerabilities (Fixed in Scan B)', diff.resolvedInA, 'resolved');

  if (diff.changed.length > 0) {
    const changeMap = new Map(diff.changed.map(c => [c.fB.id, c.cvssChange]));
    renderSection('CVSS / Severity Changes', diff.changed.map(c => c.fB), 'changed', changeMap);
  }

  // ── Footer on every page ─────────────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFillColor(11, 20, 38);
    doc.rect(0, 285, W, 12, 'F');
    doc.setFontSize(7);
    doc.setTextColor(16, 185, 129);
    doc.text('VAPT Pro — Scan Comparison Report (Confidential)', M, 291);
    doc.setTextColor(150, 170, 200);
    doc.text(`Page ${p} of ${pages}`, W - M, 291, { align: 'right' });
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const name = `VAPT_Comparison_${scanA.target_ip.replace(/\./g, '_')}_vs_${scanB.target_ip.replace(/\./g, '_')}_${dateStr}.pdf`;
  doc.save(name);
}
