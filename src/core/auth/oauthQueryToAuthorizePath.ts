/**
 * The parameters that the OAuth server of better-auth adds to the signed
 * query of its login page. The authorize endpoint does not accept them.
 */
const signatureParameterNames = ["sig", "exp", "ba_iat", "ba_pl", "ba_param"];

/**
 * Returns the path of the authorize endpoint for a signed query of the login
 * page (PLAN.md, D18, rule 6). After a sign-in code, the browser opens this
 * path with a session, and the MCP authorization continues.
 *
 * It does what better-auth does after a Pocket ID sign-in: it removes the
 * signature, the prompt `login`, and `max_age`, because the session is new.
 * Verify the signature of the query before you call this function.
 */
export const oauthQueryToAuthorizePath = (oauthQuery: string): string => {
  const parameters = new URLSearchParams(oauthQuery);
  for (const name of signatureParameterNames) {
    parameters.delete(name);
  }
  parameters.delete("max_age");
  const prompts = (parameters.get("prompt") ?? "")
    .split(" ")
    .filter((prompt) => prompt !== "" && prompt !== "login");
  if (prompts.length > 0) {
    parameters.set("prompt", prompts.join(" "));
  } else {
    parameters.delete("prompt");
  }
  return `/api/auth/oauth2/authorize?${parameters.toString()}`;
};
