import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

// Flat ESLint config for the whole monorepo. Run via `pnpm lint` (root).
//
// Philosophy: errors are reserved for genuine bugs (hook rules, etc.) so a red
// `pnpm lint` always means "fix me". Stylistic / cleanup findings are warnings
// so they surface without blocking CI — ratchet them up to errors over time.
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/*.config.{js,mjs,cjs,ts}',
      'apps/web/vite.config.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Web app: browser globals + React Hooks rules.
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // API + shared package: Node globals.
  {
    files: ['apps/api/**/*.ts', 'packages/shared/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },

  // Repo-wide tuning.
  {
    rules: {
      // TypeScript already flags undefined identifiers; the lint rule only adds
      // false positives on types and ambient globals.
      'no-undef': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'prefer-const': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
);
