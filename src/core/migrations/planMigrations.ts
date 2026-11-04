export type Migration = {
  version: string;
  name: string;
  fileName: string;
};

/** The file name pattern of a migration: `<version>_<name>.sql`. */
const migrationFileNamePattern = /^(\d+)_(.+)\.sql$/;

/**
 * Finds the migrations that the database does not have yet. The order is the
 * order of the versions.
 *
 * It throws when a file name does not agree with the pattern, when two files
 * have the same version, or when the database has a version with no file.
 * The last case means that the database is newer than the migration files.
 */
export const planMigrations = ({
  fileNames,
  appliedVersions,
}: {
  fileNames: readonly string[];
  appliedVersions: readonly string[];
}): Migration[] => {
  const migrations = fileNames
    .filter((fileName) => fileName.endsWith(".sql"))
    .map((fileName): Migration => {
      const match = migrationFileNamePattern.exec(fileName);
      if (!match?.[1] || !match[2]) {
        throw new Error(`Bad migration file name: ${fileName}`);
      }
      return { version: match[1], name: match[2], fileName };
    })
    .toSorted((a, b) => a.version.localeCompare(b.version));

  const versions = new Set<string>();
  for (const migration of migrations) {
    if (versions.has(migration.version)) {
      throw new Error(`Two migration files have version ${migration.version}`);
    }
    versions.add(migration.version);
  }

  const applied = new Set(appliedVersions);
  const unknownVersions = [...applied].filter(
    (version) => !versions.has(version),
  );
  if (unknownVersions.length > 0) {
    throw new Error(
      `The database has migrations with no file: ${unknownVersions.join(", ")}`,
    );
  }

  return migrations.filter((migration) => !applied.has(migration.version));
};
