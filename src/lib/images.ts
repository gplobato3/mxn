import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';

const photos = import.meta.glob<{ default: ImageMetadata }>('../assets/photos/*.jpg', { eager: true });

export function photo(name: string): ImageMetadata {
  const m = photos[`../assets/photos/${name}.jpg`];
  if (!m) throw new Error(`Foto não encontrada: ${name}`);
  return m.default;
}

export interface Responsive {
  avif: string;
  webp: string;
  fallback: string;
  width: number;
  height: number;
}

/** Gera srcset AVIF/WebP + fallback JPG para um <picture> manual. */
export async function responsive(name: string, widths: number[], quality = 72): Promise<Responsive> {
  const src = photo(name);
  const ws = widths.filter((w) => w <= src.width);
  if (!ws.length) ws.push(src.width);
  const make = async (format: 'avif' | 'webp' | 'jpg') => {
    const out = await Promise.all(ws.map((w) => getImage({ src, width: w, format, quality: format === 'avif' ? quality - 20 : quality })));
    return out.map((o, i) => `${o.src} ${ws[i]}w`).join(', ');
  };
  const [avif, webp, fallback] = await Promise.all([make('avif'), make('webp'), make('jpg')]);
  return { avif, webp, fallback, width: src.width, height: src.height };
}

/** URL única (para usar dentro de SVG ou CSS). */
export async function single(name: string, width: number, format: 'webp' | 'avif' | 'jpg' = 'webp', quality = 72): Promise<string> {
  const img = await getImage({ src: photo(name), width, format, quality });
  return img.src;
}
