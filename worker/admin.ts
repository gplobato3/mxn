/**
 * Painel de pedidos: /admin (Basic Auth, senha em ADMIN_PASSWORD).
 * Mostra o que gravar e para onde enviar. Tudo que veio do cliente é escapado.
 */
import type { Env } from './env';
import { safeEqual, type OrderData, type OrderRow, type PaymentInfo } from './orders';

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const money = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'medium', timeStyle: 'short' }) : '';

const LABEL: Record<string, string> = { pending: 'Esperando pago', paid: 'Pagado', expired: 'Vencido', failed: 'Falló', review: 'Revisar pago' };

const TABS = [
  { id: 'paid', label: 'Pagados', where: "status IN ('paid','review')" },
  { id: 'pending', label: 'Esperando pago', where: "status = 'pending'" },
  { id: 'all', label: 'Todos', where: '1=1' },
] as const;

function unauthorized(): Response {
  return new Response('Acceso restringido', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Nombra admin", charset="UTF-8"', 'Cache-Control': 'no-store' },
  });
}

function authorized(req: Request, env: Env): boolean {
  const h = req.headers.get('Authorization') || '';
  if (!h.startsWith('Basic ')) return false;
  let decoded = '';
  try {
    decoded = new TextDecoder().decode(Uint8Array.from(atob(h.slice(6)), (c) => c.charCodeAt(0)));
  } catch {
    return false;
  }
  const pass = decoded.slice(decoded.indexOf(':') + 1);
  return safeEqual(pass, env.ADMIN_PASSWORD || '');
}

export async function adminPage(req: Request, env: Env, url: URL): Promise<Response> {
  if (!env.ADMIN_PASSWORD) return new Response('No encontrado', { status: 404 });
  if (!authorized(req, env)) return unauthorized();
  if (req.method !== 'GET') return new Response('Método no permitido', { status: 405 });

  const tab = TABS.find((t) => t.id === url.searchParams.get('ver')) ?? TABS[0];
  const { results } = await env.DB.prepare(`SELECT * FROM orders WHERE ${tab.where} ORDER BY created_at DESC LIMIT 200`).all<OrderRow>();
  const counts = await env.DB.prepare(`SELECT status, COUNT(*) AS n, SUM(total) AS t FROM orders WHERE sandbox = 0 GROUP BY status`).all<{
    status: string;
    n: number;
    t: number;
  }>();
  const paid = counts.results.filter((c) => c.status === 'paid');
  const paidN = paid.reduce((s, c) => s + c.n, 0);
  const paidT = paid.reduce((s, c) => s + (c.t || 0), 0);

  const cards = results.map(card).join('') || '<p class="empty">No hay pedidos aquí todavía.</p>';
  const html = `<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><title>Pedidos · Nombra</title><style>${CSS}</style></head><body>
<header><h1>Pedidos</h1><p class="kpi"><b>${paidN}</b> pagados · <b>${money(paidT)}</b> MXN</p></header>
<nav>${TABS.map((t) => `<a href="?ver=${t.id}"${t.id === tab.id ? ' aria-current="page"' : ''}>${t.label}</a>`).join('')}</nav>
<main>${cards}</main></body></html>`;
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src https:; base-uri 'none'; form-action 'none'",
      'Referrer-Policy': 'no-referrer',
    },
  });
}

function card(o: OrderRow): string {
  const d = JSON.parse(o.data) as OrderData;
  const p = JSON.parse(o.payment) as PaymentInfo;
  const a = d.shipping;
  const wa = d.customer.phone.replace(/\D/g, '');
  const items = d.items
    .map(
      (i) => `<li><span class="eng">“${esc(i.text)}”</span><span>${esc(i.title)} · ${esc(i.summary)}${i.giftBox ? ' · <b>Estuche</b>' : ''} · ×${i.qty}</span>${
        i.giftNote ? `<span class="note">Dedicatoria: “${esc(i.giftNote)}”</span>` : ''
      }</li>`,
    )
    .join('');
  return `<article class="o ${esc(o.status)}">
<div class="top"><strong>${esc(o.id)}</strong><span class="st">${esc(LABEL[o.status] || o.status)}</span>${o.sandbox ? '<span class="test">PRUEBA</span>' : ''}</div>
<p class="meta">${esc(when(o.created_at))} · ${esc(o.method.toUpperCase())} · <b>${money(o.total)}</b>${o.paid_at ? ` · pagado ${esc(when(o.paid_at))}` : ''}</p>
<ul class="items">${items}</ul>
<div class="cols">
<div><h3>Cliente</h3><p>${esc(d.customer.name)}<br><a href="https://wa.me/${esc(wa)}">${esc(d.customer.phone)}</a><br><a href="mailto:${esc(d.customer.email)}">${esc(d.customer.email)}</a></p></div>
<div><h3>Enviar a</h3><p>${esc(a.street)}${a.interior ? ` int. ${esc(a.interior)}` : ''}<br>Col. ${esc(a.colonia)}<br>${esc(a.city)}, ${esc(a.state)}<br>C.P. ${esc(a.postalCode)}${
    a.references ? `<br><i>${esc(a.references)}</i>` : ''
  }</p></div>
<div><h3>Totales</h3><p>Subtotal ${money(d.totals.subtotal)}${d.totals.discount ? `<br>Descuento −${money(d.totals.discount)}` : ''}<br>Envío ${
    d.totals.shipping ? money(d.totals.shipping) : 'gratis'
  }<br>Total <b>${money(d.totals.total)}</b><br><small>${esc(p.method === 'oxxo' ? `OXXO ref. ${p.reference ?? ''}` : `CLABE ${p.clabe ?? ''}`)}</small><br><small>xpag ${esc(o.xpag_tx)}</small></p></div>
</div></article>`;
}

const CSS = `
:root{--ink:#1f1915;--muted:#6e6259;--line:#e6ddd1;--paper:#fffdf9;--ivory:#f8f4ee;--ok:#4f6b4a;--warn:#a1423a;--gold:#b08a4e}
*{box-sizing:border-box}body{margin:0;font:15px/1.45 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--ivory);color:var(--ink)}
header,nav,main{max-width:980px;margin:0 auto;padding:0 16px}header{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;padding-top:20px}
h1{font:500 2rem/1.1 Georgia,serif;margin:0}.kpi{margin:0;color:var(--muted)}.kpi b{color:var(--ink)}
nav{display:flex;gap:6px;margin:14px auto;overflow-x:auto}nav a{padding:8px 14px;border-radius:99px;border:1px solid var(--line);background:var(--paper);color:var(--ink);text-decoration:none;white-space:nowrap;font-weight:600;font-size:.9rem}
nav a[aria-current]{background:var(--ink);color:#fff;border-color:var(--ink)}
main{display:grid;gap:12px;padding-bottom:40px}main>*,.cols>div{min-width:0}.empty{color:var(--muted)}
.o{overflow-wrap:anywhere;background:var(--paper);border:1px solid var(--line);border-left:4px solid var(--line);border-radius:14px;padding:14px 16px}
.o.paid{border-left-color:var(--ok)}.o.review{border-left-color:var(--warn)}.o.pending{border-left-color:var(--gold)}
.top{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.top strong{font-size:1.05rem;letter-spacing:.02em}
.st{font-size:.75rem;font-weight:700;padding:3px 9px;border-radius:99px;background:var(--ivory)}.paid .st{background:#e3ecdf;color:var(--ok)}.review .st{background:#f6e0dd;color:var(--warn)}
.test{font-size:.7rem;font-weight:800;padding:3px 8px;border-radius:99px;background:#222;color:#fff}
.meta{margin:4px 0 10px;color:var(--muted);font-size:.88rem}.meta b{color:var(--ink)}
.items{list-style:none;margin:0 0 10px;padding:0;display:grid;gap:8px}.items li{display:grid;gap:2px;padding:10px 12px;border-radius:10px;background:var(--ivory)}
.eng{font:500 1.4rem/1.2 Georgia,serif}.items span{font-size:.88rem}.note{color:var(--muted)}
.cols{display:grid;gap:10px}@media(min-width:720px){.cols{grid-template-columns:1fr 1fr 1fr}}
h3{margin:0 0 2px;font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}.cols p{margin:0;font-size:.9rem}a{color:var(--ink)}small{color:var(--muted)}
`;
