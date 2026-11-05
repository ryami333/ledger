import { parseCsv } from "../csv/parseCsv.ts";

/**
 * One expense row of a Splid export. The texts are the cells of the CSV,
 * with no change. Each member has a paid text and a received text, in the
 * order of `memberNames`. The member amounts use the currency of the Splid
 * group, not the currency of the row.
 */
export type SplidExportRow = {
  lineNumber: number;
  title: string;
  amountText: string;
  currency: string;
  dateText: string;
  createdOnText: string;
  paidTexts: string[];
  receivedTexts: string[];
};

/** The content of a Splid export. */
export type SplidExport = {
  groupName: string;
  memberNames: string[];
  rows: SplidExportRow[];
};

/** The columns before the member columns. */
const FIXED_COLUMNS = [
  "Title",
  "Amount",
  "Currency",
  "By",
  "Date",
  "Created on",
];

/** The separator between the group name and the date on the first line. */
const GROUP_NAME_SEPARATOR = " — ";

/**
 * Reads the CSV export of a Splid group ("Summary" sheet). The export has
 * the group name on the first line, then a header row:
 * `Title,Amount,Currency,By,Date,Created on,<member>,,<member>,`. Each
 * member has two columns: the amount that the member paid, and the negative
 * amount that the member received.
 *
 * The function ignores the empty rows and the total row at the end (a row
 * with no title and no amount). It gives an error text for a file that is
 * not a Splid export.
 */
export const parseSplidExport = (
  text: string,
): { splidExport: SplidExport } | { error: string } => {
  const records = parseCsv(text);
  const headerIndex = records.findIndex((record) =>
    FIXED_COLUMNS.every(
      (column, columnIndex) => record.cells[columnIndex]?.trim() === column,
    ),
  );
  const header = records[headerIndex];
  if (header === undefined) {
    return {
      error:
        "The file is not a Splid export. It has no row with the columns Title, Amount, Currency, By, Date, and Created on.",
    };
  }

  const memberCells = header.cells.slice(FIXED_COLUMNS.length);
  const memberNames = memberCells
    .filter((_, cellIndex) => cellIndex % 2 === 0)
    .map((name) => name.trim())
    .filter((name) => name !== "");
  const hasValidMemberColumns = memberCells.every((cell, cellIndex) => {
    const isNameColumn = cellIndex % 2 === 0;
    const memberIndex = Math.floor(cellIndex / 2);
    if (memberIndex >= memberNames.length) return cell.trim() === "";
    return isNameColumn ? cell.trim() !== "" : cell.trim() === "";
  });
  if (memberNames.length === 0 || !hasValidMemberColumns) {
    return {
      error:
        "The file is not a Splid export. The header row has no valid member columns.",
    };
  }

  const firstCell = records[0]?.cells[0]?.trim() ?? "";
  const groupName =
    headerIndex === 0 ? "" : (firstCell.split(GROUP_NAME_SEPARATOR)[0] ?? "");

  const rows = records
    .slice(headerIndex + 1)
    .filter((record) => {
      const [title = "", amountText = ""] = record.cells;
      return title.trim() !== "" || amountText.trim() !== "";
    })
    .map((record): SplidExportRow => {
      const cell = (cellIndex: number) => record.cells[cellIndex] ?? "";
      const memberCell = ({
        memberIndex,
        offset,
      }: {
        memberIndex: number;
        offset: number;
      }) => cell(FIXED_COLUMNS.length + memberIndex * 2 + offset).trim();
      return {
        lineNumber: record.lineNumber,
        title: cell(0).trim(),
        amountText: cell(1).trim(),
        currency: cell(2).trim().toUpperCase(),
        dateText: cell(4).trim(),
        createdOnText: cell(5).trim(),
        paidTexts: memberNames.map((_, memberIndex) =>
          memberCell({ memberIndex, offset: 0 }),
        ),
        receivedTexts: memberNames.map((_, memberIndex) =>
          memberCell({ memberIndex, offset: 1 }),
        ),
      };
    });

  return { splidExport: { groupName, memberNames, rows } };
};
