/**
 * Returns the path to open after the sign-in. It accepts only a path on the
 * same origin, so that the sign-in is not an open redirect. It returns the
 * fallback for any other value.
 */
export const resolveRedirectPath = ({
  next,
  fallback,
}: {
  next: string | null | undefined;
  fallback: string;
}): string => {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }
  // A backslash or a control character can change how a browser reads the
  // URL, for example "/\evil.com".
  if (/[\\\u0000-\u001f]/.test(next)) {
    return fallback;
  }
  const url = URL.parse(next, "http://origin.invalid");
  if (!url || url.origin !== "http://origin.invalid") {
    return fallback;
  }
  return `${url.pathname}${url.search}${url.hash}`;
};
