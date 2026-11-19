import type { RenderedEmail } from "./RenderedEmail.ts";
import { escapeHtml } from "./escapeHtml.ts";

/**
 * The invitation email (PLAN.md, D19, rule 4). It has no token: it links to
 * `/login`, where the guest asks for a sign-in code.
 */
export const renderInvitationEmail = ({
  inviterName,
  loginUrl,
}: {
  inviterName: string;
  loginUrl: string;
}): RenderedEmail => {
  const subject = `${inviterName} invited you to ledger`;
  const text = [
    `${inviterName} invited you to ledger, a shared expense tracker.`,
    "",
    "To sign in, open this page and enter this email address. ledger then",
    "sends you a sign-in code.",
    "",
    loginUrl,
  ].join("\n");
  const html = [
    `<p>${escapeHtml(inviterName)} invited you to ledger, a shared expense tracker.</p>`,
    "<p>To sign in, open this page and enter this email address. ledger then sends you a sign-in code.</p>",
    `<p><a href="${escapeHtml(loginUrl)}">Open ledger</a></p>`,
  ].join("\n");
  return { subject, text, html };
};
