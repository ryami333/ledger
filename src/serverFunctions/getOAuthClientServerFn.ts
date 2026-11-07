import { auth } from "../server/auth.ts";
import { authMiddleware } from "../server/authMiddleware.ts";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";

/**
 * Returns the public fields of an OAuth client for the consent page
 * (PLAN.md, D15): its name and its URL. Returns null for an unknown client.
 */
export const getOAuthClientServerFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ clientId: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      const client = await auth.api.getOAuthClientPublic({
        query: { client_id: data.clientId },
        headers: getRequestHeaders(),
      });
      return {
        name: client.client_name ?? null,
        uri: client.client_uri ?? null,
      };
    } catch {
      return null;
    }
  });
