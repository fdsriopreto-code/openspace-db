import baseConfig from "./packages/config/eslint/base.js";
import reactConfig from "./packages/config/eslint/react.js";

export default [
  { ignores: ["**/dist/**", "**/generated/**", "**/.turbo/**", "**/node_modules/**", "**/coverage/**"] },
  ...baseConfig,
  {
    files: ["apps/dashboard/**/*.{ts,tsx}"],
    ...reactConfig[reactConfig.length - 1],
  },
  {
    // The CLI's whole job is to print to stdout for the person running it.
    files: ["packages/cli/**/*.ts"],
    rules: { "no-console": "off" },
  },
];
