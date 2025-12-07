import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // Keep momentum by not blocking builds on "any" usage.
      // We can tighten this later as types solidify.
      "@typescript-eslint/no-explicit-any": "off",

      // Enforce logger usage instead of console
      // Exception: env.ts and logger.ts are allowed to use console
      "no-console": [
        "warn",
        {
          allow: [],
        },
      ],
    },
  },
];

export default eslintConfig;
