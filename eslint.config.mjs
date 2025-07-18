import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettier,
  {
    files: ["**/*.ts"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "simple-import-sort": (await import("eslint-plugin-simple-import-sort")).default,
    },
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
      },
      ecmaVersion: "latest",
      sourceType: "module",
      env: {
        node: true,
        es2022: true,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "simple-import-sort/imports": "warn",
      "simple-import-sort/exports": "warn",
    },
    ignores: ["dist/**", "node_modules/**"],
  },
];
