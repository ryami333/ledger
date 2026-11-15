import type { RenderedEmail } from "../core/email/RenderedEmail.ts";
import { env } from "../env.ts";
import { Resend } from "resend";

/** The Resend client, or null when RESEND_API_KEY is not set (PLAN.md, D18). */
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

/** Tells if the app can send email. The magic link and the invitation need it. */
export const isEmailEnabled = resend !== null;

/**
 * Sends one email from MAIL_FROM with Resend. It returns the ID that Resend
 * gives. It throws on an error of Resend, or when email is off.
 *
 * It logs the purpose, the duration, and the ID or the error code. It does
 * not log the address or the content (AGENTS.md, principle 6).
 */
export const sendEmail = async ({
  to,
  email,
  purpose,
}: {
  to: string;
  email: RenderedEmail;
  /** A short name for the log, for example "magic-link". */
  purpose: string;
}): Promise<{ id: string }> => {
  if (!resend) {
    throw new Error("Email is off: RESEND_API_KEY is not set.");
  }
  const startedAt = performance.now();
  const { data, error } = await resend.emails.send({
    from: env.MAIL_FROM,
    to,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });
  const durationMs = Math.round(performance.now() - startedAt);
  if (error || !data) {
    console.error("sendEmail failed", {
      purpose,
      durationMs,
      code: error?.name ?? "no_data",
      statusCode: error?.statusCode ?? null,
    });
    throw new Error("The email cannot be sent.");
  }
  console.log("sendEmail sent", { purpose, durationMs, emailId: data.id });
  return { id: data.id };
};
