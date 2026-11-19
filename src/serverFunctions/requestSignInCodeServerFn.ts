import { signInCodeRequestSchema } from "../core/forms/signInCodeRequestSchema.ts";
import { assertValidOAuthQuery } from "../server/assertValidOAuthQuery.ts";
import { callAuthHandler } from "../server/callAuthHandler.ts";
import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";

/**
 * Asks better-auth to send a sign-in code (PLAN.md, D18). The answer is the
 * same for a known and an unknown email, so a caller cannot find which
 * emails have a user.
 *
 * With a signed query of an MCP authorization (`oauthQuery`), it first
 * verifies the query, so that the user does not wait for a code that cannot
 * continue the authorization.
 */
export const requestSignInCodeServerFn = createServerFn({ method: "POST" })
  .validator(signInCodeRequestSchema)
  .handler(async ({ data }) => {
    if (data.oauthQuery !== undefined) {
      await assertValidOAuthQuery(data.oauthQuery);
    }
    const response = await callAuthHandler({
      path: "/email-otp/send-verification-otp",
      body: { email: data.email, type: "sign-in" },
    });
    if (response.status === 429) {
      setResponseStatus(429);
      throw new Error("Too many requests. Wait 10 minutes, then try again.");
    }
    if (!response.ok) {
      console.error("requestSignInCodeServerFn failed", {
        status: response.status,
      });
      setResponseStatus(502);
      throw new Error("The sign-in code cannot be sent. Try again.");
    }
    return { sent: true };
  });
