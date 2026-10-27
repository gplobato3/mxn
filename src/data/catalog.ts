/**
 * Catálogo e regras de preço. Arquivo puro (sem dependências de browser),
 * para ser importado tanto pelo site quanto pelo seu endpoint de pagamento,
 * que DEVE recalcular o preço no servidor com estas mesmas regras.
 */

export type MaterialId = 'oro' | 'plata' | 'plata950';
export type ProductId = 'placa' | 'nombre' | 'mascota';
export type FontId = 'script' | 'serif' | 'moderna' | 'clasica' | 'elegante';
export type AnimalId = 'perro' | 'gato' | 'huella' | 'corazon';
export type NombreStyle = 'nombre' | 'iniciales';

export interface Material {
  id: MaterialId;
  label: string;
  short: string;
  price: number;
  tone: 'gold' | 'silver' | 'silver950';
  description: string;
  badge?: string;
}

export const materials: Record<MaterialId, Material> = {
  oro: {
    id: 'oro',
    label: 'Baño de oro 18k',
    short: 'Oro 18k',
    price: 499,
    tone: 'gold',
    description: 'Brillo dorado cálido sobre base metálica resistente. Para usarlo todos los días.',
  },
  plata: {
    id: 'plata',
    label: 'Baño de plata',
    short: 'Plata',
    price: 499,
    tone: 'silver',
    description: 'Acabado plateado luminoso, ligero y versátil. Combina con todo.',
  },
  plata950: {
    id: 'plata950',
    label: 'Plata .950',
    short: 'Plata .950',
    price: 999,
    tone: 'silver950',
    badge: 'Plata de ley',
    description: 'Plata sólida .950, no es baño. La ley más alta que se trabaja en México. Para toda la vida.',
  },
};

export const chainLengths = [
  { cm: 40, label: '40 cm', hint: 'A la base del cuello' },
  { cm: 45, label: '45 cm', hint: 'La más elegida' },
  { cm: 50, label: '50 cm', hint: 'Sobre el escote' },
] as const;

export interface FontOption {
  id: FontId;
  label: string;
  family: string;
  sample: string;
  /** como o texto é escrito na peça */
  transform: 'none' | 'uppercase';
  letterSpacing: number; // em em
}

export const fonts: Record<FontId, FontOption> = {
  script: { id: 'script', label: 'Caligrafía', family: '"Great Vibes", cursive', sample: 'Aa', transform: 'none', letterSpacing: 0 },
  serif: { id: 'serif', label: 'Clásica', family: '"Cormorant Garamond", serif', sample: 'Aa', transform: 'uppercase', letterSpacing: 0.12 },
  moderna: { id: 'moderna', label: 'Moderna', family: '"Manrope", sans-serif', sample: 'Aa', transform: 'uppercase', letterSpacing: 0.22 },
  clasica: { id: 'clasica', label: 'Cursiva', family: '"Dancing Script", cursive', sample: 'Aa', transform: 'none', letterSpacing: 0 },
  elegante: { id: 'elegante', label: 'Caligrafía', family: '"Great Vibes", cursive', sample: 'Aa', transform: 'none', letterSpacing: 0 },
};

export const animals: Record<AnimalId, { id: AnimalId; label: string }> = {
  perro: { id: 'perro', label: 'Perro' },
  gato: { id: 'gato', label: 'Gato' },
  huella: { id: 'huella', label: 'Huellita' },
  corazon: { id: 'corazon', label: 'Corazón' },
};

export interface Product {
  id: ProductId;
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  fonts: FontId[];
  defaultFont: FontId;
  maxChars: number;
  placeholder: string;
  defaultText: string;
  details: { label: string; value: string }[];
}

export const products: Record<ProductId, Product> = {
  placa: {
    id: 'placa',
    slug: 'placa',
    name: 'Collar Placa con Nombre',
    shortName: 'Placa con nombre',
    tagline: 'Su nombre grabado en una placa pulida que se lleva todos los días.',
    description:
      'Una placa horizontal de líneas suaves, unida a la cadena por ambos lados para que siempre quede centrada. Grabamos el nombre con láser de precisión: no se borra ni se desgasta con el uso.',
    fonts: ['script', 'serif', 'moderna'],
    defaultFont: 'script',
    maxChars: 12,
    placeholder: 'Escribe un nombre',
    defaultText: 'Valeria',
    details: [
      { label: 'Placa', value: '35 × 7 mm' },
      { label: 'Grabado', value: 'Láser de precisión, hasta 12 caracteres' },
      { label: 'Cadena', value: 'Cadena fina tipo rolo con broche de langosta' },
    ],
  },
  nombre: {
    id: 'nombre',
    slug: 'nombre',
    name: 'Collar Nombre o Iniciales',
    shortName: 'Nombre o iniciales',
    tagline: 'Las letras, sin placa: el nombre recortado o sus iniciales sueltas.',
    description:
      'El clásico collar de nombre: cada letra recortada en una sola pieza, unida y pulida a mano. Si prefieres algo más discreto, elige iniciales: dijes de letra independientes que se mueven contigo.',
    fonts: ['clasica', 'elegante'],
    defaultFont: 'clasica',
    maxChars: 10,
    placeholder: 'Escribe un nombre',
    defaultText: 'Mariana',
    details: [
      { label: 'Nombre recortado', value: 'Aprox. 30 mm de ancho, letras de 9 mm' },
      { label: 'Iniciales', value: 'Hasta 3 letras de 9 mm, cada una con su argolla' },
      { label: 'Cadena', value: 'Cadena fina tipo rolo con broche de langosta' },
    ],
  },
  mascota: {
    id: 'mascota',
    slug: 'mascota',
    name: 'Collar Mascota Personalizado',
    shortName: 'Mascota',
    tagline: 'La silueta de quien te espera en casa, con su nombre grabado.',
    description:
      'Un dije con la silueta de tu perro o tu gato (o una huellita) y su nombre grabado al centro. Para llevarlo contigo a todas partes, o para regalarlo a quien lo quiere igual que tú.',
    fonts: ['moderna', 'script'],
    defaultFont: 'moderna',
    maxChars: 10,
    placeholder: 'Nombre de tu mascota',
    defaultText: 'Rocky',
    details: [
      { label: 'Dije', value: 'Aprox. 22 mm de alto' },
      { label: 'Grabado', value: 'Láser de precisión, hasta 10 caracteres' },
      { label: 'Cadena', value: 'Cadena fina tipo rolo con broche de langosta' },
    ],
  },
};

export const productList = [products.placa, products.nombre, products.mascota];

/** Configuração escolhida pelo cliente para uma peça. */
export interface Design {
  product: ProductId;
  text: string;
  font: FontId;
  material: MaterialId;
  length: number;
  style?: NombreStyle; // só para "nombre"
  animal?: AnimalId; // só para "mascota"
  giftBox?: boolean;
  giftNote?: string;
}

export const ALLOWED_TEXT = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ&' .\-]*$/;

/** Normaliza o texto como será gravado (limites, iniciais etc.). */
export function cleanText(design: Pick<Design, 'product' | 'style'>, raw: string): string {
  const p = products[design.product];
  let t = (raw || '').replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ&' .\-]/g, '').replace(/\s{2,}/g, ' ');
  if (design.product === 'nombre' && design.style === 'iniciales') {
    t = t.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ&]/g, '').toUpperCase().slice(0, 3);
  } else {
    t = t.slice(0, p.maxChars);
  }
  return t;
}

export interface Pricing {
  base: number;
  addons: number;
  unit: number;
}

export function priceDesign(d: Design, addonPrices = { giftBox: 99 }): Pricing {
  const base = materials[d.material]?.price ?? materials.oro.price;
  const addons = d.giftBox ? addonPrices.giftBox : 0;
  return { base, addons, unit: base + addons };
}

export interface CartTotals {
  items: number;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
}

export function totals(
  lines: { design: Design; qty: number }[],
  opts: { bundle?: { enabled: boolean; minItems: number; discount: number }; shippingPrice?: number; giftBoxPrice?: number } = {},
): CartTotals {
  const items = lines.reduce((n, l) => n + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + priceDesign(l.design, { giftBox: opts.giftBoxPrice ?? 99 }).unit * l.qty, 0);
  const discount = opts.bundle?.enabled && items >= opts.bundle.minItems ? opts.bundle.discount : 0;
  const shipping = items > 0 ? opts.shippingPrice ?? 0 : 0;
  return { items, subtotal, discount, shipping, total: Math.max(0, subtotal - discount + shipping) };
}

export function describeDesign(d: Design): string {
  const m = materials[d.material];
  const parts = [products[d.product].shortName];
  if (d.product === 'nombre') parts.push(d.style === 'iniciales' ? 'Iniciales' : 'Nombre recortado');
  if (d.product === 'mascota' && d.animal) parts.push(animals[d.animal].label);
  parts.push(m.short, `${d.length} cm`);
  if (d.product !== 'nombre' || d.style !== 'iniciales') parts.push(fonts[d.font].label);
  return parts.join(' · ');
}
