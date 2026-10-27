/**
 * Eventos de conversão para Meta Pixel e TikTok Pixel.
 * Só disparam se os IDs estiverem configurados (veja .env.example).
 */
type Params = Record<string, unknown>;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    ttq?: { track: (event: string, params?: Params) => void };
  }
}

const tiktokMap: Record<string, string> = {
  ViewContent: 'ViewContent',
  AddToCart: 'AddToCart',
  InitiateCheckout: 'InitiateCheckout',
  AddPaymentInfo: 'AddPaymentInfo',
  Purchase: 'CompletePayment',
  Lead: 'SubmitForm',
};

export function track(event: keyof typeof tiktokMap, params: Params = {}, eventId?: string): void {
  try {
    window.fbq?.('track', event, { currency: 'MXN', ...params }, eventId ? { eventID: eventId } : undefined);
    window.ttq?.track(tiktokMap[event], { currency: 'MXN', ...params });
  } catch {
    /* pixel bloqueado: segue o fluxo normalmente */
  }
}
