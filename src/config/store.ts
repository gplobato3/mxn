/**
 * CONFIGURAÇÃO DA LOJA — edite aqui antes de publicar.
 * Tudo o que é decisão de negócio (preços, frete, prazos, WhatsApp, pagamento)
 * fica neste arquivo. O texto do site está em espanhol do México.
 */

// import.meta.env existe no build do Astro/Vite; fora dele (ex.: função serverless) vira {}.
const env: Record<string, string | undefined> = typeof import.meta.env !== 'undefined' ? import.meta.env : {};

export const store = {
  brand: {
    name: 'Nombra',
    tagline: 'Joyería con nombre propio',
    // Domínio e e-mail de atendimento.
    email: 'hola@nombra.mx',
    // WhatsApp com código do país, só números. Ex.: 5215512345678 (52 + 1 + número).
    // TROQUE ANTES DE PUBLICAR. Enquanto estiver com X, os botões de WhatsApp ficam ocultos.
    whatsapp: '52XXXXXXXXXX',
    instagram: 'https://instagram.com/nombra.mx',
    tiktok: 'https://tiktok.com/@nombra.mx',
    // Dados legais para o Aviso de Privacidad e Términos (obrigatório no México).
    legalName: '[RAZÓN SOCIAL O NOMBRE DEL TITULAR]',
    legalAddress: '[DOMICILIO FISCAL COMPLETO]',
    rfc: '[RFC]',
    // Onde as peças são gravadas (aparece na seção "taller"). Ajuste se não for verdade.
    madeIn: 'Grabado en México',
  },

  currency: 'MXN',
  locale: 'es-MX',

  /** Prazos exibidos no site (dias úteis). */
  timing: {
    productionDays: '1 a 2 días hábiles',
    shippingDays: '2 a 5 días hábiles',
    totalDays: '3 a 7 días hábiles',
  },

  /** Garantia contra defeito de fabricação (dias) e prazo para reclamar após a entrega. */
  warrantyDays: 30,
  claimDays: 5,

  /** Frete. Se quiser cobrar, troque price por um valor em MXN. */
  shipping: [
    {
      id: 'estandar',
      label: 'Envío estándar a todo México',
      detail: 'Llega en 3 a 7 días hábiles con número de guía.',
      price: 0,
      enabled: true,
    },
    {
      id: 'express',
      label: 'Envío express',
      detail: 'Prioridad en taller y paquetería express (1 a 3 días hábiles tras grabar).',
      price: 149,
      enabled: false,
    },
  ],

  /** Desconto por levar mais de uma peça (aumenta o ticket médio). */
  bundle: {
    enabled: true,
    minItems: 2,
    discount: 150,
    label: 'Llévate 2 piezas y ahorra $150',
  },

  /** Extras opcionais no configurador. */
  addons: {
    giftBox: { enabled: true, label: 'Estuche de regalo de terciopelo', price: 99 },
    giftNote: { enabled: true, label: 'Tarjeta con dedicatoria', price: 0, maxLength: 140 },
  },

  /**
   * Mensagens de temporada (barra do topo). A primeira cujo período (from–until) inclui hoje
   * é exibida; fora de qualquer período aparece defaultAnnouncement.
   * Formato da data: AAAA-MM-DD (horário do centro do México).
   */
  seasonal: [
    { from: '2026-11-13', until: '2026-11-17', text: 'Buen Fin: llévate 2 piezas y ahorra $150' },
    { from: '2026-10-01', until: '2026-12-14', text: 'Pide antes del 14 de dic. y llega antes de Navidad' },
    { from: '2026-12-15', until: '2026-12-29', text: 'Pide antes del 29 de dic. y llega para Reyes' },
    { from: '2027-01-02', until: '2027-02-07', text: 'Pide antes del 7 de feb. y llega para el 14' },
  ],
  defaultAnnouncement: 'Envío gratis a todo México · Mira cómo queda antes de pagar',

  /**
   * Pagamento.
   * - mode 'whatsapp': o pedido é registrado e o cliente fecha o pagamento pelo WhatsApp
   *   (funciona hoje, sem gateway).
   * - mode 'endpoint': o checkout faz POST do pedido para PUBLIC_CHECKOUT_ENDPOINT e
   *   redireciona para a URL retornada pelo seu gateway. Veja README.md.
   * Se PUBLIC_CHECKOUT_ENDPOINT estiver definido no .env, o modo endpoint é usado automaticamente.
   */
  payment: {
    mode: (env.PUBLIC_CHECKOUT_ENDPOINT ? 'endpoint' : 'whatsapp') as 'endpoint' | 'whatsapp',
    endpoint: env.PUBLIC_CHECKOUT_ENDPOINT || '',
    // Texto exibido no checkout sobre os meios aceitos. Ajuste ao seu gateway.
    methodsNote: 'Tarjeta de crédito o débito, OXXO y transferencia SPEI',
    // Opcional: URL de webhook (Make, Zapier, Google Apps Script, n8n...) que recebe cada
    // pedido em JSON no modo WhatsApp, para você não depender do cliente mandar a mensagem.
    orderWebhook: env.PUBLIC_ORDER_WEBHOOK || '',
    // Parâmetro que o seu gateway devolve em /gracias quando o pagamento foi aprovado.
    // Só com ele o evento Purchase é disparado no pixel.
    approvedParam: { key: 'status', value: 'approved' },
  },

  analytics: {
    metaPixelId: env.PUBLIC_META_PIXEL_ID || '',
    tiktokPixelId: env.PUBLIC_TIKTOK_PIXEL_ID || '',
  },
} as const;

export const whatsappEnabled = !/X/.test(store.brand.whatsapp);

export function whatsappLink(message: string): string {
  return `https://wa.me/${store.brand.whatsapp}?text=${encodeURIComponent(message)}`;
}
