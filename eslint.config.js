// ESLint flat config.
// JSX in this repo is Preact (see `jsxImportSource` in tsconfig.json), so no React plugin is
// loaded; only the hooks rules apply, since Preact hooks follow the same rules as React's.
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import astro from 'eslint-plugin-astro';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['dist/', '.astro/', 'node_modules/', 'playwright-report/', 'test-results/', '.wrangler/'],
  },

  js.configs.recommended,

  // TypeScript recommended rules, scoped to TS sources only.
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.{ts,tsx}'],
  })),

  // Astro components (frontmatter + template expressions).
  ...astro.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Site code runs in the browser.
  {
    files: ['src/**'],
    languageOptions: { globals: { ...globals.browser } },
  },

  // Config files, e2e specs and unit tests run under Node.
  {
    files: ['*.{js,mjs,cjs,ts}', 'e2e/**', 'src/**/__tests__/**'],
    languageOptions: { globals: { ...globals.node } },
  },
);
