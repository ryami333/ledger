import { auth } from "./auth.ts";
import { verifyOAuthQueryParams } from "@better-auth/oauth-provider";
import { setResponseStatus } from "@tanstack/react-start/server";

/**
 * Verifies the signature and the expiry of the signed query of an MCP
 * authorization (PLAN.md, D18, rule 6). It throws an error with status 400
 * when the query is not valid.
 */
export const assertValidOAuthQuery = async (
  oauthQuery: string,
): Promise<void> => {
  const { secret } = await auth.$context;
  if (!(await verifyOAuthQueryParams(oauthQuery, secret))) {
    setResponseStatus(400);
    throw new Error(
      "The sign-in request of the app expired. Start it again in the app.",
    );
  }
};
