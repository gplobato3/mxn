/** Prefixa caminhos internos com o `base` do Astro (permite publicar em subpasta, ex. GitHub Pages). */
const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

export function u(path: string): string {
  return path.startsWith('/') ? `${BASE}${path}` : path;
}
