import { describeBalance } from "./describeBalance.ts";
import { describe, expect, it } from "vitest";

const locale = "en-IE";

describe("describeBalance", () => {
  it("writes a positive balance as 'is owed'", () => {
    expect(
      describeBalance({
        name: "Barack",
        balanceMinor: 2500n,
        currency: "EUR",
        locale,
      }),
    ).toBe("Barack is owed €25.00.");
  });

  it("writes a negative balance as 'owes', with no minus sign", () => {
    expect(
      describeBalance({
        name: "Donald",
        balanceMinor: -2500n,
        currency: "EUR",
        locale,
      }),
    ).toBe("Donald owes €25.00.");
  });

  it("writes a balance of zero as 'is settled up'", () => {
    expect(
      describeBalance({
        name: "Michelle",
        balanceMinor: 0n,
        currency: "EUR",
        locale,
      }),
    ).toBe("Michelle is settled up.");
  });
});
