import { readSecretFiles } from "./readSecretFiles.ts";
import { describe, expect, it } from "vitest";

const files = new Map([
  ["/run/secrets/better_auth_secret", "auth-secret\n"],
  ["/run/secrets/postgres_password", "secret\r\n"],
]);

const readFile = (path: string): string => {
  const content = files.get(path);
  if (content === undefined) {
    throw new Error(`No file ${path}`);
  }
  return content;
};

describe("readSecretFiles", () => {
  it("reads each <NAME>_FILE and removes the line break at the end", () => {
    expect(
      readSecretFiles({
        env: {
          BETTER_AUTH_SECRET_FILE: "/run/secrets/better_auth_secret",
          PGPASSWORD_FILE: "/run/secrets/postgres_password",
          APP_URL: "http://127.0.0.1:3001",
        },
        readFile,
      }),
    ).toEqual({ BETTER_AUTH_SECRET: "auth-secret", PGPASSWORD: "secret" });
  });

  it("ignores a _FILE variable that is not a secret", () => {
    expect(
      readSecretFiles({
        env: { APP_URL_FILE: "/run/secrets/better_auth_secret" },
        readFile,
      }),
    ).toEqual({});
  });

  it("ignores an empty _FILE variable", () => {
    expect(readSecretFiles({ env: { PGPASSWORD_FILE: "" }, readFile })).toEqual(
      {},
    );
  });

  it("throws when both <NAME> and <NAME>_FILE have a value", () => {
    expect(() =>
      readSecretFiles({
        env: {
          PGPASSWORD: "secret",
          PGPASSWORD_FILE: "/run/secrets/postgres_password",
        },
        readFile,
      }),
    ).toThrow("Set PGPASSWORD or PGPASSWORD_FILE, not both.");
  });
});
