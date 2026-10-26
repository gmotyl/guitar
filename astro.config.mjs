// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

export default defineConfig({
  output: 'static',
  site: 'https://guitar.motyl.dev',
  trailingSlash: 'ignore',
  integrations: [preact()],
  i18n: {
    locales: ['pl', 'en'],
    defaultLocale: 'pl',
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
  },
});
