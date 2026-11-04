/**
 * A value with whitespace outside of brackets has more than one component.
 * The brackets can have a depth of 3, for example var(--a, calc(1px + max(...))).
 */
const MULTIPLE_VALUES =
  /^(?!(?:[^\s()]|\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\))+$)/;

/** @type {import('stylelint').Config} */
const config = {
  extends: "stylelint-config-recommended",
  ignoreFiles: ["**/.output/**", "**/node_modules/**", ".claude/**"],
  plugins: ["stylelint-use-nesting", "stylelint-use-logical"],
  rules: {
    // Write `(width >= 600px)`, not `(min-width: 600px)`.
    "media-feature-range-notation": "context",
    // Nest the rules of a selector, for example `&::after`, in its block.
    "csstools/use-nesting": "always",
    // Write `margin-inline-start`, not `margin-left`. The sizes (width,
    // height) are out of scope.
    "csstools/use-logical": [
      "always",
      { except: [/^(min-|max-)?(width|height)$/] },
    ],
    // Write `margin-block: 10px; margin-inline: 20px;`, not
    // `margin: 10px 20px;`. A shorthand with one value applies to all sides.
    "declaration-property-value-disallowed-list": [
      {
        "/^(margin|padding|inset|scroll-margin|scroll-padding)(-inline|-block)?$/":
          [MULTIPLE_VALUES],
        "/^border(-inline|-block)?-(width|style|color)$/": [MULTIPLE_VALUES],
        "border-radius": [MULTIPLE_VALUES],
      },
      {
        /** @type {(property: string, value: string) => string} */
        message: (property, value) =>
          `Unexpected positional values in "${property}: ${value}". Write one declaration for each side or axis.`,
      },
    ],
    // CSS Modules use the pseudo class `:global`.
    "selector-pseudo-class-no-unknown": [
      true,
      { ignorePseudoClasses: ["global"] },
    ],
  },
};

export default config;
