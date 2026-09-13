import js from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import globals from "globals";

export default [
  js.configs.recommended,
  importPlugin.flatConfigs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    settings: {
      "import/resolver": {
        typescript: true,
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": "warn",
      "import/no-unresolved": "error",
      "import/named": "error",
      "import/extensions": ["error", "always", { ignorePackages: true }],
    },
  },
];
