/**
 * CSV writer for exports that open cleanly in Excel, LibreOffice and
 * Google Sheets.
 *
 * - UTF-8 with BOM so Excel shows accented characters correctly.
 * - CRLF line endings, RFC 4180 quoting.
 * - Cells that would be evaluated as formulas ("=...", "@...", "+SUM(...)")
 *   are prefixed with an apostrophe (CSV/formula injection protection).
 *   Phone numbers such as "+237 6..." are left untouched.
 */

export type CsvCell = string | number | null | undefined;

const FORMULA_START = /^[=@\t\r+-]/;
// "+237 6 71 17 89 92", "-12", "+33 (0)6..." are plain values, not formulas.
const PHONE_OR_NUMBER = /^[+-][\d\s().]*$/;

function escapeCell(value: CsvCell, separator: string): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (FORMULA_START.test(text) && !PHONE_OR_NUMBER.test(text)) text = `'${text}`;
  if (text.includes(separator) || /["\r\n]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildCsv(
  headers: string[],
  rows: CsvCell[][],
  separator: "," | ";" = ",",
): Buffer {
  const lines = [headers, ...rows].map((row) =>
    row.map((cell) => escapeCell(cell, separator)).join(separator),
  );
  return Buffer.from("﻿" + lines.join("\r\n") + "\r\n", "utf8");
}
