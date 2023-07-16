// This file gets ignored by eslint or overridden by the one in the parent dir.
// I don't understand why since I set root = true.
module.export = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  plugins: [
    "@typescript-eslint"
  ],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/typescript",
  ],
  parserOptions: {
    project: ["tsconfig.json"],
    sourceType: "module",
  },
  ignorePatterns: [
    "dist/**/*", // Ignore built files.
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
  }
}