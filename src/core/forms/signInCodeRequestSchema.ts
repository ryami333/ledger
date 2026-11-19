import { emailSchema } from "./formFieldSchemas.ts";
import { z } from "zod";

/**
 * The first step of the sign-in with a code on `/login` (PLAN.md, D18): the
 * email that gets the code. `oauthQuery` is the signed query of an MCP
 * authorization, when `/auth/sign-in` sent the user to `/login`.
 */
export const signInCodeRequestSchema = z.object({
  email: emailSchema,
  oauthQuery: z.string().optional(),
});
