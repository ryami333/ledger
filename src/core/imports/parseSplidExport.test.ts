import { parseSplidExport } from "./parseSplidExport.ts";
import { describe, expect, it } from "vitest";

const exportText = [
  "Shmitch on tour — 4 November 2026,,,,,,,,,",
  "Created with Splid (splid.app),,,,,,,,,",
  ",,,,,,,,,",
  "Title,Amount,Currency,By,Date,Created on,Mitch,,Shannon,",
  "SIN-KLA flights,187.27,EUR,Mitch,–,03/10/2024,187.27,-93.64,,-93.64",
  '"Amazon (ball, bowls)",60.72,eur,Shannon,14/06/2025,15/06/2025,,-30.36,60.72,-30.36',
  ",,,,,,-512.94,,512.94,",
].join("\n");

describe("parseSplidExport", () => {
  it("reads the group name, the members, and the rows", () => {
    expect(parseSplidExport(exportText)).toEqual({
      splidExport: {
        groupName: "Shmitch on tour",
        memberNames: ["Mitch", "Shannon"],
        rows: [
          {
            lineNumber: 5,
            title: "SIN-KLA flights",
            amountText: "187.27",
            currency: "EUR",
            dateText: "–",
            createdOnText: "03/10/2024",
            paidTexts: ["187.27", ""],
            receivedTexts: ["-93.64", "-93.64"],
          },
          {
            lineNumber: 6,
            title: "Amazon (ball, bowls)",
            amountText: "60.72",
            currency: "EUR",
            dateText: "14/06/2025",
            createdOnText: "15/06/2025",
            paidTexts: ["", "60.72"],
            receivedTexts: ["-30.36", "-30.36"],
          },
        ],
      },
    });
  });

  it("refuses a file with no Splid header", () => {
    expect(parseSplidExport("date,amount\n2026-01-01,4")).toHaveProperty(
      "error",
    );
  });

  it("refuses a header with no members", () => {
    expect(
      parseSplidExport("Title,Amount,Currency,By,Date,Created on,,,"),
    ).toHaveProperty("error");
  });
});
