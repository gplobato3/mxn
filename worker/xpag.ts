/**
 * Cliente mínimo da API xpag (https://xpag.global/docs).
 * - Autenticação por cabeçalho X-Client-Id / X-Client-Secret (segredos do Worker).
 * - A API responde HTTP 200 mesmo em erro: o que vale é `ok` e `error_code`.
 */
import type { Env } from './env';

const DEFAULT_API = 'https://api.xpag.global';

export type XpagResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string; status: number };

export interface CashinResponse {
  ok: true;
  sandbox?: boolean;
  amount: number;
  fee?: number;
  currency?: string;
  status?: string;
  request_number?: string;
  transaction_id: string;
  external_id?: string;
  expire_minutes?: number;
  // SPEI
  clabe?: string;
  bank_name?: string;
  beneficiary?: string;
  checkout_url?: string;
  // OXXO
  code?: string;
  voucher_reference?: string;
  barcode?: string;
  payee_data?: { reference?: string; barcode?: string } | null;
}

export interface TransactionResponse {
  ok: true;
  sandbox?: boolean;
  type?: string;
  status: string; // pending | confirmed | expired | failed
  amount?: number;
  currency?: string;
  transaction_id?: string;
  external_id?: string;
  e2e?: string;
}

async function call<T>(env: Env, path: string, init: RequestInit = {}): Promise<XpagResult<T>> {
  const base = env.XPAG_API_URL || DEFAULT_API;
  let res: Response;
  try {
    res = await fetch(base + path, {
      ...init,
      headers: {
        'X-Client-Id': env.XPAG_CLIENT_ID,
        'X-Client-Secret': env.XPAG_CLIENT_SECRET,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    return { ok: false, code: 'network', message: (e as Error).message, status: 0 };
  }
  const body = (await res.json().catch(() => null)) as (T & { ok?: boolean; error?: string; error_code?: string }) | null;
  if (!body || body.ok !== true) {
    return { ok: false, code: body?.error_code || `http_${res.status}`, message: body?.error || '', status: res.status };
  }
  return { ok: true, data: body };
}

export interface ChargeInput {
  method: 'spei' | 'oxxo';
  amount: number;
  externalId: string;
  name: string;
  email: string;
  description: string;
  webhookUrl: string;
}

/** Cria a cobrança dinâmica (valor fixo, um pagamento só). */
export function createCharge(env: Env, c: ChargeInput) {
  const body =
    c.method === 'oxxo'
      ? {
          currency: 'MXN',
          method: 'OXXO',
          amount: c.amount,
          generateCheckout: false, // voucher cru: mostramos referência e código de barras na nossa página
          payerData: { name: c.name, email: c.email },
          external_id: c.externalId,
          webhook_url: c.webhookUrl,
        }
      : {
          currency: 'MXN',
          amount: c.amount,
          name: c.name,
          description: c.description,
          external_id: c.externalId,
          webhook_url: c.webhookUrl,
        };
  return call<CashinResponse>(env, '/cashin', { method: 'POST', body: JSON.stringify(body) });
}

/** Estado real da transação. É a única fonte de verdade antes de liberar um pedido. */
export function consultTransaction(env: Env, transactionId: string) {
  return call<TransactionResponse>(env, `/consult-transaction?transaction_id=${encodeURIComponent(transactionId)}`);
}

/** Mensagem para o cliente (es-MX) a partir do error_code estável da xpag. */
export function customerMessage(code: string, method: 'spei' | 'oxxo'): string {
  switch (code) {
    case 'amount_below_min':
    case 'amount_above_limit':
    case 'amount_unavailable':
      return method === 'oxxo'
        ? 'Este monto no se puede pagar en OXXO. Elige transferencia SPEI.'
        : 'Este monto no se puede pagar por SPEI en este momento. Prueba con OXXO o escríbenos.';
    case 'provider_unavailable':
    case 'rate_limited':
    case 'maintenance':
    case 'network':
      return 'El sistema de pagos no respondió. Intenta de nuevo en un momento.';
    default:
      return 'No pudimos generar tu pago.';
  }
}
