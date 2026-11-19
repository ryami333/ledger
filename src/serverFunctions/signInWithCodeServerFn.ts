import { describeSignInCodeError } from "../core/auth/describeSignInCodeError.ts";
import { oauthQueryToAuthorizePath } from "../core/auth/oauthQueryToAuthorizePath.ts";
import { resolveRedirectPath } from "../core/auth/resolveRedirectPath.ts";
import { signInCodeSchema } from "../core/forms/signInCodeSchema.ts";
import { assertValidOAuthQuery } from "../server/assertValidOAuthQuery.ts";
import { callAuthHandler } from "../server/callAuthHandler.ts";
import { createServerFn } from "@tanstack/react-start";
import {
  appendResponseHeader,
  setResponseStatus,
} from "@tanstack/react-start/server";
import { z } from "zod";

const errorBodySchema = z.object({ code: z.string().optional() });

/**
 * Signs in with the code from the email (PLAN.md, D18). better-auth sets the
 * session cookie. The cookie goes to the browser that typed the code, thus
 * the email can be read on a different device (D18, rule 6).
 *
 * Returns the path to open next: the authorize endpoint for a signed query
 * of an MCP authorization, else `next`.
 */
export const signInWithCodeServerFn = createServerFn({ method: "POST" })
  .validator(signInCodeSchema)
  .handler(async ({ data }) => {
    if (data.oauthQuery !== undefined) {
      await assertValidOAuthQuery(data.oauthQuery);
    }
    const response = await callAuthHandler({
      path: "/sign-in/email-otp",
      body: { email: data.email, otp: data.code },
    });
    if (response.status === 429) {
      setResponseStatus(429);
      throw new Error("Too many attempts. Wait one minute, then try again.");
    }
    if (!response.ok) {
      const errorBody = errorBodySchema.safeParse(
        await response.json().catch(() => null),
      );
      const errorCode = errorBody.success ? errorBody.data.code : undefined;
      console.log("signInWithCodeServerFn refused", {
        status: response.status,
        code: errorCode,
      });
      setResponseStatus(400);
      throw new Error(describeSignInCodeError(errorCode));
    }
    // The router of better-auth does not run the cookie plugin of TanStack
    // Start. Thus copy the session cookie to the answer.
    appendResponseHeader("set-cookie", response.headers.getSetCookie());
    return {
      redirectPath:
        data.oauthQuery === undefined
          ? resolveRedirectPath({ next: data.next, fallback: "/" })
          : oauthQueryToAuthorizePath(data.oauthQuery),
    };
  });
