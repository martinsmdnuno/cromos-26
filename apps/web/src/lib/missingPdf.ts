import type { jsPDF } from 'jspdf';

/** A section row ready to print: code (heading), resolved display name, missing positions. */
export interface MissingPdfSection {
  code: string;
  name: string;
  positions: string[];
}

/** All copy is pre-resolved/interpolated by the caller so this module stays i18n-agnostic. */
export interface MissingPdfStrings {
  title: string;
  subtitle: string;
  footerNote: string;
  generatedOn: string;
  fileName: string;
}

export interface MissingPdfData {
  sections: MissingPdfSection[];
  strings: MissingPdfStrings;
}

// A4 portrait, millimetres. Tuned so a full 49-section album fits on a single page,
// matching the printed checklist.
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
const CODE_X = MARGIN + 1;
const NAME_X = MARGIN + 14;
const NUMS_X = MARGIN + 49;
const NUMS_W = PAGE_W - MARGIN - NUMS_X;
const NAME_W = NUMS_X - NAME_X - 2;
const ROW_H = 5.0;
const LINE_H = 3.6;
const BODY_TOP = 31;
const FOOTER_BASELINE = PAGE_H - 8;
const BODY_BOTTOM = PAGE_H - 13;

function fittedNameSize(doc: jsPDF, name: string): number {
  doc.setFont('helvetica', 'normal');
  let size = 7.5;
  while (size > 6) {
    doc.setFontSize(size);
    if (doc.getTextWidth(name) <= NAME_W) break;
    size -= 0.5;
  }
  return size;
}

function drawFooter(doc: jsPDF, strings: MissingPdfStrings): void {
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text(strings.footerNote, MARGIN, FOOTER_BASELINE);
  doc.text(strings.generatedOn, PAGE_W - MARGIN, FOOTER_BASELINE, { align: 'right' });
}

/**
 * Build (but don't save) the missing-stickers checklist PDF. Returns the jsPDF doc so
 * callers can `.save()` in the browser or `.output()` it in a test. jsPDF is loaded
 * dynamically to keep it out of the main bundle until someone actually exports.
 */
export async function buildMissingPdf(data: MissingPdfData): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf');
  const { sections, strings } = data;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(26, 26, 26);
  doc.text(strings.title, MARGIN, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(strings.subtitle, MARGIN, 24.5);

  doc.setDrawColor(26, 26, 26);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, 28, PAGE_W - MARGIN, 28);

  // Rows
  let y = BODY_TOP;
  let zebra = false;
  for (const sec of sections) {
    if (y + ROW_H > BODY_BOTTOM) {
      drawFooter(doc, strings);
      doc.addPage();
      y = MARGIN + 4;
      zebra = false;
    }

    if (zebra) {
      doc.setFillColor(244, 244, 244);
      doc.rect(MARGIN, y, CONTENT_W, ROW_H, 'F');
    }
    zebra = !zebra;

    const midY = y + ROW_H / 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(26, 26, 26);
    doc.text(sec.code, CODE_X, midY, { baseline: 'middle' });

    doc.setFontSize(fittedNameSize(doc, sec.name));
    doc.setTextColor(95, 95, 95);
    doc.text(sec.name, NAME_X, midY, { baseline: 'middle' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);
    const numbers = sec.positions.join('  ');
    const lines = doc.splitTextToSize(numbers, NUMS_W) as string[];
    doc.text(lines, NUMS_X, midY, { baseline: 'middle' });

    // Rare overflow guard: a wrapped numbers cell needs a taller row.
    const extra = Math.max(0, lines.length - 1) * LINE_H;
    y += ROW_H + extra;
  }

  drawFooter(doc, strings);
  return doc;
}

/** Build the checklist and trigger a browser download. */
export async function downloadMissingPdf(data: MissingPdfData): Promise<void> {
  const doc = await buildMissingPdf(data);
  doc.save(data.strings.fileName);
}
