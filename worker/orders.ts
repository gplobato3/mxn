/**
 * Validação do pedido, recálculo do preço e persistência no D1.
 * O navegador manda só o que o cliente escolheu; preço, desconto e frete são calculados aqui
 * com as mesmas regras do site (src/data/catalog.ts + src/config/store.ts).
 */
import {
  animals,
  chainLengths,
  cleanText,
  describeDesign,
  materials,
  priceDesign,
  products,
  totals,
  type AnimalId,
  type Design,
  type FontId,
  type MaterialId,
  type ProductId,
} from '../src/data/catalog';
import { store } from '../src/config/store';
import { mxStates } from '../src/data/mx-states';
import type { Env } from './env';

export type PayMethod = 'spei' | 'oxxo';
export type OrderStatus = 'pending' | 'paid' | 'expired' | 'failed' | 'review';

export interface OrderItem extends Design {
  qty: number;
  unitPrice: number;
  title: string;
  summary: string;
}

export interface OrderData {
  items: OrderItem[];
  totals: { items: number; subtotal: number; discount: number; shipping: number; total: number };
  customer: { name: string; email: string; phone: string };
  shipping: {
    method: string;
    label: string;
    postalCode: string;
    street: string;
    interior?: string;
    colonia: string;
    city: string;
    state: string;
    references?: string;
  };
  source?: string;
}

export interface PaymentInfo {
  method: PayMethod;
  amount: number;
  clabe?: string;
  bank?: string;
  beneficiary?: string;
  reference?: string;
  barcode?: string;
}

export interface OrderRow {
  id: string;
  token: string;
  status: OrderStatus;
  method: PayMethod;
  total: number;
  name: string;
  email: string;
  phone: string;
  data: string;
  payment: string;
  xpag_tx: string | null;
  e2e: string | null;
  sandbox: number;
  created_at: string;
  expires_at: string | null;
  paid_at: string | null;
  checked_at: string | null;
  updated_at: string;
}

export class InputError extends Error {}

// ---------- validação ----------

const CONTROL = /[\u0000-\u001f\u007f\u2028\u2029]/g;

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.replace(CONTROL, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max) : '';
}

function need(v: unknown, max: number, msg: string): string {
  const s = str(v, max);
  if (!s) throw new InputError(msg);
  return s;
}

function parseDesign(raw: Record<string, unknown>): Design & { qty: number } {
  const product = raw.product as ProductId;
  const p = products[product];
  if (!p) throw new InputError('Producto inválido.');
  const material = raw.material as MaterialId;
  if (!materials[material]) throw new InputError('Metal inválido.');
  const font = (p.fonts as string[]).includes(raw.font as string) ? (raw.font as FontId) : p.defaultFont;
  const length = chainLengths.some((c) => c.cm === Number(raw.length)) ? Number(raw.length) : 45;
  const style = product === 'nombre' ? (raw.style === 'iniciales' ? 'iniciales' : 'nombre') : undefined;
  const animal = product === 'mascota' ? ((raw.animal as AnimalId) in animals ? (raw.animal as AnimalId) : 'perro') : undefined;
  const text = cleanText({ product, style }, typeof raw.text === 'string' ? raw.text : '').trim();
  if (!text) throw new InputError('Falta el texto a grabar en una pieza.');
  const giftBox = store.addons.giftBox.enabled && raw.giftBox === true;
  const giftNote = store.addons.giftNote.enabled ? str(raw.giftNote, store.addons.giftNote.maxLength) : '';
  const qty = Math.max(1, Math.min(9, Math.floor(Number(raw.qty) || 1)));
  const d: Design & { qty: number } = { product, text, font, material, length, qty };
  if (style) d.style = style;
  if (animal) d.animal = animal;
  if (giftBox) d.giftBox = true;
  if (giftNote) d.giftNote = giftNote;
  return d;
}

export interface CheckoutRequest {
  method: PayMethod;
  data: OrderData;
}

export function parseCheckout(body: unknown): CheckoutRequest {
  if (!body || typeof body !== 'object') throw new InputError('Pedido inválido.');
  const b = body as Record<string, unknown>;

  const method = b.payment as PayMethod;
  if (!store.payment.methods.some((m) => m.id === method)) throw new InputError('Elige un método de pago.');
  if (b.spellingConfirmed !== true) throw new InputError('Confirma que revisaste la ortografía de los nombres.');

  if (!Array.isArray(b.items) || b.items.length === 0) throw new InputError('Tu bolsa está vacía.');
  if (b.items.length > 20) throw new InputError('Demasiadas piezas en un solo pedido. Escríbenos.');
  const designs = b.items.map((it) => parseDesign((it ?? {}) as Record<string, unknown>));

  const c = (b.customer ?? {}) as Record<string, unknown>;
  const email = need(c.email, 120, 'Escribe tu correo electrónico.').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new InputError('Revisa tu correo electrónico.');
  const digits = str(c.phone, 20).replace(/\D/g, '').replace(/^52(?=\d{10}$)/, '');
  if (digits.length !== 10) throw new InputError('El WhatsApp debe tener 10 dígitos.');
  const name = need(c.name, 80, 'Escribe el nombre de quien recibe.');

  const s = (b.shipping ?? {}) as Record<string, unknown>;
  const postalCode = need(s.postalCode, 5, 'Escribe tu código postal.');
  if (!/^\d{5}$/.test(postalCode)) throw new InputError('El código postal tiene 5 dígitos.');
  const state = need(s.state, 40, 'Elige tu estado.');
  if (!(mxStates as readonly string[]).includes(state)) throw new InputError('Elige tu estado.');
  const ship = store.shipping.find((x) => x.enabled && x.id === s.method) ?? store.shipping.find((x) => x.enabled)!;

  const t = totals(designs.map((d) => ({ design: d, qty: d.qty })), {
    bundle: store.bundle,
    shippingPrice: ship.price,
    giftBoxPrice: store.addons.giftBox.price,
  });
  const m = store.payment.methods.find((x) => x.id === method)!;
  if (t.total > m.max) throw new InputError(`Para compras mayores a $${m.max.toLocaleString('es-MX')} elige otro método de pago o escríbenos.`);

  const items: OrderItem[] = designs.map((d) => ({
    ...d,
    unitPrice: priceDesign(d, { giftBox: store.addons.giftBox.price }).unit,
    title: products[d.product].name,
    summary: describeDesign(d),
  }));

  return {
    method,
    data: {
      items,
      totals: t,
      customer: { name, email, phone: `+52${digits}` },
      shipping: {
        method: ship.id,
        label: ship.label,
        postalCode,
        street: need(s.street, 120, 'Escribe calle y número.'),
        interior: str(s.interior, 40) || undefined,
        colonia: need(s.colonia, 80, 'Escribe tu colonia.'),
        city: need(s.city, 80, 'Escribe tu ciudad o municipio.'),
        state,
        references: str(s.references, 160) || undefined,
      },
      source: str(b.source, 300) || undefined,
    },
  };
}

// ---------- ids e segredos ----------

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // sem 0/O/1/I para ditar por telefone

export function newOrderId(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: '2-digit', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  const rnd = [...bytes].map((b) => ALPHABET[b % 32]).join('');
  return `NB-${get('year')}${get('month')}${get('day')}-${rnd}`;
}

export function newToken(): string {
  return [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

// ---------- D1 ----------

export async function getOrder(env: Env, id: string): Promise<OrderRow | null> {
  return env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first<OrderRow>();
}

export async function getOrderByTx(env: Env, tx: string): Promise<OrderRow | null> {
  return env.DB.prepare('SELECT * FROM orders WHERE xpag_tx = ?').bind(tx).first<OrderRow>();
}

export async function insertOrder(env: Env, row: OrderRow): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO orders (id, token, status, method, total, name, email, phone, data, payment, xpag_tx, e2e, sandbox, created_at, expires_at, paid_at, checked_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      row.id,
      row.token,
      row.status,
      row.method,
      row.total,
      row.name,
      row.email,
      row.phone,
      row.data,
      row.payment,
      row.xpag_tx,
      row.e2e,
      row.sandbox,
      row.created_at,
      row.expires_at,
      row.paid_at,
      row.checked_at,
      row.updated_at,
    )
    .run();
}

/** O que o cliente pode ver do próprio pedido (sem endereço nem dados de contato). */
export function publicView(o: OrderRow) {
  const data = JSON.parse(o.data) as OrderData;
  const payment = JSON.parse(o.payment) as PaymentInfo;
  return {
    id: o.id,
    status: o.status,
    method: o.method,
    createdAt: o.created_at,
    expiresAt: o.expires_at,
    paidAt: o.paid_at,
    sandbox: !!o.sandbox,
    totals: data.totals,
    items: data.items.map((i) => ({ title: i.title, text: i.text, summary: i.summary, qty: i.qty, unitPrice: i.unitPrice, giftBox: !!i.giftBox })),
    payment,
  };
}

/** Texto curto do pedido para notificação (Make/Zapier/n8n...). */
export function orderText(o: OrderRow): string {
  const d = JSON.parse(o.data) as OrderData;
  const a = d.shipping;
  const lines = d.items.map(
    (i, n) =>
      `${n + 1}. ${i.title} — "${i.text}" (${i.summary}${i.giftBox ? ' · estuche' : ''}) ×${i.qty}${i.giftNote ? `\n   Dedicatoria: "${i.giftNote}"` : ''}`,
  );
  return [
    `Pedido pagado ${o.id} — $${o.total} MXN (${o.method.toUpperCase()})${o.sandbox ? ' [PRUEBA]' : ''}`,
    ...lines,
    `Cliente: ${d.customer.name} · ${d.customer.phone} · ${d.customer.email}`,
    `Envío: ${a.street}${a.interior ? ` int. ${a.interior}` : ''}, col. ${a.colonia}, ${a.city}, ${a.state}, C.P. ${a.postalCode}${a.references ? ` (${a.references})` : ''}`,
  ].join('\n');
}
