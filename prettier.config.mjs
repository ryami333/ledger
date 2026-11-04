/**
 * @type {import("prettier").Config}
 */
const config = {
  plugins: [
    "prettier-plugin-css-order",
    "@trivago/prettier-plugin-sort-imports",

    /**
     * This plugin replaces the built-in parser with a Rust-based one for
     * speed. It adds no formatting rules. Remove it if it causes problems.
     */
    "@prettier/plugin-oxc",
  ],
  cssDeclarationSorterKeepOverrides: true,
  // CSS imports come after all other imports.
  importOrder: ["^(?!.*\\.css$).*$", "^.+\\.css$"],
  importOrderSortSpecifiers: true,
  importOrderSideEffects: false,
};

export default config;
