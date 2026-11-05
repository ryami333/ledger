import { parseCsv } from "./parseCsv.ts";
import { describe, expect, it } from "vitest";

describe("parseCsv", () => {
  it("splits the records and the cells", () => {
    expect(parseCsv("a,b,c\n1,,3\n")).toEqual([
      { lineNumber: 1, cells: ["a", "b", "c"] },
      { lineNumber: 2, cells: ["1", "", "3"] },
    ]);
  });

  it("accepts CRLF, no line break at the end, and a byte order mark", () => {
    expect(parseCsv("﻿a,b\r\nc,d")).toEqual([
      { lineNumber: 1, cells: ["a", "b"] },
      { lineNumber: 2, cells: ["c", "d"] },
    ]);
  });

  it("reads a cell in double quotes", () => {
    expect(
      parseCsv('"Amazon (ball, bowls)",1\n"Top up: ""asparagus""",2\n'),
    ).toEqual([
      { lineNumber: 1, cells: ["Amazon (ball, bowls)", "1"] },
      { lineNumber: 2, cells: ['Top up: "asparagus"', "2"] },
    ]);
  });

  it("keeps a line break in double quotes and counts the lines", () => {
    expect(parseCsv('"one\ntwo",x\nthree,y')).toEqual([
      { lineNumber: 1, cells: ["one\ntwo", "x"] },
      { lineNumber: 3, cells: ["three", "y"] },
    ]);
  });

  it("keeps an empty line as one empty cell", () => {
    expect(parseCsv("a\n\nb")).toEqual([
      { lineNumber: 1, cells: ["a"] },
      { lineNumber: 2, cells: [""] },
      { lineNumber: 3, cells: ["b"] },
    ]);
  });

  it("gives no record for an empty text", () => {
    expect(parseCsv("")).toEqual([]);
  });
});
