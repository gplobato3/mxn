/** Monta o pedido enviado ao gateway / webhook e a mensagem de WhatsApp. */
import { describeDesign, products, type Design } from '../data/catalog';
import { store } from '../config/store';
import { money } from './format';
import type { CartLine } from './cart';

export interface Customer {
  email: string;
  phone: string;
  name: string;
}

export interface Address {
  postalCode: string;
  street: string;
  interior?: string;
  colonia: string;
  city: string;
  state: string;
  references?: string;
}

export interface Order {
  id: string;
  createdAt: string;
  currency: 'MXN';
  items: (Design & { qty: number; unitPrice: number; title: string })[];
  totals: { subtotal: number; discount: number; shipping: number; total: number };
  customer: Customer;
  shipping: Address & { method: string };
  spellingConfirmed: boolean;
  source: string;
}

export function newOrderId(): string {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `NB-${ymd}-${rnd}`;
}

export function buildOrder(
  lines: CartLine[],
  unit: (l: CartLine) => number,
  t: Order['totals'],
  customer: Customer,
  address: Address,
  method: string,
): Order {
  return {
    id: newOrderId(),
    createdAt: new Date().toISOString(),
    currency: 'MXN',
    items: lines.map((l) => ({ ...l.design, qty: l.qty, unitPrice: unit(l), title: products[l.design.product].name })),
    totals: t,
    customer,
    shipping: { ...address, method },
    spellingConfirmed: true,
    source: location.href,
  };
}

export function orderMessage(o: Order): string {
  const items = o.items
    .map((i, n) => {
      const extras = [i.giftBox ? store.addons.giftBox.label : '', i.giftNote ? `Dedicatoria: "${i.giftNote}"` : ''].filter(Boolean).join(' · ');
      return `${n + 1}. ${i.title}\n   Grabado: "${i.text}"\n   ${describeDesign(i)}${extras ? `\n   ${extras}` : ''}\n   ${i.qty} × ${money(i.unitPrice)}`;
    })
    .join('\n');
  const a = o.shipping;
  return [
    `Hola ${store.brand.name}, quiero confirmar mi pedido ${o.id}:`,
    '',
    items,
    '',
    o.totals.discount ? `Descuento: −${money(o.totals.discount)}` : '',
    `Envío: ${o.totals.shipping ? money(o.totals.shipping) : 'Gratis'}`,
    `Total: ${money(o.totals.total)} MXN`,
    '',
    `Envío a: ${o.customer.name}, ${a.street}${a.interior ? ` int. ${a.interior}` : ''}, col. ${a.colonia}, ${a.city}, ${a.state}, C.P. ${a.postalCode}`,
    a.references ? `Referencias: ${a.references}` : '',
    `Correo: ${o.customer.email}`,
    '',
    'Revisé que los nombres estén bien escritos. Quedo atenta(o) al enlace de pago.',
  ]
    .filter((l, i, arr) => !(l === '' && arr[i - 1] === ''))
    .join('\n');
}

const KEY = 'nombra.lastOrder.v1';
export function saveOrder(o: Order): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(o));
  } catch {
    /* sem storage */
  }
}
export function loadOrder(): Order | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
}
