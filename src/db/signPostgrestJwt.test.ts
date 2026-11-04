import { signPostgrestJwt } from "./signPostgrestJwt.ts";
import { jwtVerify } from "jose";
import { describe, expect, it } from "vitest";

describe("signPostgrestJwt", () => {
  it("signs the role authenticated and the user ID, for 60 seconds", async () => {
    const jwtSecret = "a-test-secret-with-at-least-32-characters";
    const jwt = await signPostgrestJwt({
      jwtSecret,
      userId: "a0000000-0000-4000-8000-000000000001",
    });
    const { payload, protectedHeader } = await jwtVerify(
      jwt,
      new TextEncoder().encode(jwtSecret),
    );
    expect(protectedHeader.alg).toBe("HS256");
    expect(payload.role).toBe("authenticated");
    expect(payload.sub).toBe("a0000000-0000-4000-8000-000000000001");
    expect((payload.exp ?? 0) - (payload.iat ?? 0)).toBe(60);
  });
});
