import { planMigrations } from "./planMigrations.ts";
import { describe, expect, it } from "vitest";

describe("planMigrations", () => {
  it("gives the missing migrations in version order", () => {
    expect(
      planMigrations({
        fileNames: [
          "0003_add_listening_positions.sql",
          "0001_initial_schema.sql",
          "0002_add_index.sql",
          "README.md",
        ],
        appliedVersions: ["0001"],
      }),
    ).toEqual([
      {
        version: "0002",
        name: "add_index",
        fileName: "0002_add_index.sql",
      },
      {
        version: "0003",
        name: "add_listening_positions",
        fileName: "0003_add_listening_positions.sql",
      },
    ]);
  });

  it("gives no migration when the database has all of them", () => {
    expect(
      planMigrations({
        fileNames: ["0001_initial_schema.sql"],
        appliedVersions: ["0001"],
      }),
    ).toEqual([]);
  });

  it("refuses a bad file name", () => {
    expect(() =>
      planMigrations({ fileNames: ["initial.sql"], appliedVersions: [] }),
    ).toThrow("Bad migration file name: initial.sql");
  });

  it("refuses two files with the same version", () => {
    expect(() =>
      planMigrations({
        fileNames: ["0001_a.sql", "0001_b.sql"],
        appliedVersions: [],
      }),
    ).toThrow("Two migration files have version 0001");
  });

  it("refuses a database that is newer than the files", () => {
    expect(() =>
      planMigrations({
        fileNames: ["0001_initial_schema.sql"],
        appliedVersions: ["0001", "0002"],
      }),
    ).toThrow("The database has migrations with no file: 0002");
  });
});
