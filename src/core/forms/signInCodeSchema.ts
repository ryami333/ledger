import { emailSchema } from "./formFieldSchemas.ts";
import { z } from "zod";

/** The number of digits of a sign-in code (PLAN.md, D18). */
export const SIGN_IN_CODE_LENGTH = 6;

/**
 * The second step of the sign-in with a code on `/login` (PLAN.md, D18): the
 * email and the code from the email. The code accepts spaces and hyphens,
 * because a user can copy "123 456" or "123-456".
 *
 * `next` is the path to open after the sign-in. `oauthQuery` is the signed
 * query of an MCP authorization. With `oauthQuery`, the server ignores
 * `next`.
 */
export const signInCodeSchema = z.object({
  email: emailSchema,
  code: z
    .string()
    .transform((value) => value.replace(/[\s-]/g, ""))
    .pipe(
      z
        .string()
        .regex(
          new RegExp(`^\\d{${SIGN_IN_CODE_LENGTH}}$`),
          `Enter the ${SIGN_IN_CODE_LENGTH} digits from the email.`,
        ),
    ),
  next: z.string().optional(),
  oauthQuery: z.string().optional(),
});
