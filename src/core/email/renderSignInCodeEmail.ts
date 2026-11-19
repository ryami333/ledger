import type { RenderedEmail } from "./RenderedEmail.ts";
import { escapeHtml } from "./escapeHtml.ts";

/**
 * The email with a sign-in code (PLAN.md, D18). The subject starts with the
 * code, so that the notification of a phone shows it. The email has no link:
 * the user types the code on the page that asked for it.
 */
export const renderSignInCodeEmail = ({
  code,
  expiresInMinutes,
}: {
  code: string;
  expiresInMinutes: number;
}): RenderedEmail => {
  const subject = `${code} is your ledger sign-in code`;
  const text = [
    "Your sign-in code for ledger:",
    "",
    code,
    "",
    "Type it on the page where you asked for it.",
    `The code expires in ${expiresInMinutes} minutes, and works one time only.`,
    "If you did not ask for this email, ignore it.",
  ].join("\n");
  const html = [
    "<p>Your sign-in code for ledger:</p>",
    `<p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; font-family: monospace;">${escapeHtml(code)}</p>`,
    "<p>Type it on the page where you asked for it.</p>",
    `<p>The code expires in ${expiresInMinutes} minutes, and works one time only.</p>`,
    "<p>If you did not ask for this email, ignore it.</p>",
  ].join("\n");
  return { subject, text, html };
};
