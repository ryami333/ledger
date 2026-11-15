import { renderMagicLinkEmail } from "./renderMagicLinkEmail.ts";
import { describe, expect, it } from "vitest";

describe("renderMagicLinkEmail", () => {
  const email = renderMagicLinkEmail({
    confirmUrl: "https://ledger.example/auth/magic-link?token=a&next=%2Fx",
    expiresInMinutes: 15,
  });

  it("has the link, the expiry, and the ignore text", () => {
    expect(email.subject).toBe("Sign in to ledger");
    expect(email.text).toContain(
      "https://ledger.example/auth/magic-link?token=a&next=%2Fx",
    );
    expect(email.text).toContain("15 minutes");
    expect(email.text).toContain("ignore it");
  });

  it("escapes the link in the HTML", () => {
    expect(email.html).toContain(
      'href="https://ledger.example/auth/magic-link?token=a&amp;next=%2Fx"',
    );
  });
});
