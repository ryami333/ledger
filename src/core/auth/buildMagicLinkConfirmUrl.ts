/**
 * Returns the URL in the magic-link email: the confirm page
 * `/auth/magic-link` (PLAN.md, D18, rule 4). The page, not the email, sends
 * the token to the verify endpoint of better-auth. Thus a mail scanner that
 * opens the link does not consume the token.
 */
export const buildMagicLinkConfirmUrl = ({
  appUrl,
  token,
  callbackPath,
}: {
  appUrl: string;
  token: string;
  /** The path to open after the sign-in. "/" adds no parameter `next`. */
  callbackPath: string;
}): URL => {
  const url = new URL("/auth/magic-link", appUrl);
  url.searchParams.set("token", token);
  if (callbackPath !== "/") {
    url.searchParams.set("next", callbackPath);
  }
  return url;
};
