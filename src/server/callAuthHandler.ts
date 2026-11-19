import { env } from "../env.ts";
import { auth } from "./auth.ts";
import { getRequestHeaders } from "@tanstack/react-start/server";

/**
 * Sends a JSON `POST` to an endpoint of better-auth through `auth.handler`,
 * with the headers of the current request. Use it in place of `auth.api`
 * when the rate limit must apply: only the handler applies the rate limit
 * and the CSRF check of better-auth.
 */
export const callAuthHandler = ({
  path,
  body,
}: {
  /** The path under `/api/auth`, for example `/sign-in/email-otp`. */
  path: string;
  body: Record<string, unknown>;
}): Promise<Response> => {
  const headers = new Headers(getRequestHeaders());
  headers.delete("content-length");
  headers.set("content-type", "application/json");
  return auth.handler(
    new Request(new URL(`/api/auth${path}`, env.APP_URL), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
  );
};
