/** Configurador da página de produto: estado, prévia ao vivo, zoom, carrinho. */
import {
  cleanText,
  materials,
  priceDesign,
  products,
  type AnimalId,
  type Design,
  type FontId,
  type MaterialId,
  type NombreStyle,
  type ProductId,
} from '../data/catalog';
import { loadPreviewFonts, neckFocus, renderNeck, renderStudio } from '../lib/pendant';
import { cart } from '../lib/cart';
import { money } from '../lib/format';
import { track } from '../lib/track';
import { store } from '../config/store';

type View = 'neck' | 'studio' | 'photos';

export function initConfigurator(): void {
  const root = document.querySelector<HTMLElement>('[data-pdp]');
  if (!root) return;
  const productId = root.dataset.product as ProductId;
  const product = products[productId];
  const form = root.querySelector<HTMLFormElement>('[data-cfg]')!;
  const input = form.querySelector<HTMLInputElement>('[data-text]')!;
  const stage = root.querySelector<HTMLElement>('[data-stage]')!;
  const frame = root.querySelector<HTMLElement>('[data-frame]')!;
  const neckEl = root.querySelector<HTMLElement>('[data-neck]')!;
  const neckSvg = root.querySelector<HTMLElement>('[data-neck-svg]')!;
  const studioSvg = root.querySelector<HTMLElement>('[data-studio-svg]')!;
  const zoomBtn = root.querySelector<HTMLButtonElement>('[data-zoom]')!;
  const photoGold = root.querySelector<HTMLElement>('[data-neck-photo="gold"]')!;
  const photoSilver = root.querySelector<HTMLElement>('[data-neck-photo="silver"]')!;

  /* ---------- estado inicial (URL > padrão) ---------- */
  const q = new URLSearchParams(location.search);
  const state: Design = {
    product: productId,
    text: q.get('nombre') ?? product.defaultText,
    font: (q.get('letra') as FontId) || product.defaultFont,
    material: (q.get('metal') as MaterialId) || 'oro',
    length: Number(q.get('largo')) || 45,
    style: productId === 'nombre' ? ((q.get('estilo') as NombreStyle) || 'nombre') : undefined,
    animal: productId === 'mascota' ? ((q.get('animal') as AnimalId) || 'perro') : undefined,
    giftBox: false,
    giftNote: '',
  };
  if (!product.fonts.includes(state.font)) state.font = product.defaultFont;
  if (!materials[state.material]) state.material = 'oro';
  if (![40, 45, 50].includes(state.length)) state.length = 45;

  const typedByUser = q.has('nombre');
  input.value = typedByUser ? cleanText(state, state.text) : '';
  if (!typedByUser) input.placeholder = `${product.placeholder} (ej. ${product.defaultText})`;

  // sincroniza radios com o estado
  const setRadio = (name: string, value: string | number | undefined) => {
    if (value === undefined) return;
    const r = form.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`);
    if (r) r.checked = true;
  };
  setRadio('font', state.font);
  setRadio('material', state.material);
  setRadio('length', state.length);
  setRadio('style', state.style);
  setRadio('animal', state.animal);

  /* ---------- zoom / enquadramento da foto ---------- */
  let view: View = 'neck';
  let close = true;

  function layoutNeck() {
    const cw = frame.clientWidth;
    const ch = frame.clientHeight;
    const ratio = 2304 / 1856;
    const coverW = Math.max(cw, ch / ratio);
    const isIniciales = state.product === 'nombre' && state.style === 'iniciales';
    const visibleFrac = state.product === 'mascota' ? 0.44 : isIniciales ? 0.36 : 0.46;
    const w = close ? Math.max(coverW, cw / visibleFrac) : coverW;
    const h = w * ratio;
    const f = neckFocus(state);
    let x = cw / 2 - f.x * w;
    let y = ch / 2 - f.y * h;
    x = Math.min(0, Math.max(cw - w, x));
    y = Math.min(0, Math.max(ch - h, y));
    neckEl.style.setProperty('--w', `${w}px`);
    neckEl.style.setProperty('--x', `${x}px`);
    neckEl.style.setProperty('--y', `${y}px`);
    zoomBtn.setAttribute('aria-label', close ? 'Alejar la vista' : 'Acercar la vista');
  }

  zoomBtn.addEventListener('click', () => {
    if (view === 'studio') return setView('neck');
    close = !close;
    layoutNeck();
  });

  function setView(v: View) {
    view = v;
    stage.dataset.view = v;
    root!.querySelectorAll<HTMLButtonElement>('[data-view-btn]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.viewBtn === v)));
  }
  root.querySelectorAll<HTMLButtonElement>('[data-view-btn]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.viewBtn as View)));

  new ResizeObserver(() => layoutNeck()).observe(frame);

  /* ---------- render ---------- */
  const priceEls = root.querySelectorAll<HTMLElement>('[data-price], [data-btn-price], [data-sticky-price]');
  const countEl = form.querySelector<HTMLElement>('[data-count]');
  const samples = form.querySelectorAll<HTMLElement>('[data-font-sample]');
  const fontsStep = form.querySelector<HTMLElement>('[data-fonts-step]');
  const label = form.querySelector<HTMLElement>('[data-text-label]');
  const hint = form.querySelector<HTMLElement>('[data-hint]');
  const err = form.querySelector<HTMLElement>('[data-text-error]');

  function currentDesign(): Design {
    const txt = cleanText(state, input.value || '') || (typedByUser || input.value ? '' : product.defaultText);
    return { ...state, text: txt || product.defaultText };
  }

  let raf = 0;
  function render() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const d = currentDesign();
      const tone = materials[d.material].tone;
      const silver = tone !== 'gold';
      photoGold.hidden = silver;
      photoSilver.hidden = !silver;
      neckSvg.innerHTML = renderNeck(d);
      studioSvg.innerHTML = renderStudio(d);
      layoutNeck();

      const price = priceDesign(d, { giftBox: store.addons.giftBox.price }).unit;
      priceEls.forEach((el) => (el.textContent = money(price)));

      const isIni = d.product === 'nombre' && d.style === 'iniciales';
      const max = isIni ? 3 : product.maxChars;
      input.maxLength = max;
      if (countEl) countEl.textContent = `${cleanText(state, input.value).length}/${max}`;
      if (fontsStep) fontsStep.hidden = isIni;
      if (label) label.textContent = isIni ? 'Iniciales (hasta 3 letras)' : productId === 'mascota' ? 'Nombre de tu mascota' : 'Nombre a grabar';
      if (hint) hint.textContent = isIni ? 'Puedes usar “&” entre letras. Ej.: A&M' : 'Respetamos acentos y la ñ. Te confirmamos la ortografía antes de grabar.';
      const sampleText = d.text || product.defaultText;
      samples.forEach((s) => (s.textContent = sampleText));
    });
  }

  let urlTimer = 0;
  function syncUrl() {
    clearTimeout(urlTimer);
    urlTimer = window.setTimeout(() => {
      const u = new URL(location.href);
      const t = cleanText(state, input.value);
      t ? u.searchParams.set('nombre', t) : u.searchParams.delete('nombre');
      u.searchParams.set('letra', state.font);
      u.searchParams.set('metal', state.material);
      u.searchParams.set('largo', String(state.length));
      if (state.style) u.searchParams.set('estilo', state.style);
      if (state.animal) u.searchParams.set('animal', state.animal);
      history.replaceState(null, '', u);
    }, 400);
  }

  /* ---------- eventos do formulário ---------- */
  input.addEventListener('input', () => {
    const cleaned = cleanText(state, input.value);
    if (state.style === 'iniciales' && input.value !== cleaned) input.value = cleaned;
    input.removeAttribute('aria-invalid');
    if (err) err.hidden = true;
    render();
    syncUrl();
  });

  // mobile: ao focar, mantém a prévia visível acima do campo
  input.addEventListener('focus', () => {
    if (window.matchMedia('(max-width: 899px)').matches) {
      setTimeout(() => {
        const top = stage.getBoundingClientRect().top + window.scrollY - 64;
        window.scrollTo({ top, behavior: 'smooth' });
      }, 250);
    }
    if (view === 'photos') setView('neck');
  });

  form.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === 'font') state.font = t.value as FontId;
    if (t.name === 'material') state.material = t.value as MaterialId;
    if (t.name === 'length') state.length = Number(t.value);
    if (t.name === 'animal') state.animal = t.value as AnimalId;
    if (t.name === 'giftBox') state.giftBox = t.checked;
    if (t.name === 'style') {
      state.style = t.value as NombreStyle;
      const cur = input.value;
      input.value = state.style === 'iniciales' ? cleanText(state, cur ? cur[0] : 'M') : cur.length <= 3 ? '' : cur;
      input.placeholder = state.style === 'iniciales' ? 'Ej. A&M' : `${product.placeholder} (ej. ${product.defaultText})`;
    }
    if (t.hasAttribute('data-want-note')) {
      const box = form.querySelector<HTMLElement>('[data-note]');
      if (box) box.hidden = !t.checked;
      if (t.checked) setTimeout(() => form.querySelector<HTMLTextAreaElement>('#giftNote')?.focus(), 50);
    }
    if (['font', 'material', 'style', 'animal'].includes(t.name) && view === 'photos') setView('neck');
    render();
    syncUrl();
  });

  function addToCart() {
    const text = cleanText(state, input.value);
    if (!text) {
      input.setAttribute('aria-invalid', 'true');
      if (err) err.hidden = false;
      input.focus();
      return;
    }
    const noteOn = form.querySelector<HTMLInputElement>('[data-want-note]')?.checked;
    const note = noteOn ? form.querySelector<HTMLTextAreaElement>('#giftNote')?.value.trim().slice(0, store.addons.giftNote.maxLength) : '';
    const design: Design = { ...state, text, giftNote: note || undefined };
    cart.add(design);
    const value = priceDesign(design, { giftBox: store.addons.giftBox.price }).unit;
    track('AddToCart', { value, content_ids: [productId], content_name: product.name, content_type: 'product' });
    window.dispatchEvent(new Event('cart:open'));
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    addToCart();
  });
  root.querySelector('[data-sticky-add]')?.addEventListener('click', addToCart);

  // compartilhar o design (decisão de presente em grupo)
  root.querySelector('[data-share]')?.addEventListener('click', () => {
    syncUrl();
    const d = currentDesign();
    const msg = `Mira este collar que diseñé en ${store.brand.name}: “${d.text}” (${materials[d.material].label}). ${location.href}`;
    if (navigator.share) {
      navigator.share({ title: product.name, text: msg, url: location.href }).catch(() => undefined);
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    }
  });

  // barra fixa no mobile quando o botão principal sai da tela
  const sticky = root.querySelector<HTMLElement>('[data-sticky]');
  const buy = root.querySelector<HTMLElement>('[data-buy]');
  if (sticky && buy && 'IntersectionObserver' in window) {
    sticky.hidden = false;
    let buyVisible = false;
    let stageVisible = true;
    const update = () => sticky.classList.toggle('show', !buyVisible && !stageVisible);
    new IntersectionObserver(([e]) => {
      buyVisible = e.isIntersecting;
      update();
    }).observe(buy);
    new IntersectionObserver(
      ([e]) => {
        stageVisible = e.isIntersecting;
        update();
      },
      { threshold: 0.35 },
    ).observe(frame);
  }

  render();
  loadPreviewFonts().then(render);
  track('ViewContent', { value: materials.oro.price, content_ids: [productId], content_name: product.name, content_type: 'product' });
}
