import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored scripts from installed Claude Code skills (Impeccable, Taste
    // Skill, UI/UX Pro Max, Emil Kowalski's skills) -- third-party tooling,
    // not this project's code. Without this, installing a skill silently
    // drowns the real lint signal in the vendor's own script warnings.
    ".claude/skills/**",
    ".agents/skills/**",
  ]),
]);

export default eslintConfig;
