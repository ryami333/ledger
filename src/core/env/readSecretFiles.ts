/**
 * The env variables that can come from a file, for example a Docker secret
 * at `/run/secrets/<name>`. Set `<NAME>_FILE` to the path of the file.
 */
export const secretEnvNames = [
  "POSTGREST_JWT_SECRET",
  "BETTER_AUTH_SECRET",
  "POCKET_ID_CLIENT_ID",
  "POCKET_ID_CLIENT_SECRET",
  "DATABASE_URL",
  "PGPASSWORD",
] as const;

/**
 * Reads the file of each `<NAME>_FILE` variable and returns the values by
 * name. It removes the line breaks at the end of each file. It throws when
 * both `<NAME>` and `<NAME>_FILE` have a value.
 */
export const readSecretFiles = ({
  env,
  readFile,
}: {
  env: Record<string, string | undefined>;
  readFile: (path: string) => string;
}): Record<string, string> =>
  Object.fromEntries(
    secretEnvNames.flatMap((name) => {
      const path = env[`${name}_FILE`];
      if (!path) {
        return [];
      }
      if (env[name]) {
        throw new Error(`Set ${name} or ${name}_FILE, not both.`);
      }
      return [[name, readFile(path).replace(/[\r\n]+$/, "")]];
    }),
  );
