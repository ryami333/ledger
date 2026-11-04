import { chooseDatabaseErrorMessage } from "./chooseDatabaseErrorMessage.ts";
import { describe, expect, it } from "vitest";

const messages = {
  uniqueViolation: "The name is in use.",
  foreignKeyViolation: "The member is in use.",
  fallback: "The member cannot be saved.",
};

describe("chooseDatabaseErrorMessage", () => {
  it("chooses the text of the error code", () => {
    expect(chooseDatabaseErrorMessage({ code: "23505", messages })).toBe(
      "The name is in use.",
    );
    expect(chooseDatabaseErrorMessage({ code: "23503", messages })).toBe(
      "The member is in use.",
    );
  });

  it("gives the fallback for another code or a code with no text", () => {
    expect(chooseDatabaseErrorMessage({ code: "42501", messages })).toBe(
      "The member cannot be saved.",
    );
    expect(
      chooseDatabaseErrorMessage({
        code: "23505",
        messages: { fallback: "No save." },
      }),
    ).toBe("No save.");
  });
});
