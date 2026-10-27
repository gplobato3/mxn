/**
 * EXEMPLO de endpoint de pagamento (serverless, estilo Vercel/Netlify/Cloudflare).
 * Não é usado no build do site. Copie para a pasta de funções do seu provedor
 * e troque `createPayment` pela chamada real do seu gateway.
 *
 * Contrato:
 *   POST  body = Order (src/lib/order.ts)
 *   200   { "redirectUrl": "https://checkout.seugateway.com/..." }
 *   4xx   { "error": "mensagem" }
 *
 * Depois do pagamento, o gateway deve redirecionar para:
 *   https://SEU-DOMINIO/gracias?pedido=<id>&status=approved
 * (ou o parâmetro que você definir em store.payment.approvedParam).
 */
import { priceDesign, totals, products, materials, cleanText, type Design } from '../src/data/catalog';
import { store } from '../src/config/store';

interface IncomingOrder {
  id: string;
  items: (Design & { qty: number })[];
  customer: { email: string; phone: string; name: string };
  shipping: { method: string; postalCode: string; street: string; colonia: string; city: string; state: string; interior?: string; references?: string };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  let order: IncomingOrder;
  try {
    order = await req.json();
  } catch {
    return json({ error: 'Pedido inválido' }, 400);
  }

  // 1. Nunca confie no preço enviado pelo navegador: recalcule aqui.
  if (!Array.isArray(order.items) || order.items.length === 0 || order.items.length > 20) return json({ error: 'Bolsa vacía' }, 400);
  const lines = [];
  for (const it of order.items) {
    if (!products[it.product] || !materials[it.material]) return json({ error: 'Producto inválido' }, 400);
    const text = cleanText(it, it.text);
    if (!text) return json({ error: 'Falta el texto a grabar' }, 400);
    const qty = Math.max(1, Math.min(9, Math.floor(Number(it.qty) || 1)));
    lines.push({ design: { ...it, text }, qty, unit: priceDesign(it, { giftBox: store.addons.giftBox.price }).unit });
  }
  const ship = store.shipping.find((s) => s.enabled && s.id === order.shipping?.method) ?? store.shipping.find((s) => s.enabled)!;
  const t = totals(lines, { bundle: store.bundle, shippingPrice: ship.price, giftBoxPrice: store.addons.giftBox.price });

  // 2. Crie o pagamento no seu gateway com o total recalculado (em centavos se ele pedir).
  const redirectUrl = await createPayment({
    reference: order.id,
    amountMxn: t.total,
    description: lines.map((l) => `${products[l.design.product].shortName} "${l.design.text}"`).join(', '),
    customer: order.customer,
    successUrl: `${process.env.SITE_URL}/gracias?pedido=${encodeURIComponent(order.id)}&status=approved`,
    failureUrl: `${process.env.SITE_URL}/gracias?pedido=${encodeURIComponent(order.id)}&status=failed`,
  });

  // 3. Salve o pedido (banco, planilha, e-mail) para produção e envio.
  return json({ redirectUrl });
}

async function createPayment(_p: {
  reference: string;
  amountMxn: number;
  description: string;
  customer: IncomingOrder['customer'];
  successUrl: string;
  failureUrl: string;
}): Promise<string> {
  // TODO: chame a API do seu gateway aqui usando a chave secreta em variável de ambiente
  // (ex.: process.env.GATEWAY_SECRET_KEY). Nunca coloque a chave no código do site.
  throw new Error('Integre aqui o seu gateway de pagamento');
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
