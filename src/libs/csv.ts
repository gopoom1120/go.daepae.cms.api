export function toCsv<T extends object>(
  rows: T[],
  headers: { key: keyof T; label: string }[],
): string {
  const escape = (value: unknown) => {
    let str = value === null || value === undefined ? "" : String(value);
    if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const headerLine = headers.map((h) => escape(h.label)).join(",");
  const lines = rows.map((row) =>
    headers.map((h) => escape(row[h.key])).join(","),
  );
  return ["﻿" + headerLine, ...lines].join("\n");
}
