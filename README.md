# Nombra — loja de colares personalizados (México)

Loja pronta para vender colares com nome, iniciais e silhueta de mascote, com **prévia ao vivo**
(sobre uma foto real do pescoço e em modo detalhe), carrinho, desconto por 2 peças, checkout
mexicano (CEP → estado/colônia automáticos) e páginas legais. Texto do site em espanhol do México,
preços em MXN.

- **Stack:** [Astro 7](https://astro.build) (HTML estático, zero framework no cliente), CSS próprio,
  TypeScript. JS por página: ~20 KB (antes de gzip). Imagens AVIF/WebP responsivas geradas no build.
- **Páginas:** início, 3 configuradores (`/disena/placa`, `/disena/nombre`, `/disena/mascota`),
  `/checkout`, `/gracias`, envios/trocas, aviso de privacidade, termos, 404.

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
5. Domínio: `SITE_URL` no `.env` (e em `public/robots.txt`).
6. Verifique se o nome "Nombra" e o domínio estão livres (IMPI e registro de domínio).

Copie `.env.example` para `.env` e preencha o que usar.

## Pagamento (gateway)

O site funciona em dois modos, escolhidos automaticamente:

| Modo | Quando | O que acontece |
|---|---|---|
| **WhatsApp** (padrão) | `PUBLIC_CHECKOUT_ENDPOINT` vazio | O pedido é salvo, o cliente vai para `/gracias` e envia o pedido pronto por WhatsApp; você responde com o link de pagamento. Opcional: `PUBLIC_ORDER_WEBHOOK` recebe cada pedido em JSON (Make, Zapier, n8n, Google Apps Script). |
| **Gateway** | `PUBLIC_CHECKOUT_ENDPOINT` preenchido | O checkout faz `POST` do pedido (JSON) para o seu endpoint, que cria o pagamento e responde `{ "redirectUrl": "..." }`. O cliente é redirecionado para pagar. |

Para ligar o seu gateway:

1. Use `api-example/checkout.ts` como base. Ele **recalcula o preço no servidor** com as mesmas
   regras de `src/data/catalog.ts` (nunca confie no total que vem do navegador).
2. Troque `createPayment()` pela chamada do seu gateway, com a chave secreta em variável de
   ambiente do servidor.
3. Configure o retorno do gateway para `https://SEU-DOMINIO/gracias?pedido=<id>&status=approved`.
   Só com `status=approved` o evento `Purchase` é disparado no pixel e o carrinho é limpo
   (o nome do parâmetro fica em `store.payment.approvedParam`).
4. Ajuste `store.payment.methodsNote` com os meios que o seu gateway aceita.

Formato do pedido: interface `Order` em `src/lib/order.ts` (itens com texto a gravar, fonte,
metal, comprimento, estojo, dedicatória; cliente; endereço; totais).

## Pixels e eventos

Preencha `PUBLIC_META_PIXEL_ID` e/ou `PUBLIC_TIKTOK_PIXEL_ID` no `.env`. Eventos já ligados:
`PageView`, `ViewContent` (configurador), `AddToCart`, `InitiateCheckout`, `AddPaymentInfo`,
`Lead` (pedido por WhatsApp) e `Purchase` (só com pagamento aprovado). Para a API de Conversões
(CAPI), envie o mesmo `eventID` (= id do pedido) a partir do seu endpoint.

## Prévia online (GitHub Pages)

Versão de teste em https://gplobato3.github.io/mxn/ (marcada como `noindex`). Ela é servida a
partir da branch `gh-pages`. Para atualizar:

```bash
BASE_PATH=/mxn SITE_URL=https://gplobato3.github.io PUBLIC_NOINDEX=1 npm run build
touch dist/.nojekyll   # sem isso o GitHub ignora a pasta _astro
# publique o conteúdo de dist/ na branch gh-pages
```

No domínio definitivo, faça o build sem `BASE_PATH` e sem `PUBLIC_NOINDEX`.

## Deploy

Qualquer hospedagem estática: Vercel, Netlify ou Cloudflare Pages.
Comando de build `npm run build`, pasta de saída `dist`. Defina as variáveis do `.env` no painel
do provedor. O endpoint de pagamento vai como função serverless do mesmo provedor.

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
| Loja, frete, prazos, mensagens de temporada, pagamento | `src/config/store.ts` |
| Perguntas frequentes | `src/data/faq.ts` |
| Desenho das peças na prévia (SVG) | `src/lib/pendant.ts`, `src/lib/shapes.ts` |
| Cores e tipografia | `src/styles/global.css` |
| Textos legais | `src/pages/privacidad.astro`, `terminos.astro`, `envios-y-devoluciones.astro` |

## Sem depoimentos falsos

A loja não tem avaliações inventadas nem contadores falsos de estoque/tempo (prática enganosa e
contra as regras da Profeco e da Meta). Quando tiver avaliações reais, adicione uma seção.
