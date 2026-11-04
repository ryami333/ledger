/**
 * postcss-preset-env gives CSS nesting and custom media queries. These
 * features are not at stage 3 yet, thus this file turns them on.
 */
const config = {
  plugins: {
    "postcss-preset-env": {
      stage: 3,
      features: {
        "nesting-rules": { preserve: true },
        "custom-media-queries": true,
      },
    },
  },
};

export default config;
