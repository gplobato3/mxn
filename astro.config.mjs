// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Cambia SITE_URL por tu dominio final (se usa en sitemap, canonical y Open Graph).
const SITE_URL = process.env.SITE_URL || 'https://www.nombra.mx';

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'auto' },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  image: {
    // AVIF + WebP generados en build, nada de imágenes pesadas en producción.
    responsiveStyles: true,
  },
  integrations: [
    sitemap({
      filter: (page) => !/\/(checkout|gracias)$/.test(page),
    }),
  ],
});
