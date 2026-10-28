// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Cambia SITE_URL por tu dominio final (se usa en sitemap, canonical y Open Graph).
const SITE_URL = process.env.SITE_URL || 'https://www.nombra.mx';
// Só use BASE_PATH para publicar numa subpasta (ex.: GitHub Pages em /mxn). No domínio final, deixe vazio.
const BASE_PATH = process.env.BASE_PATH || '/';

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'auto' },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  image: {
    // AVIF + WebP generados en build, nada de imágenes pesadas en producción.
    responsiveStyles: true,
  },
  integrations: [
    sitemap({
      filter: (page) => !/\/(checkout|pago|gracias)$/.test(page),
    }),
  ],
});
