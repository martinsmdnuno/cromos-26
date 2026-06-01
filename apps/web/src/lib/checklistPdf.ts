import type { jsPDF } from 'jspdf';

/** A section row ready to print: code (heading), resolved display name, positions list. */
export interface ChecklistSection {
  code: string;
  name: string;
  positions: string[];
}

/** All copy is pre-resolved/interpolated by the caller so this module stays i18n-agnostic. */
export interface ChecklistStrings {
  title: string;
  subtitle: string;
  footerNote: string;
  generatedOn: string;
  fileName: string;
  /**
   * Optional cross-sell line drawn as a yellow strip right above the footer.
   * Used by the duplicates export to advertise the app on every shared PDF.
   */
  cta?: string;
}

export interface ChecklistData {
  sections: ChecklistSection[];
  strings: ChecklistStrings;
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
// Cross-sell strip: a colored band right above the footer. Height fixed; layout
// reserves space for it whenever `cta` is set so rows never collide with it.
const CTA_H = 7;
const CTA_GAP = 2;

function bodyBottomFor(strings: ChecklistStrings): number {
  // Above the footer line, plus the CTA strip + a small gap when present.
  return strings.cta ? FOOTER_BASELINE - 5 - CTA_H - CTA_GAP : PAGE_H - 13;
}

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

function drawCta(doc: jsPDF, cta: string): void {
  const stripY = FOOTER_BASELINE - 5 - CTA_H;
  // Panini yellow with a thin ink border, matching the in-app pill style.
  doc.setFillColor(244, 196, 48);
  doc.setDrawColor(26, 26, 26);
  doc.setLineWidth(0.4);
  doc.rect(MARGIN, stripY, CONTENT_W, CTA_H, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 26, 26);
  doc.text(cta, PAGE_W / 2, stripY + CTA_H / 2, { align: 'center', baseline: 'middle' });
}

function drawFooter(doc: jsPDF, strings: ChecklistStrings): void {
  if (strings.cta) drawCta(doc, strings.cta);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text(strings.footerNote, MARGIN, FOOTER_BASELINE);
  doc.text(strings.generatedOn, PAGE_W - MARGIN, FOOTER_BASELINE, { align: 'right' });
}

/**
 * Build (but don't save) the checklist PDF. Returns the jsPDF doc so callers can
 * `.save()` in the browser or `.output()` it in a test. jsPDF is loaded dynamically
 * so it stays out of the main bundle until someone actually exports.
 *
 * The same layout drives both "missing" and "duplicates" exports — only the strings
 * change (and the optional yellow CTA strip the duplicates PDF uses to cross-sell).
 */
export async function buildChecklistPdf(data: ChecklistData): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf');
  const { sections, strings } = data;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const bodyBottom = bodyBottomFor(strings);

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
    if (y + ROW_H > bodyBottom) {
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
export async function downloadChecklistPdf(data: ChecklistData): Promise<void> {
  const doc = await buildChecklistPdf(data);
  doc.save(data.strings.fileName);
}
