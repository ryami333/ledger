import { renderSignInCodeEmail } from "./renderSignInCodeEmail.ts";
import { describe, expect, it } from "vitest";

describe("renderSignInCodeEmail", () => {
  const email = renderSignInCodeEmail({ code: "042917", expiresInMinutes: 10 });

  it("puts the code first in the subject", () => {
    expect(email.subject).toBe("042917 is your ledger sign-in code");
  });

  it("has the code, the expiry, and the ignore text", () => {
    for (const part of [email.text, email.html]) {
      expect(part).toContain("042917");
      expect(part).toContain("10 minutes");
      expect(part).toContain("ignore it");
    }
  });

  it("has no link", () => {
    expect(email.text).not.toContain("http");
    expect(email.html).not.toContain("href");
  });
});
