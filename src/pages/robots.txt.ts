import type { APIRoute } from 'astro';

// Gerado no build a partir de SITE_URL/BASE_PATH, para o sitemap apontar sempre para o domínio certo.
export const GET: APIRoute = ({ site }) => {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const lines = ['User-agent: *', 'Allow: /', ...['/checkout', '/pago', '/gracias', '/api/', '/admin'].map((p) => `Disallow: ${base}${p}`)];
  // Em versões de teste (PUBLIC_NOINDEX=1) as páginas levam <meta robots noindex> e não anunciamos sitemap.
  // O rastreio continua liberado para o Google ler o noindex e para as prévias de link (WhatsApp, Meta).
  if (import.meta.env.PUBLIC_NOINDEX !== '1') lines.push('', `Sitemap: ${new URL(`${base}/sitemap-index.xml`, site).href}`);
  return new Response(lines.join('\n') + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
