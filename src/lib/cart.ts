/** Carrinho no localStorage, com eventos para atualizar a UI em todas as abas. */
import { cleanText, priceDesign, totals, type Design } from '../data/catalog';
import { store } from '../config/store';

export interface CartLine {
  id: string;
  design: Design;
  qty: number;
  addedAt: number;
}

const KEY = 'nombra.cart.v1';
const EVT = 'cart:change';

function read(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    const lines = raw ? (JSON.parse(raw) as CartLine[]) : [];
    return Array.isArray(lines) ? lines.filter((l) => l && l.design && l.qty > 0) : [];
  } catch {
    return [];
  }
}

function write(lines: CartLine[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* modo privado sem storage: o carrinho fica só em memória */
  }
  memory = lines;
  window.dispatchEvent(new CustomEvent(EVT, { detail: lines }));
}

let memory: CartLine[] | null = null;

export const cart = {
  lines(): CartLine[] {
    return memory ?? (memory = read());
  },
  add(design: Design, qty = 1): CartLine {
    const d: Design = { ...design, text: cleanText(design, design.text) };
    const line: CartLine = { id: crypto.randomUUID?.() ?? String(Date.now() + Math.random()), design: d, qty, addedAt: Date.now() };
    write([...cart.lines(), line]);
    return line;
  },
  setQty(id: string, qty: number): void {
    write(cart.lines().map((l) => (l.id === id ? { ...l, qty: Math.max(1, Math.min(9, qty)) } : l)));
  },
  remove(id: string): void {
    write(cart.lines().filter((l) => l.id !== id));
  },
  clear(): void {
    write([]);
  },
  count(): number {
    return cart.lines().reduce((n, l) => n + l.qty, 0);
  },
  totals(shippingPrice = 0) {
    return totals(cart.lines(), {
      bundle: store.bundle,
      shippingPrice,
      giftBoxPrice: store.addons.giftBox.price,
    });
  },
  unit(line: CartLine): number {
    return priceDesign(line.design, { giftBox: store.addons.giftBox.price }).unit;
  },
  onChange(fn: (lines: CartLine[]) => void): () => void {
    const h = () => fn(cart.lines());
    const storage = (e: StorageEvent) => {
      if (e.key === KEY) {
        memory = read();
        h();
      }
    };
    window.addEventListener(EVT, h);
    window.addEventListener('storage', storage);
    return () => {
      window.removeEventListener(EVT, h);
      window.removeEventListener('storage', storage);
    };
  },
};
