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

export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      if (field) throw new Error("Invalid CSV: quote begins inside an unquoted field.");
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }

  if (quoted) throw new Error("Invalid CSV: unterminated quoted field.");
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function parseCsvObjects(input: string): Array<Record<string, string>> {
  const [headers, ...rows] = parseCsv(input);
  if (!headers?.length || headers.some((header) => !header)) {
    throw new Error("Invalid CSV: a non-empty header row is required.");
  }
  if (new Set(headers).size !== headers.length) {
    throw new Error("Invalid CSV: duplicate headers are not allowed.");
  }
  return rows
    .filter((row) => row.length > 1 || row[0] !== "")
    .map((row, index) => {
      if (row.length !== headers.length) {
        throw new Error(
          `Invalid CSV: row ${index + 2} has ${row.length} fields; expected ${headers.length}.`,
        );
      }
      return Object.fromEntries(
        headers.map((header, column) => [header, row[column] ?? ""]),
      );
    });
}
