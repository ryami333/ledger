import reactHooks from "eslint-plugin-react-hooks";
import { globalIgnores } from "eslint/config";
import typescriptEslint from "typescript-eslint";

const eslintConfig = [
  globalIgnores([
    "**/node_modules/**",
    "tmp/**",
    ".claude/**",
    ".yarn/**",
    "apps/web/.output/**",
    "apps/web/.nitro/**",
    "apps/web/.tanstack/**",
    "apps/web/src/routeTree.gen.ts",
  ]),
  ...typescriptEslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    rules: {
      eqeqeq: ["error", "always"],
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message: 'Use the "env.ts" file of the app instead.',
        },
      ],
      "no-restricted-globals": [
        "error",
        {
          name: "Temporal",
          message: "Import Temporal from `temporal-polyfill`.",
        },
      ],
    },
  },
  {
    files: ["**/env.ts"],
    rules: { "no-restricted-properties": "off" },
  },
];

export default eslintConfig;
