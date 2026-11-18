/**
 * Minimal, dependency-free PDF writer for tabular exports.
 *
 * Renders a title, a subtitle and a table on A4 landscape pages using the
 * standard Helvetica fonts (no embedding needed). The header row repeats on
 * every page, rows are zebra-striped, cells that do not fit are truncated
 * with "...", and every page gets a "x / y" footer.
 *
 * Text is encoded in WinAnsi (Latin-1 + a few typographic characters), which
 * covers French and English. Characters outside it are replaced by "?".
 */

import { deflateSync } from "zlib";

export interface PdfColumn {
  header: string;
  /** Relative width; columns share the usable page width proportionally. */
  weight: number;
}

export interface PdfTable {
  title: string;
  subtitle?: string;
  columns: PdfColumn[];
  rows: (string | null | undefined)[][];
  /** Footer label before the page number, e.g. "Page". */
  pageLabel?: string;
}

// ─── Layout (points; A4 landscape) ────────────────────────────────────────────

const PAGE_W = 842;
const PAGE_H = 595;
const MARGIN = 30;
const FONT_SIZE = 8;
const HEADER_FONT_SIZE = 8;
const ROW_H = 16;
const CELL_PAD = 4;
const TITLE_SIZE = 15;
const TABLE_TOP = PAGE_H - MARGIN - 44; // below title + subtitle
const TABLE_BOTTOM = MARGIN + 18; // above footer

// ─── Text measurement (Helvetica AFM widths, 1/1000 em) ───────────────────────

// Widths for ASCII 32..126.
const HELVETICA_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

function charWidth(code: number, bold: boolean): number {
  const base = code >= 32 && code <= 126 ? HELVETICA_WIDTHS[code - 32] : 556;
  // Helvetica-Bold is slightly wider on average; a small factor keeps us safe.
  return bold ? base * 1.08 : base;
}

function textWidth(text: string, size: number, bold = false): number {
  let total = 0;
  for (let i = 0; i < text.length; i++) total += charWidth(text.charCodeAt(i), bold);
  return (total * size) / 1000;
}

function fitText(text: string, maxWidth: number, size: number, bold = false): string {
  if (textWidth(text, size, bold) <= maxWidth) return text;
  const ellipsis = "...";
  let end = text.length;
  while (end > 0 && textWidth(text.slice(0, end) + ellipsis, size, bold) > maxWidth) end--;
  return end > 0 ? text.slice(0, end).trimEnd() + ellipsis : "";
}

// ─── Encoding ─────────────────────────────────────────────────────────────────

// Unicode → WinAnsi for the 0x80–0x9F range.
const WIN_ANSI_EXTRA: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
};

/** Returns a "binary" string (one char per byte) in WinAnsi encoding. */
function toWinAnsi(value: string): string {
  let out = "";
  for (const ch of value.normalize("NFC")) {
    const code = ch.codePointAt(0)!;
    if (code === 0x09 || code === 0x0a || code === 0x0d) out += " ";
    else if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) out += ch;
    else if (WIN_ANSI_EXTRA[code]) out += String.fromCharCode(WIN_ANSI_EXTRA[code]);
    else out += "?";
  }
  return out;
}

function pdfString(winAnsi: string): string {
  return `(${winAnsi.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")})`;
}

function num(n: number): string {
  return Number(n.toFixed(2)).toString();
}

// ─── Page content ─────────────────────────────────────────────────────────────

function textOp(font: "F1" | "F2", size: number, x: number, y: number, winAnsi: string): string {
  return `BT /${font} ${size} Tf ${num(x)} ${num(y)} Td ${pdfString(winAnsi)} Tj ET\n`;
}

function renderPage(
  table: PdfTable,
  colX: number[],
  colW: number[],
  rows: string[][],
  pageIndex: number,
  pageCount: number,
): string {
  const tableW = PAGE_W - 2 * MARGIN;
  let ops = "";

  // Title and subtitle
  ops += "0.08 0.35 0.25 rg\n";
  ops += textOp("F2", TITLE_SIZE, MARGIN, PAGE_H - MARGIN - TITLE_SIZE, toWinAnsi(table.title));
  if (table.subtitle) {
    ops += "0.35 0.35 0.35 rg\n";
    ops += textOp("F1", 9, MARGIN, PAGE_H - MARGIN - TITLE_SIZE - 15, toWinAnsi(table.subtitle));
  }

  // Header row
  let y = TABLE_TOP;
  ops += `0.886 0.941 0.918 rg ${num(MARGIN)} ${num(y - ROW_H)} ${num(tableW)} ${ROW_H} re f\n`;
  ops += "0.1 0.1 0.1 rg\n";
  table.columns.forEach((col, i) => {
    const text = fitText(toWinAnsi(col.header), colW[i] - 2 * CELL_PAD, HEADER_FONT_SIZE, true);
    ops += textOp("F2", HEADER_FONT_SIZE, colX[i] + CELL_PAD, y - ROW_H + 5, text);
  });
  y -= ROW_H;

  // Body rows
  rows.forEach((row, r) => {
    if (r % 2 === 1) {
      ops += `0.965 0.969 0.973 rg ${num(MARGIN)} ${num(y - ROW_H)} ${num(tableW)} ${ROW_H} re f\n`;
    }
    ops += "0.13 0.13 0.13 rg\n";
    row.forEach((cell, i) => {
      if (!cell) return;
      const text = fitText(cell, colW[i] - 2 * CELL_PAD, FONT_SIZE);
      ops += textOp("F1", FONT_SIZE, colX[i] + CELL_PAD, y - ROW_H + 5, text);
    });
    y -= ROW_H;
  });

  // Bottom rule under the table
  ops += `0.8 0.8 0.8 RG 0.5 w ${num(MARGIN)} ${num(y)} m ${num(MARGIN + tableW)} ${num(y)} l S\n`;

  // Footer: "Page x / y"
  const footer = toWinAnsi(`${table.pageLabel ?? "Page"} ${pageIndex + 1} / ${pageCount}`);
  ops += "0.45 0.45 0.45 rg\n";
  ops += textOp("F1", 8, PAGE_W - MARGIN - textWidth(footer, 8), MARGIN, footer);

  return ops;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function buildPdfTable(table: PdfTable): Buffer {
  const tableW = PAGE_W - 2 * MARGIN;
  const totalWeight = table.columns.reduce((sum, c) => sum + c.weight, 0) || 1;
  const colW = table.columns.map((c) => (c.weight / totalWeight) * tableW);
  const colX: number[] = [];
  colW.reduce((x, w, i) => {
    colX[i] = x;
    return x + w;
  }, MARGIN);

  const rows = table.rows.map((row) =>
    table.columns.map((_, i) => toWinAnsi(row[i] ?? "")),
  );

  const rowsPerPage = Math.max(1, Math.floor((TABLE_TOP - ROW_H - TABLE_BOTTOM) / ROW_H));
  const pages: string[][][] = [];
  for (let i = 0; i < rows.length; i += rowsPerPage) pages.push(rows.slice(i, i + rowsPerPage));
  if (pages.length === 0) pages.push([]);

  // Object numbering: 1 catalog, 2 page tree, 3 Helvetica, 4 Helvetica-Bold,
  // then for each page: page object, content stream.
  const objects: Buffer[] = [];
  const pageObjNums = pages.map((_, i) => 5 + i * 2);

  objects[1] = Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "latin1");
  objects[2] = Buffer.from(
    `<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    "latin1",
  );
  objects[3] = Buffer.from(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "latin1",
  );
  objects[4] = Buffer.from(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    "latin1",
  );

  pages.forEach((pageRows, i) => {
    const pageNum = pageObjNums[i];
    const contentNum = pageNum + 1;
    const content = deflateSync(
      Buffer.from(renderPage(table, colX, colW, pageRows, i, pages.length), "latin1"),
    );
    objects[pageNum] = Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNum} 0 R >>`,
      "latin1",
    );
    objects[contentNum] = Buffer.concat([
      Buffer.from(`<< /Length ${content.length} /Filter /FlateDecode >>\nstream\n`, "latin1"),
      content,
      Buffer.from("\nendstream", "latin1"),
    ]);
  });

  const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "latin1")];
  let offset = chunks[0].length;
  const offsets: number[] = [];

  for (let n = 1; n < objects.length; n++) {
    offsets[n] = offset;
    const chunk = Buffer.concat([
      Buffer.from(`${n} 0 obj\n`, "latin1"),
      objects[n],
      Buffer.from("\nendobj\n", "latin1"),
    ]);
    chunks.push(chunk);
    offset += chunk.length;
  }

  const xrefOffset = offset;
  let xref = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let n = 1; n < objects.length; n++) {
    xref += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  chunks.push(Buffer.from(xref, "latin1"));

  return Buffer.concat(chunks);
}
