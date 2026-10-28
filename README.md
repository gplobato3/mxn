# Nombra — loja de colares personalizados (México)

Loja pronta para vender colares com nome, iniciais e silhueta de mascote, com **prévia ao vivo**
(sobre uma foto real do pescoço e em modo detalhe), carrinho, desconto por 2 peças, checkout
mexicano (CEP → estado/colônia automáticos) e páginas legais. Texto do site em espanhol do México,
preços em MXN. Pagamento por **SPEI e OXXO via xpag**, publicado num **Cloudflare Worker**.

- **No ar:** https://nombra.timelapse.workers.dev (marcado `noindex` até ter domínio próprio).
- **Stack:** [Astro 7](https://astro.build) (HTML estático, zero framework no cliente), CSS próprio,
  TypeScript. JS por página: ~20 KB (antes de gzip). Imagens AVIF/WebP responsivas geradas no build.
- **Páginas:** início, 3 configuradores (`/disena/placa`, `/disena/nombre`, `/disena/mascota`),
  `/checkout`, `/pago` (CLABE ou referência OXXO), `/gracias`, envios/trocas, aviso de privacidade,
  termos, 404. Painel de pedidos em `/admin`.
- **Servidor:** `worker/` (Cloudflare Worker) + banco D1 `nombra-pedidos` com os pedidos.

## Rodar localmente

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # gera dist/ (site estático)
npm run preview
```

Node 20.19+ (testado com Node 22).

## Antes de publicar (checklist)

Tudo fica em **`src/config/store.ts`**:

1. `brand.whatsapp` — seu número com 52 (ex.: `5215512345678`). Enquanto estiver com `X`,
   os botões de WhatsApp ficam ocultos.
2. `brand.email`, `instagram`, `tiktok`.
3. `brand.legalName`, `legalAddress`, `rfc` — aparecem no Aviso de Privacidad e nos Términos
   (obrigatórios no México). **Peça para um advogado mexicano revisar os textos legais.**
4. Confirme o que o site promete e ajuste se precisar:
   - frete grátis (`shipping`), prazos (`timing`), garantia de 30 dias (`warrantyDays`);
   - desconto de $150 em 2 peças (`bundle`); estojo de $99 (`addons.giftBox`);
   - "Grabado en México" (`brand.madeIn`);
   - descrição dos materiais em `src/data/catalog.ts` (ex.: base do banho).
5. Domínio: `SITE_URL` no build (o `robots.txt` é gerado a partir dele).
6. Verifique se o nome "Nombra" e o domínio estão livres (IMPI e registro de domínio).

Copie `.env.example` para `.env` e preencha o que usar.

## Pagamento (xpag: SPEI e OXXO)

O site funciona em dois modos, escolhidos no build:

| Modo | Quando | O que acontece |
|---|---|---|
| **Gateway** (Cloudflare) | `PUBLIC_CHECKOUT_ENDPOINT=/api/checkout` (já vem no `npm run build:cf`) | O cliente escolhe SPEI ou OXXO, o Worker cria a cobrança na xpag e mostra `/pago` com a CLABE ou a referência + código de barras. A página se atualiza sozinha quando o pagamento cai. |
| **WhatsApp** | `PUBLIC_CHECKOUT_ENDPOINT` vazio (`npm run build`) | O pedido é salvo e o cliente o envia por WhatsApp. Opcional: `PUBLIC_ORDER_WEBHOOK`. |

Como funciona no modo gateway (`worker/index.ts`):

1. `POST /api/checkout` recebe só as escolhas do cliente. **Preço, desconto e frete são recalculados
   no servidor** com `src/data/catalog.ts` e `src/config/store.ts`; o total do navegador é ignorado.
2. O Worker gera o número do pedido (`NB-AAMMDD-XXXXX`), chama `POST /cashin` da xpag (cobrança
   dinâmica: SPEI vale 24 h, OXXO 12 dias, OXXO até 10.000 MXN) e grava o pedido no D1.
3. A xpag avisa em `POST /api/xpag/webhook?k=<XPAG_WEBHOOK_KEY>`. O aviso da xpag **não é assinado**,
   então o Worker nunca confia no corpo: ele reconsulta `GET /consult-transaction` com as próprias
   credenciais e só então marca o pedido como pago. A troca para "pago" é atômica (aviso repetido não
   duplica nada). Se o valor não bater, o pedido fica como **"Revisar pago"**.
4. Se o webhook se perder, `/pago` e `/gracias` consultam `GET /api/order`, que reconsulta a xpag
   (no máximo a cada 15 s por pedido).
5. O evento `Purchase` do pixel só dispara em `/gracias` quando o servidor confirma o pagamento.

Meios aceitos: a xpag em MXN oferece **SPEI e OXXO** (sem cartão). Os textos ficam em
`store.payment.methods` e `store.payment.methodsNote`.

### Segredos do Worker

Nunca vão para o repositório. Configure com `npx wrangler secret put NOME`:

| Segredo | Para quê |
|---|---|
| `XPAG_CLIENT_ID`, `XPAG_CLIENT_SECRET` | Credenciais da xpag (painel → Integrações → API). Para testar, use a chave pública de sandbox da documentação. |
| `XPAG_WEBHOOK_KEY` | Texto aleatório que vai na URL do webhook. |
| `ADMIN_PASSWORD` | Senha do painel `/admin` (usuário: qualquer um). Sem ela, o painel fica desligado. |
| `ORDER_NOTIFY_WEBHOOK` (opcional) | URL que recebe cada pedido pago em JSON (Make, Zapier, n8n…), com um campo `text` pronto. |

### Painel de pedidos

`https://SEU-DOMINIO/admin` mostra os pedidos pagos (padrão), os que esperam pagamento e todos: texto
a gravar, peça, dedicatória, cliente (WhatsApp clicável) e endereço de envio. Pedidos de sandbox
aparecem com a etiqueta **PRUEBA**.

### Testar sem dinheiro (sandbox)

1. Troque os segredos `XPAG_CLIENT_ID`/`XPAG_CLIENT_SECRET` pela chave de sandbox da documentação da xpag.
2. Faça um pedido no site. O `/pago` mostra "Modo de prueba".
3. Pegue o `transaction_id` no `/admin` (linha "xpag …") e chame
   `POST https://api.xpag.global/sandbox/simulate` com `{"transaction_id":"…","outcome":"paid"}`.
   A xpag dispara o webhook real e a página `/pago` vai sozinha para `/gracias`.
4. Volte as credenciais de produção.

## Pixels e eventos

Preencha `PUBLIC_META_PIXEL_ID` e/ou `PUBLIC_TIKTOK_PIXEL_ID` no `.env`. Eventos já ligados:
`PageView`, `ViewContent` (configurador), `AddToCart`, `InitiateCheckout`, `AddPaymentInfo`,
`Lead` (pedido por WhatsApp) e `Purchase` (só com pagamento aprovado). Para a API de Conversões
(CAPI), envie o mesmo `eventID` (= id do pedido) a partir do seu endpoint.

## Deploy (Cloudflare Workers)

O Worker serve o site estático (`dist/`) e a API. Configuração em `wrangler.jsonc`
(D1 `nombra-pedidos`, limite de 8 checkouts/min por IP, observabilidade ligada).

```bash
export CLOUDFLARE_API_TOKEN=...      # token com permissão de Workers e D1
npm run deploy                       # build + migrações do D1 + wrangler deploy
```

`npm run build:cf` usa por padrão `SITE_URL=https://nombra.timelapse.workers.dev` e
`PUBLIC_NOINDEX=1`. Com domínio próprio:

1. Cloudflare → Workers → `nombra` → Settings → Domains & Routes → adicione o domínio.
2. Publique com `SITE_URL=https://www.seudominio.mx PUBLIC_NOINDEX=0 npm run deploy`.

O webhook usa o domínio de onde veio o checkout, então não precisa mudar nada na xpag.

A versão antiga em GitHub Pages (https://gplobato3.github.io/mxn/) é só vitrine, sem pagamento.

## Fotos e marca

- Fotos geradas com Replicate (`google/nano-banana-2.1`), revisadas uma a uma para não ter erro
  de grafia. Prompts em `scripts/image-prompts.json`.
  - Regerar: `export REPLICATE_API_TOKEN=...` e `python scripts/generate-images.py [ids]`
    (as originais vão para `.image-raw/`, fora do git), depois `python scripts/optimize-images.py`.
  - As fotos-base da prévia (`neck-oro`, `neck-plata`) passam por `scripts/chain-cut.py`, que
    remove o centro da corrente e imprime a geometria para `src/lib/geometry.ts`.
- Marca: logotipo, favicon e lockup em SVG gerados das fontes por `scripts/build-brand.py`;
  imagem de compartilhamento `public/og.jpg` por `node scripts/build-og.mjs`.
- Fontes self-hosted em `public/fonts` (Cormorant Garamond, Manrope, Great Vibes, Dancing Script —
  todas SIL Open Font License).

## Onde mexer

| O quê | Arquivo |
|---|---|
| Preços, materiais, fontes, produtos, regras de preço | `src/data/catalog.ts` |
| Loja, frete, prazos, mensagens de temporada, meios de pagamento | `src/config/store.ts` |
| Avaliações de clientes | `src/data/reviews.ts` |
| API de pagamento, webhook, painel | `worker/index.ts`, `worker/xpag.ts`, `worker/admin.ts` |
| Perguntas frequentes | `src/data/faq.ts` |
| Desenho das peças na prévia (SVG) | `src/lib/pendant.ts`, `src/lib/shapes.ts` |
| Cores e tipografia | `src/styles/global.css` |
| Textos legais | `src/pages/privacidad.astro`, `terminos.astro`, `envios-y-devoluciones.astro` |

## Avaliações

A seção "Opiniones" (início e páginas de produto) lê `src/data/reviews.ts`. Só entram avaliações
reais, com o texto como o cliente escreveu e a nota que ele deu. Na página de cada produto, as
avaliações daquele produto aparecem primeiro (campo `product`).

Para mostrar a foto do cliente: salve em `src/assets/photos/review-NOME.jpg` e preencha
`photo: 'review-NOME'` e `photoAlt`. Peça autorização ao cliente para usar a foto.

A loja não tem avaliações inventadas nem contadores falsos de estoque/tempo (prática enganosa e
contra as regras da Profeco e da Meta).
