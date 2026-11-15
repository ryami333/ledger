import { renderInvitationEmail } from "./renderInvitationEmail.ts";
import { describe, expect, it } from "vitest";

describe("renderInvitationEmail", () => {
  it("names the inviter and escapes the name in the HTML", () => {
    const email = renderInvitationEmail({
      inviterName: "Mitch <script>",
      loginUrl: "https://ledger.example/login",
    });
    expect(email.subject).toBe("Mitch <script> invited you to ledger");
    expect(email.text).toContain("https://ledger.example/login");
    expect(email.html).toContain("Mitch &lt;script&gt; invited you");
    expect(email.html).not.toContain("<script>");
  });
});
