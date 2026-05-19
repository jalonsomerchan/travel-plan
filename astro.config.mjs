// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'travel-plan';
const site = process.env.ASTRO_SITE ?? 'https://travelplan.alon.one';
const base = process.env.ASTRO_BASE ?? (process.env.GITHUB_ACTIONS ? `/${repositoryName}` : '/');

// https://astro.build/config
export default defineConfig({
  site,
  base,

  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },

  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          assetFileNames: 'assets/[name].[hash][extname]',
          chunkFileNames: 'assets/[name].[hash].js',
          entryFileNames: 'assets/[name].[hash].js',
        },
      },
    },
  },

  integrations: [mdx(), sitemap(), icon()]

});
