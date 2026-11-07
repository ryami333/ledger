const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Gives the host of the redirect URI of an OAuth client, for the consent
 * page (PLAN.md, D15). `isLoopback` is true for an app on the computer of the
 * user, for example Claude Code. Any local process can use a loopback
 * address, thus the consent page shows a warning. Gives null for a text that
 * is not a URL.
 */
export const describeOAuthRedirect = (
  redirectUri: string,
): { host: string; isLoopback: boolean } | null => {
  const url = URL.parse(redirectUri);
  if (url === null) return null;
  return { host: url.host, isLoopback: loopbackHosts.has(url.hostname) };
};
