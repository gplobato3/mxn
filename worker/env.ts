/// <reference types="@cloudflare/workers-types" />

export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  CHECKOUT_LIMITER?: { limit(opts: { key: string }): Promise<{ success: boolean }> };

  // Segredos (npx wrangler secret put NOME). Nunca no código nem no repositório.
  XPAG_CLIENT_ID: string;
  XPAG_CLIENT_SECRET: string;
  /** Chave aleatória que vai na URL do webhook (?k=...). */
  XPAG_WEBHOOK_KEY: string;
  /** Senha do painel /admin. Sem ela o painel fica desligado. */
  ADMIN_PASSWORD?: string;
  /** Opcional: URL (Make, Zapier, n8n...) que recebe cada pedido pago em JSON. */
  ORDER_NOTIFY_WEBHOOK?: string;

  // Variáveis normais (wrangler.jsonc → vars)
  XPAG_API_URL?: string;
}
