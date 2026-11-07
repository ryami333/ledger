import { findDuplicateTransaction } from "./findDuplicateTransaction.ts";
import { describe, expect, it } from "vitest";

const dinner = {
  id: "t1",
  title: "Dinner",
  amount_minor: 9000n,
  currency: "EUR",
  transaction_date: "2026-11-07",
};

describe("findDuplicateTransaction", () => {
  it("finds the same date, title, amount, and currency", () => {
    expect(
      findDuplicateTransaction({
        transactions: [dinner],
        candidate: { ...dinner, title: " dinner " },
        ignoreTransactionId: null,
      }),
    ).toBe(dinner);
  });

  it("gives null for a different amount or date", () => {
    for (const candidate of [
      { ...dinner, amount_minor: 9001n },
      { ...dinner, transaction_date: "2026-11-08" },
      { ...dinner, currency: "USD" },
    ]) {
      expect(
        findDuplicateTransaction({
          transactions: [dinner],
          candidate,
          ignoreTransactionId: null,
        }),
      ).toBeNull();
    }
  });

  it("ignores the transaction that the tool changes", () => {
    expect(
      findDuplicateTransaction({
        transactions: [dinner],
        candidate: dinner,
        ignoreTransactionId: "t1",
      }),
    ).toBeNull();
  });
});
