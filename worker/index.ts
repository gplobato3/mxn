/**
 * Worker da loja: serve o site estático (dist/) e a API de pagamento.
 *
 *   POST /api/checkout         cria o pedido e a cobrança na xpag (SPEI ou OXXO)
 *   GET  /api/order?id=&t=     estado do pedido + instruções de pagamento (o /pago consulta isto)
 *   POST /api/xpag/webhook?k=  aviso da xpag; o estado é sempre reconferido na API antes de valer
 *   GET  /admin                painel de pedidos (Basic Auth com ADMIN_PASSWORD)
 */
import type { Env } from './env';
import { consultTransaction, createCharge, customerMessage } from './xpag';
import {
  InputError,
  getOrder,
  getOrderByTx,
  insertOrder,
  newOrderId,
  newToken,
  orderText,
  parseCheckout,
  publicView,
  safeEqual,
  type OrderRow,
  type OrderStatus,
  type PaymentInfo,
} from './orders';
import { adminPage } from './admin';

const MAX_BODY = 32 * 1024;
const RECHECK_MS = 15_000;

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    try {
      if (path === '/api/checkout') return await checkout(req, env, url);
      if (path === '/api/order') return await orderStatus(req, env, url, ctx);
      if (path === '/api/xpag/webhook') return await webhook(req, env, url, ctx);
      if (path === '/admin' || path.startsWith('/admin/')) return await adminPage(req, env, url);
      if (path.startsWith('/api/')) return json({ error: 'No encontrado' }, 404);
    } catch (e) {
      console.error(JSON.stringify({ at: path, error: (e as Error).message }));
      return json({ error: 'Ocurrió un error. Intenta de nuevo.' }, 500);
    }
    return env.ASSETS.fetch(req);
  },
} satisfies ExportedHandler<Env>;

// ---------- POST /api/checkout ----------

async function checkout(req: Request, env: Env, url: URL): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  const origin = req.headers.get('Origin');
  if (origin && origin !== url.origin) return json({ error: 'Origen no permitido' }, 403);

  const ip = req.headers.get('CF-Connecting-IP') || 'local';
  if (env.CHECKOUT_LIMITER) {
    const { success } = await env.CHECKOUT_LIMITER.limit({ key: ip });
    if (!success) return json({ error: 'Demasiados intentos. Espera un minuto e intenta de nuevo.' }, 429);
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY) return json({ error: 'Pedido demasiado grande.' }, 413);
  let parsed;
  try {
    parsed = parseCheckout(JSON.parse(raw));
  } catch (e) {
    if (e instanceof InputError) return json({ error: e.message }, 400);
    return json({ error: 'Pedido inválido.' }, 400);
  }
  const { method, data } = parsed;

  // id único (colisão é improvável; ainda assim, confere)
  let id = newOrderId();
  for (let i = 0; i < 3 && (await getOrder(env, id)); i++) id = newOrderId();

  const charge = await createCharge(env, {
    method,
    amount: data.totals.total,
    externalId: id,
    name: data.customer.name,
    email: data.customer.email,
    description: `Pedido ${id}`,
    webhookUrl: `${url.origin}/api/xpag/webhook?k=${encodeURIComponent(env.XPAG_WEBHOOK_KEY)}`,
  });
  if (!charge.ok) {
    console.error(JSON.stringify({ at: 'cashin', order: id, method, code: charge.code, status: charge.status, msg: charge.message }));
    return json({ error: customerMessage(charge.code, method), code: charge.code }, 502);
  }

  const c = charge.data;
  const httpsOnly = (u?: string) => (u && /^https:\/\//.test(u) ? u : undefined);
  const payment: PaymentInfo =
    method === 'oxxo'
      ? {
          method,
          amount: c.amount ?? data.totals.total,
          reference: c.voucher_reference || c.payee_data?.reference || c.code,
          barcode: httpsOnly(c.barcode || c.payee_data?.barcode),
        }
      : { method, amount: c.amount ?? data.totals.total, clabe: c.clabe, bank: c.bank_name, beneficiary: c.beneficiary };

  if (method === 'spei' && !payment.clabe) return json({ error: 'No pudimos generar la CLABE. Intenta de nuevo.' }, 502);
  if (method === 'oxxo' && !payment.reference) return json({ error: 'No pudimos generar la referencia de OXXO. Intenta de nuevo.' }, 502);

  const now = new Date();
  const minutes = Number(c.expire_minutes) || (method === 'oxxo' ? 12 * 24 * 60 : 24 * 60);
  const row: OrderRow = {
    id,
    token: newToken(),
    status: 'pending',
    method,
    total: data.totals.total,
    name: data.customer.name,
    email: data.customer.email,
    phone: data.customer.phone,
    data: JSON.stringify(data),
    payment: JSON.stringify(payment),
    xpag_tx: c.transaction_id || c.request_number || null,
    e2e: null,
    sandbox: c.sandbox ? 1 : 0,
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + minutes * 60_000).toISOString(),
    paid_at: null,
    checked_at: null,
    updated_at: now.toISOString(),
  };
  await insertOrder(env, row);
  console.log(JSON.stringify({ at: 'order_created', order: id, method, total: row.total, sandbox: row.sandbox }));

  return json({
    id,
    token: row.token,
    redirectUrl: `/pago?pedido=${encodeURIComponent(id)}&t=${row.token}`,
    order: publicView(row),
  });
}

// ---------- GET /api/order ----------

async function orderStatus(req: Request, env: Env, url: URL, ctx: ExecutionContext): Promise<Response> {
  if (req.method !== 'GET') return json({ error: 'Método no permitido' }, 405);
  const id = url.searchParams.get('id') || '';
  const token = url.searchParams.get('t') || '';
  if (!/^NB-\d{6}-[A-Z0-9]{4,8}$/.test(id) || !/^[a-f0-9]{32}$/.test(token)) return json({ error: 'Pedido no encontrado' }, 404);
  let order = await getOrder(env, id);
  if (!order || !safeEqual(order.token, token)) return json({ error: 'Pedido no encontrado' }, 404);

  // Rede de segurança caso o webhook se perca: reconsulta a xpag, no máximo a cada 15 s.
  const last = order.checked_at ? Date.parse(order.checked_at) : 0;
  if (order.status === 'pending' && Date.now() - last > RECHECK_MS) order = (await settle(env, order, ctx)).row;

  return json(publicView(order));
}

// ---------- POST /api/xpag/webhook ----------

async function webhook(req: Request, env: Env, url: URL, ctx: ExecutionContext): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  if (!env.XPAG_WEBHOOK_KEY || !safeEqual(url.searchParams.get('k') || '', env.XPAG_WEBHOOK_KEY)) return json({ error: 'No autorizado' }, 401);

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const ext = typeof body?.external_id === 'string' ? body.external_id : '';
  const tx = typeof body?.transaction_id === 'string' ? body.transaction_id : '';
  let order = ext ? await getOrder(env, ext) : null;
  if (!order && tx) order = await getOrderByTx(env, tx);
  console.log(JSON.stringify({ at: 'webhook', order: order?.id ?? null, ext, tx, status: body?.status, type: body?.type }));
  if (!order) return json({ ok: true, ignored: true }); // não é nosso: 200 para não repetir
  if (order.status === 'paid') return json({ ok: true, duplicate: true }); // aviso repetido

  // O corpo do webhook não é assinado: o que vale é a consulta à API com as nossas credenciais.
  const { row, verified } = await settle(env, order, ctx, true);
  if (!verified) return json({ error: 'No se pudo verificar' }, 503); // a xpag tenta de novo
  return json({ ok: true, status: row.status });
}

// ---------- conciliação ----------

const PAID = new Set(['confirmed', 'completed', 'paid', 'approved']);

/**
 * Consulta a xpag e aplica o estado ao pedido. A transição para "paid" é atômica no D1
 * (UPDATE ... WHERE status IN (...)), então webhook repetido + polling não notificam duas vezes.
 */
async function settle(env: Env, order: OrderRow, ctx: ExecutionContext, fromWebhook = false): Promise<{ row: OrderRow; verified: boolean }> {
  if (!order.xpag_tx) return { row: order, verified: false };
  const r = await consultTransaction(env, order.xpag_tx);
  if (!r.ok) {
    console.error(JSON.stringify({ at: 'consult', order: order.id, code: r.code, status: r.status }));
    return { row: order, verified: false };
  }
  const t = r.data;
  const now = new Date().toISOString();
  const status = String(t.status || '').toLowerCase();

  if (PAID.has(status)) {
    const mismatch =
      (t.external_id && t.external_id !== order.id) ||
      (t.currency && t.currency !== 'MXN') ||
      (typeof t.amount === 'number' && t.amount + 0.009 < order.total);
    const next = mismatch ? 'review' : 'paid';
    const res = await env.DB.prepare(
      `UPDATE orders SET status = ?, paid_at = ?, e2e = ?, checked_at = ?, updated_at = ? WHERE id = ? AND status IN ('pending','expired','failed')`,
    )
      .bind(next, now, t.e2e ?? null, now, now, order.id)
      .run();
    const changed = res.meta.changes === 1;
    if (mismatch) console.error(JSON.stringify({ at: 'mismatch', order: order.id, tx: t }));
    const updated: OrderRow = changed ? { ...order, status: next, paid_at: now, e2e: t.e2e ?? null, checked_at: now, updated_at: now } : ((await getOrder(env, order.id)) ?? order);
    if (changed) {
      console.log(JSON.stringify({ at: 'order_paid', order: order.id, status: next, via: fromWebhook ? 'webhook' : 'poll' }));
      ctx.waitUntil(notify(env, updated));
    }
    return { row: updated, verified: true };
  }

  if (status === 'expired' || status === 'failed') {
    const res = await env.DB.prepare(`UPDATE orders SET status = ?, checked_at = ?, updated_at = ? WHERE id = ? AND status = 'pending'`)
      .bind(status, now, now, order.id)
      .run();
    const row: OrderRow =
      res.meta.changes === 1 ? { ...order, status: status as OrderStatus, checked_at: now, updated_at: now } : ((await getOrder(env, order.id)) ?? order);
    return { row, verified: true };
  }

  await env.DB.prepare('UPDATE orders SET checked_at = ? WHERE id = ?').bind(now, order.id).run();
  return { row: { ...order, checked_at: now }, verified: true };
}

async function notify(env: Env, order: OrderRow): Promise<void> {
  if (!env.ORDER_NOTIFY_WEBHOOK) return;
  try {
    const data = JSON.parse(order.data);
    const text = orderText(order);
    const res = await fetch(env.ORDER_NOTIFY_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: `order.${order.status}`, id: order.id, status: order.status, total: order.total, method: order.method, sandbox: !!order.sandbox, text, content: text, ...data }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error(JSON.stringify({ at: 'notify', order: order.id, status: res.status }));
  } catch (e) {
    console.error(JSON.stringify({ at: 'notify', order: order.id, error: (e as Error).message }));
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
}
