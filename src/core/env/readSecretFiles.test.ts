import { readSecretFiles } from "./readSecretFiles.ts";
import { describe, expect, it } from "vitest";

const files = new Map([
  ["/run/secrets/better_auth_secret", "auth-secret\n"],
  ["/run/secrets/postgres_password", "secret\r\n"],
  ["/run/secrets/resend_api_key", "re_test\n"],
  ["/run/secrets/empty", ""],
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

  it("reads the API key of Resend", () => {
    expect(
      readSecretFiles({
        env: { RESEND_API_KEY_FILE: "/run/secrets/resend_api_key" },
        readFile,
      }),
    ).toEqual({ RESEND_API_KEY: "re_test" });
  });

  it("gives an empty text for an empty file", () => {
    expect(
      readSecretFiles({
        env: { RESEND_API_KEY_FILE: "/run/secrets/empty" },
        readFile,
      }),
    ).toEqual({ RESEND_API_KEY: "" });
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
