import { isEmailEnabled } from "../server/sendEmail.ts";
import { createServerFn } from "@tanstack/react-start";

/**
 * Tells `/login` which sign-in methods are on. The magic link needs an API
 * key of Resend (PLAN.md, D18, rule 7).
 */
export const getAuthMethodsServerFn = createServerFn({ method: "GET" }).handler(
  () => ({ isMagicLinkEnabled: isEmailEnabled }),
);
