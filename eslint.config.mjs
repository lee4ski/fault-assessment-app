// `next lint` (used by earlier Next.js versions) generated this config
// implicitly; Next.js 16 removed that command, so ESLint's own CLI needs
// this file explicitly.
//
// eslint-config-next@16 exports native ESLint flat config arrays directly
// (no more legacy .eslintrc-shaped config), so they're imported and spread
// in as-is here. Do NOT run them through @eslint/eslintrc's FlatCompat —
// that shim is only for pre-flat-config packages, and wrapping an
// already-flat config through it throws ("Converting circular structure to
// JSON") because it tries to re-validate objects that reference themselves
// (e.g. a plugin's own resolved config object).
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "next-env.d.ts",
    ],
  },
  {
    // This is lint's first real run on this codebase (`next lint` was
    // broken and silently never ran in CI). These catch years of
    // pre-existing patterns across the app — real cleanup work, not
    // something to block every PR on right away, so they're warnings
    // rather than hard errors until that debt is paid down deliberately:
    // - no-explicit-any: widespread pre-existing `any` usage.
    // - set-state-in-effect: several components call setState inside a
    //   useEffect to sync from a prop/async result — a legitimate, common
    //   pattern in plenty of these cases, not necessarily the "derived
    //   state" anti-pattern this rule targets. Worth auditing each one
    //   deliberately rather than reflexively silencing or restructuring
    //   them all right now.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    // scripts/ and tests/*.js are plain Node CommonJS utilities (test
    // runners, one-off scripts), not part of the app's TypeScript/ESM
    // code — `require()` there is intentional, not a mistake to flag.
    files: ["scripts/**/*.js", "tests/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
