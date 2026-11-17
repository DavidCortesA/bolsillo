// CSV que abre bien en Excel: UTF-8 con BOM (acentos), saltos CRLF y celdas entrecomilladas.
export type Cell = string | number | null | undefined;

// Una celda de texto que empieza así puede ejecutarse como fórmula al abrirla en Excel/Sheets
const FORMULA = /^[=+\-@\t\r]/;

function cell(v: Cell): string {
  if (v === null || v === undefined) return '';
  // Los números se escriben tal cual (con punto decimal, sin separador de miles) para que sumen
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  const s = FORMULA.test(v) ? `'${v}` : v;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Cell[][]): string {
  return '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
