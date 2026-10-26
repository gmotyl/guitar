import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic', jsxImportSource: 'preact' },
  test: {
    environment: 'jsdom',
    passWithNoTests: true,
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
  },
});
