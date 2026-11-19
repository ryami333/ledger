import { describeSignInCodeError } from "./describeSignInCodeError.ts";
import { describe, expect, it } from "vitest";

describe("describeSignInCodeError", () => {
  it("gives a text for each error code of the plugin", () => {
    expect(describeSignInCodeError("INVALID_OTP")).toContain("not correct");
    expect(describeSignInCodeError("OTP_EXPIRED")).toContain("expired");
    expect(describeSignInCodeError("TOO_MANY_ATTEMPTS")).toContain("Too many");
  });

  it("gives a general text for an unknown code", () => {
    expect(describeSignInCodeError(undefined)).toBe(
      "The sign-in failed. Try again.",
    );
    expect(describeSignInCodeError("SOMETHING_ELSE")).toBe(
      "The sign-in failed. Try again.",
    );
  });
});
