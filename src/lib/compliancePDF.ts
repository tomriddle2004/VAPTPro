import { FrameworkResult, RemediationItem } from '@/types';
import { getRemediationQueue } from './compliance';

export async function generateCompliancePDF(result: FrameworkResult): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = 210, margin = 18, contentW = W - margin * 2;
  let y = 0;

  const queue = getRemediationQueue(result);

  const scoreColor: [number, number, number] =
    result.score >= 70 ? [16, 185, 129] :
    result.score >= 40 ? [234, 179, 8] : [239, 68, 68];

  const statusColor = (status: string): [number, number, number] =>
    status === 'fail' ? [239, 68, 68] :
    status === 'pass' ? [16, 185, 129] : [100, 116, 139];

  // ── COVER PAGE ──────────────────────────────────────────────────────────────
  doc.setFillColor(6, 13, 26);
  doc.rect(0, 0, W, 297, 'F');

  doc.setFillColor(11, 20, 38);
  doc.rect(0, 0, W, 90, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(16, 185, 129);
  doc.text('VAPT Pro — Compliance Assessment Report', W / 2, 20, { align: 'center' });

  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(result.name, W / 2, 45, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 150, 200);
  doc.text(`Version ${result.version}`, W / 2, 55, { align: 'center' });

  // Score pill
  doc.setFillColor(...scoreColor);
  doc.roundedRect(W / 2 - 30, 63, 60, 18, 4, 4, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`${result.score}% Compliant`, W / 2, 74, { align: 'center' });

  y = 105;

  // Stats boxes
  const boxes = [
    { label: 'Passed', value: result.passed, color: [16, 185, 129] as [number, number, number] },
    { label: 'Failed', value: result.failed, color: [239, 68, 68] as [number, number, number] },
    { label: 'N/A', value: result.na, color: [100, 116, 139] as [number, number, number] },
    { label: 'Total', value: result.controls.length, color: [59, 130, 246] as [number, number, number] },
  ];

  const bW = (contentW - 9) / 4;
  boxes.forEach((b, i) => {
    const bx = margin + i * (bW + 3);
    doc.setFillColor(20, 30, 55);
    doc.roundedRect(bx, y, bW, 26, 3, 3, 'F');
    doc.setFillColor(...b.color);
    doc.rect(bx, y, 3, 26, 'F');
    doc.setTextColor(...b.color);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(String(b.value), bx + bW / 2 + 2, y + 13, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 180, 210);
    doc.text(b.label, bx + bW / 2 + 2, y + 21, { align: 'center' });
  });
  y += 34;

  // Score bar
  doc.setFillColor(20, 30, 55);
  doc.rect(margin, y, contentW, 12, 'F');
  doc.setFillColor(...scoreColor);
  doc.rect(margin, y, contentW * (result.score / 100), 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Compliance Score: ${result.score}%`, margin + 3, y + 8);
  y += 20;

  // Report info
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 120, 160);
  const dateStr = new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  doc.text(`Generated: ${dateStr}`, margin, y);
  doc.text(`Controls evaluated: ${result.controls.length}`, W - margin, y, { align: 'right' });
  y += 14;

  // ── SECTION 1: CONTROL GAP MATRIX ────────────────────────────────────────────
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text('1. Control Gap Matrix', margin, y);
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.6);
  doc.line(margin, y + 2, margin + 55, y + 2);
  y += 10;

  // Table header
  doc.setFillColor(11, 20, 38);
  doc.rect(margin, y, contentW, 8, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  const cols = { id: 22, name: 60, cat: 35, status: 20, findings: 18, cvss: 0 };
  let cx = margin + 2;
  doc.text('CONTROL ID', cx, y + 5); cx += cols.id;
  doc.text('CONTROL NAME', cx, y + 5); cx += cols.name;
  doc.text('CATEGORY', cx, y + 5); cx += cols.cat;
  doc.text('STATUS', cx, y + 5); cx += cols.status;
  doc.text('FINDINGS', cx, y + 5); cx += cols.findings;
  doc.text('MAX CVSS', cx, y + 5);
  y += 8;

  result.controls.forEach((ctrl, i) => {
    if (y > 270) { doc.addPage(); doc.setFillColor(6, 13, 26); doc.rect(0, 0, W, 297, 'F'); y = margin; }

    if (i % 2 === 0) { doc.setFillColor(14, 22, 42); doc.rect(margin, y, contentW, 8, 'F'); }

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    cx = margin + 2;

    doc.setTextColor(160, 190, 230);
    doc.setFont('helvetica', 'bold');
    doc.text(ctrl.id, cx, y + 5); cx += cols.id;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(220, 230, 245);
    doc.text(ctrl.name.substring(0, 32), cx, y + 5); cx += cols.name;

    doc.setTextColor(130, 150, 190);
    doc.text(ctrl.category.substring(0, 18), cx, y + 5); cx += cols.cat;

    const sc = statusColor(ctrl.status);
    doc.setTextColor(...sc);
    doc.setFont('helvetica', 'bold');
    doc.text(ctrl.status.toUpperCase(), cx, y + 5); cx += cols.status;

    doc.setTextColor(220, 230, 245);
    doc.setFont('helvetica', 'normal');
    doc.text(ctrl.affectedFindings.length > 0 ? String(ctrl.affectedFindings.length) : '—', cx, y + 5); cx += cols.findings;

    if (ctrl.maxCVSS > 0) {
      const cvssC: [number, number, number] = ctrl.maxCVSS >= 9 ? [239, 68, 68] : ctrl.maxCVSS >= 7 ? [249, 115, 22] : [234, 179, 8];
      doc.setTextColor(...cvssC);
      doc.setFont('helvetica', 'bold');
      doc.text(ctrl.maxCVSS.toFixed(1), cx, y + 5);
    } else {
      doc.setTextColor(100, 116, 139);
      doc.text('—', cx, y + 5);
    }

    y += 8;
  });

  // ── SECTION 2: REMEDIATION PRIORITY QUEUE ─────────────────────────────────
  doc.addPage();
  doc.setFillColor(6, 13, 26);
  doc.rect(0, 0, W, 297, 'F');
  y = margin;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text('2. Remediation Priority Queue', margin, y);
  doc.setDrawColor(16, 185, 129);
  doc.line(margin, y + 2, margin + 75, y + 2);
  y += 12;

  if (queue.length === 0) {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(10);
    doc.text('No failed controls identified. Compliance posture is good.', margin, y + 10);
  } else {
    queue.forEach(item => {
      if (y > 260) { doc.addPage(); doc.setFillColor(6, 13, 26); doc.rect(0, 0, W, 297, 'F'); y = margin; }

      const priorityColor: [number, number, number] =
        item.priority <= 3 ? [239, 68, 68] : item.priority <= 6 ? [249, 115, 22] : [234, 179, 8];

      doc.setFillColor(14, 22, 42);
      doc.roundedRect(margin, y, contentW, 28, 2, 2, 'F');
      doc.setFillColor(...priorityColor);
      doc.rect(margin, y, 4, 28, 'F');

      // Priority badge
      doc.setFillColor(...priorityColor);
      doc.circle(margin + 14, y + 10, 7, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(String(item.priority), margin + 14, y + 13, { align: 'center' });

      // Control info
      doc.setTextColor(220, 230, 245);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`${item.control.id} — ${item.control.name}`, margin + 26, y + 9);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(130, 160, 200);
      const remText = doc.splitTextToSize(item.control.remediation, contentW - 50);
      doc.text(remText.slice(0, 2), margin + 26, y + 16);

      // Meta pills
      const effortColor: [number, number, number] =
        item.estimatedEffort === 'Low' ? [16, 185, 129] :
        item.estimatedEffort === 'Medium' ? [234, 179, 8] : [239, 68, 68];

      doc.setFillColor(...effortColor);
      doc.roundedRect(W - margin - 30, y + 6, 25, 7, 2, 2, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text(`Effort: ${item.estimatedEffort}`, W - margin - 30 + 12.5, y + 11, { align: 'center' });

      if (item.maxCVSS > 0) {
        doc.setFillColor(30, 40, 70);
        doc.roundedRect(W - margin - 58, y + 6, 26, 7, 2, 2, 'F');
        const cvssC: [number, number, number] = item.maxCVSS >= 9 ? [239, 68, 68] : [249, 115, 22];
        doc.setTextColor(...cvssC);
        doc.text(`CVSS ${item.maxCVSS.toFixed(1)}`, W - margin - 58 + 13, y + 11, { align: 'center' });
      }

      y += 32;
    });
  }

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFillColor(11, 20, 38);
    doc.rect(0, 285, W, 12, 'F');
    doc.setFontSize(7);
    doc.setTextColor(16, 185, 129);
    doc.text(`VAPT Pro — ${result.name} ${result.version} Compliance Report`, margin, 291);
    doc.setTextColor(100, 130, 170);
    doc.text(`Page ${p} of ${pageCount}`, W - margin, 291, { align: 'right' });
  }

  const filename = `Compliance_${result.id.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
