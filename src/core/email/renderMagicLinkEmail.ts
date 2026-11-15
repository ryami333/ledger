import type { RenderedEmail } from "./RenderedEmail.ts";
import { escapeHtml } from "./escapeHtml.ts";

/**
 * The magic-link email (PLAN.md, D18). The link opens the confirm page, and
 * expires after `expiresInMinutes`.
 */
export const renderMagicLinkEmail = ({
  confirmUrl,
  expiresInMinutes,
}: {
  confirmUrl: string;
  expiresInMinutes: number;
}): RenderedEmail => {
  const subject = "Sign in to ledger";
  const text = [
    "Open this link to sign in to ledger:",
    "",
    confirmUrl,
    "",
    `The link expires in ${expiresInMinutes} minutes, and works one time only.`,
    "If you did not ask for this email, ignore it.",
  ].join("\n");
  const html = [
    "<p>Open this link to sign in to ledger:</p>",
    `<p><a href="${escapeHtml(confirmUrl)}">Sign In to ledger</a></p>`,
    `<p>The link expires in ${expiresInMinutes} minutes, and works one time only.</p>`,
    "<p>If you did not ask for this email, ignore it.</p>",
  ].join("\n");
  return { subject, text, html };
};
