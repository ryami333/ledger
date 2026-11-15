import { emailSchema } from "./formFieldSchemas.ts";
import { z } from "zod";

/**
 * The magic-link form on `/login` (PLAN.md, D18). `next` is the path to
 * open after the sign-in. `oauthQuery` is the signed query of an MCP
 * authorization, when `/auth/sign-in` sent the user to `/login`.
 */
export const magicLinkRequestSchema = z.object({
  email: emailSchema,
  next: z.string().optional(),
  oauthQuery: z.string().optional(),
});
