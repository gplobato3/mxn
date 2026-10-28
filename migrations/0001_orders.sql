-- Pedidos da loja. Aplicar com: npx wrangler d1 migrations apply nombra-pedidos --remote
CREATE TABLE IF NOT EXISTS orders (
  id          TEXT PRIMARY KEY,          -- NB-AAMMDD-XXXXX (gerado no servidor)
  token       TEXT NOT NULL,             -- segredo do cliente para ver o próprio pedido
  status      TEXT NOT NULL,             -- pending | paid | expired | failed | review
  method      TEXT NOT NULL,             -- spei | oxxo
  total       REAL NOT NULL,             -- MXN, recalculado no servidor
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT NOT NULL,
  data        TEXT NOT NULL,             -- JSON: itens, totais, endereço
  payment     TEXT NOT NULL,             -- JSON: instruções devolvidas pela xpag
  xpag_tx     TEXT,                      -- transaction_id da xpag
  e2e         TEXT,
  sandbox     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  expires_at  TEXT,
  paid_at     TEXT,
  checked_at  TEXT,
  updated_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_tx ON orders (xpag_tx);
