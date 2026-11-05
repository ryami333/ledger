/** One record of a CSV text, with the line where the record starts. */
export type CsvRecord = { lineNumber: number; cells: string[] };

/**
 * Splits a CSV text (RFC 4180) into records and cells. The separator is a
 * comma. A cell in double quotes can hold a comma, a line break, and a
 * double quote as two double quotes. The function accepts the line breaks
 * CRLF and LF, and ignores a byte order mark at the start.
 *
 * Each record has the number of its first line, from 1. The function keeps
 * an empty line as a record with one empty cell. It does not give a record
 * for the line break at the end of the text.
 */
export const parseCsv = (input: string): CsvRecord[] => {
  const text = input.startsWith("﻿") ? input.slice(1) : input;
  const records: CsvRecord[] = [];
  let cells: string[] = [];
  let cell = "";
  let isQuoted = false;
  let lineNumber = 1;
  let recordLineNumber = 1;

  const endCell = () => {
    cells.push(cell);
    cell = "";
  };
  const endRecord = () => {
    endCell();
    records.push({ lineNumber: recordLineNumber, cells });
    cells = [];
  };

  for (let characterIndex = 0; characterIndex < text.length; characterIndex++) {
    const character = text[characterIndex];
    if (isQuoted) {
      if (character === '"' && text[characterIndex + 1] === '"') {
        cell += '"';
        characterIndex++;
      } else if (character === '"') {
        isQuoted = false;
      } else {
        if (character === "\n") lineNumber++;
        cell += character;
      }
    } else if (character === '"' && cell === "") {
      isQuoted = true;
    } else if (character === ",") {
      endCell();
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[characterIndex + 1] === "\n") {
        characterIndex++;
      }
      endRecord();
      lineNumber++;
      recordLineNumber = lineNumber;
    } else {
      cell += character;
    }
  }
  if (cell !== "" || cells.length > 0) endRecord();
  return records;
};
