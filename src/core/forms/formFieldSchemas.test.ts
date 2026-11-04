import {
  currencyCodeSchema,
  optionalTextSchema,
  requiredTextSchema,
} from "./formFieldSchemas.ts";
import { describe, expect, it } from "vitest";

describe("requiredTextSchema", () => {
  it("removes the spaces at the two ends and refuses an empty text", () => {
    const schema = requiredTextSchema("Enter a name.");
    expect(schema.parse("  Barack ")).toBe("Barack");
    expect(schema.safeParse("  ").error?.issues[0]?.message).toBe(
      "Enter a name.",
    );
  });
});

describe("optionalTextSchema", () => {
  it("gives null for an empty text", () => {
    expect(optionalTextSchema.parse("  ")).toBeNull();
    expect(optionalTextSchema.parse(" Dinner ")).toBe("Dinner");
  });
});

describe("currencyCodeSchema", () => {
  it("accepts a currency that Intl knows", () => {
    expect(currencyCodeSchema.parse("USD")).toBe("USD");
    expect(currencyCodeSchema.safeParse("ABC").success).toBe(false);
  });
});
