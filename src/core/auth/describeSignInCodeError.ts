/**
 * Returns the text for an error code of the sign-in endpoint of the email
 * OTP plugin of better-auth (PLAN.md, D18). An unknown code gives a general
 * text. better-auth gives `INVALID_OTP` also for an email with no user.
 */
export const describeSignInCodeError = (code: string | undefined): string => {
  if (code === "INVALID_OTP") {
    return "The code is not correct. Check the email, then try again.";
  }
  if (code === "OTP_EXPIRED") {
    return "The code has expired. Ask for a new code.";
  }
  if (code === "TOO_MANY_ATTEMPTS") {
    return "Too many wrong codes. Ask for a new code.";
  }
  return "The sign-in failed. Try again.";
};
