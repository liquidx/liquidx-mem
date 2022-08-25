module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: [
    "plugin:vue/vue3-recommended",
    // "eslint:recommended",
    // "@vue/typescript/recommended"
  ],
  parserOptions: {
    parser: "@typescript-eslint/parser",
    ecmaVersion: 2021
  },
  rules: {
    "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off"
  },
  ignorePatterns: [
    "functions/dist/**/*", // Ignore built files.
    "functions/test/*",
    "functions/tools/*",
    "functions/test-tools/*"
  ],
  overrides: [
    {
      files: [
        "**/__tests__/*.{j,t}s?(x)",
        "**/tests/unit/**/*.spec.{j,t}s?(x)"
      ],
      env: {
        jest: true
      }
    }
  ]
};
