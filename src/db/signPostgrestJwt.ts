import { SignJWT } from "jose";

/** A short lifetime is enough, because each request signs a new token. */
const lifetimeSeconds = 60;

/**
 * Signs an HS256 JWT for PostgREST with the role authenticated. PostgREST
 * changes to this role, and the function current_user_id() reads `sub`
 * (PLAN.md, D3).
 */
export const signPostgrestJwt = async ({
  jwtSecret,
  userId,
}: {
  jwtSecret: string;
  userId: string;
}): Promise<string> =>
  new SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${lifetimeSeconds}s`)
    .sign(new TextEncoder().encode(jwtSecret));
