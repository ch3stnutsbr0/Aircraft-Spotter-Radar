export type CsvValue = string | number | boolean | null | undefined;

export function escapeCsvValue(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}

export function serializeCsv<Header extends string>(
  headers: readonly Header[],
  rows: readonly Record<Header, CsvValue>[],
): string {
  return [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCsvValue(row[header])).join(",")
    ),
  ].join("\n") + "\n";
}
