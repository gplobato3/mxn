/**
 * Renderizador SVG das peças (placa, nome recortado, iniciais e mascote).
 * Gera markup leve (string) para duas cenas:
 *  - 'neck'  : sobreposto à foto-base do pescoço (coordenadas da foto)
 *  - 'studio': peça em destaque sobre fundo neutro (detalhe, carrinho, hero)
 */
import { cleanText, fonts, materials, type Design, type FontId } from '../data/catalog';
import { curveY, neck, type NeckGeometry } from './geometry';
import { petShapes } from './shapes';

type Tone = 'gold' | 'silver' | 'silver950';
type Pt = [number, number];

interface Palette {
  face: [number, string][];
  edge: string;
  dark: string;
  engrave: string;
  hi: string;
  chain: string;
  chainHi: string;
  chainShadow: string;
}

const palettes: Record<Tone, Palette> = {
  gold: {
    face: [[0, '#b98a43'], [0.22, '#f0d391'], [0.4, '#fff3cf'], [0.55, '#e6c27a'], [0.78, '#c4964d'], [1, '#9c7232']],
    edge: '#86602a',
    dark: '#5e4219',
    engrave: '#5a3d14',
    hi: '#fff8e3',
    chain: '#c49a52',
    chainHi: '#fbe7b0',
    chainShadow: 'rgba(54,30,12,.30)',
  },
  silver: {
    face: [[0, '#9ea3a9'], [0.22, '#dfe3e7'], [0.4, '#ffffff'], [0.55, '#d3d7dc'], [0.78, '#a9aeb4'], [1, '#868b92']],
    edge: '#767b82',
    dark: '#4d5258',
    engrave: '#43484e',
    hi: '#ffffff',
    chain: '#b7bcc2',
    chainHi: '#f6f8fa',
    chainShadow: 'rgba(30,30,34,.28)',
  },
  silver950: {
    face: [[0, '#acaca6'], [0.22, '#e8e7e1'], [0.4, '#fdfcf8'], [0.55, '#dcdbd4'], [0.78, '#b6b5ae'], [1, '#93928c']],
    edge: '#85847e',
    dark: '#55544f',
    engrave: '#4b4a45',
    hi: '#ffffff',
    chain: '#c3c2bb',
    chainHi: '#fbfaf5',
    chainShadow: 'rgba(32,30,26,.28)',
  },
};

const weights: Record<FontId, number> = { script: 400, serif: 600, moderna: 600, clasica: 700, elegante: 400 };
const INITIAL_FAMILY = '"Cormorant Garamond", serif';

let uid = 0;
const r2 = (n: number) => Math.round(n * 100) / 100;
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let ctx: CanvasRenderingContext2D | null = null;
function measure(text: string, family: string, weight: number, size: number, spacingEm = 0): number {
  if (typeof document !== 'undefined') {
    ctx ||= document.createElement('canvas').getContext('2d');
  }
  if (!ctx) return text.length * size * 0.55;
  ctx.font = `${weight} ${size}px ${family}`;
  return ctx.measureText(text).width + Math.max(0, text.length - 1) * spacingEm * size;
}

function toneOf(d: Design): Tone {
  return materials[d.material]?.tone ?? 'gold';
}

function defs(id: string, p: Palette, s: number): string {
  const stops = p.face.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('');
  return `<defs>
<linearGradient id="${id}f" x1="0" y1="0" x2="0.45" y2="1">${stops}</linearGradient>
<linearGradient id="${id}h" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${p.face[1][1]}"/><stop offset=".5" stop-color="${p.face[2][1]}"/><stop offset="1" stop-color="${p.face[4][1]}"/></linearGradient>
<filter id="${id}s" x="-30%" y="-30%" width="160%" height="190%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="${r2(0.55 * s)}" stdDeviation="${r2(0.6 * s)}" flood-color="#2a160b" flood-opacity="0.36"/></filter>
<filter id="${id}b" x="-10%" y="-10%" width="120%" height="140%"><feGaussianBlur stdDeviation="${r2(0.35 * s)}"/></filter>
</defs>`;
}

/**
 * Corrente tipo "rolo/cable": elos alternados de frente (anel com furo) e de perfil
 * (traço fino), desenhados com tracejados defasados ao longo do mesmo caminho.
 */
function chain(d: string, p: Palette, s: number, id: string, scale = 1): string {
  const u = s * scale;
  const w = 1.0 * u; // largura do elo de frente
  const pitch = 1.35 * u;
  const P = pitch * 2;
  const face = 1.6 * u - w; // comprimento visível = dash + w (pontas redondas)
  const edgeW = 0.36 * u;
  const edge = 1.55 * u - edgeW;
  const hole = 0.22 * u;
  const holeW = 0.3 * u;
  const da = (a: number) => `${r2(a)} ${r2(P - a)}`;
  return `<g fill="none" stroke-linecap="round" stroke-linejoin="round">
<path d="${d}" stroke="${p.chainShadow}" stroke-width="${r2(w * 1.15)}" transform="translate(0 ${r2(0.5 * u)})" filter="url(#${id}b)"/>
<path d="${d}" stroke="${p.edge}" stroke-width="${r2(edgeW + 0.12 * u)}" stroke-dasharray="${da(edge)}" stroke-dashoffset="${r2(-pitch - (face - edge) / 2)}"/>
<path d="${d}" stroke="${p.chain}" stroke-width="${r2(edgeW)}" stroke-dasharray="${da(edge)}" stroke-dashoffset="${r2(-pitch - (face - edge) / 2)}"/>
<path d="${d}" stroke="${p.edge}" stroke-width="${r2(w)}" stroke-dasharray="${da(face)}"/>
<path d="${d}" stroke="${p.chain}" stroke-width="${r2(w * 0.74)}" stroke-dasharray="${da(face)}"/>
<path d="${d}" stroke="${p.dark}" stroke-opacity=".75" stroke-width="${r2(holeW)}" stroke-dasharray="${da(hole)}" stroke-dashoffset="${r2(-(face - hole) / 2)}"/>
<path d="${d}" stroke="${p.chainHi}" stroke-width="${r2(w * 0.2)}" stroke-dasharray="${da(face * 0.6)}" stroke-dashoffset="${r2(-face * 0.05)}" transform="translate(${r2(-0.06 * u)} ${r2(-0.14 * u)})"/>
</g>`;
}

function ring(c: Pt, r: number, p: Palette, s: number, id: string): string {
  return `<circle cx="${r2(c[0])}" cy="${r2(c[1])}" r="${r2(r)}" fill="none" stroke="${p.edge}" stroke-width="${r2(0.42 * s)}"/>
<circle cx="${r2(c[0])}" cy="${r2(c[1])}" r="${r2(r)}" fill="none" stroke="url(#${id}h)" stroke-width="${r2(0.26 * s)}"/>`;
}

function polyPath(points: Pt[]): string {
  if (points.length < 2) return '';
  // Catmull-Rom -> Bézier para curva suave
  let d = `M${r2(points[0][0])} ${r2(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${r2(c1[0])} ${r2(c1[1])} ${r2(c2[0])} ${r2(c2[1])} ${r2(p2[0])} ${r2(p2[1])}`;
  }
  return d;
}

/* ----------------------------------------------------------- peças ---- */

interface Placement {
  s: number; // px por mm
  /** y da corrente "natural" em x (para posicionar pontas e pingentes) */
  y: (x: number) => number;
  cx: number;
  bottomY: number;
}

interface Built {
  body: string;
  /** 'ends': corrente presa nas duas pontas; 'hang': pingente pendurado na corrente contínua */
  attach: { type: 'ends'; l: Pt; r: Pt } | { type: 'hang' };
}

function engraved(text: string, x: number, y: number, family: string, weight: number, size: number, spacingEm: number, p: Palette, s: number): string {
  const common = `x="${r2(x)}" text-anchor="middle" dominant-baseline="central" font-family='${family}' font-weight="${weight}" font-size="${r2(size)}" letter-spacing="${r2(spacingEm * size)}"`;
  const t = esc(text);
  return `<text ${common} y="${r2(y + 0.16 * s)}" fill="${p.hi}" opacity=".6">${t}</text>
<text ${common} y="${r2(y)}" fill="${p.engrave}" opacity=".96" stroke="${p.engrave}" stroke-width="${r2(0.05 * s)}" stroke-opacity=".5">${t}</text>`;
}

function buildPlaca(d: Design, text: string, at: Placement, p: Palette, id: string): Built {
  const s = at.s;
  const W = 35 * s;
  const H = 7 * s;
  const t = 0.42 * s;
  const rr = 0.9 * s;
  const ringR = 0.8 * s;
  const xL = at.cx - W / 2;
  const attachL: Pt = [xL - ringR * 1.9, 0];
  const attachR: Pt = [xL + W + ringR * 1.9, 0];
  const yMid = (at.y(attachL[0]) + at.y(attachR[0])) / 2;
  attachL[1] = yMid;
  attachR[1] = yMid;
  const y0 = yMid - H / 2;

  const f = fonts[d.font];
  const shown = f.transform === 'uppercase' ? text.toUpperCase() : text;
  const target = d.font === 'script' ? 5.4 * s : d.font === 'serif' ? 4.1 * s : 3.1 * s;
  const maxW = W - 8 * s;
  let size = target;
  const w = measure(shown, f.family, weights[d.font], size, f.letterSpacing);
  if (w > maxW) size *= maxW / w;
  const dy = d.font === 'script' ? 0.15 * s : d.font === 'serif' ? 0.25 * s : 0.05 * s;

  const body = `<g filter="url(#${id}s)"><rect x="${r2(xL)}" y="${r2(y0)}" width="${r2(W)}" height="${r2(H + t)}" rx="${r2(rr)}" fill="${p.edge}"/></g>
<rect x="${r2(xL)}" y="${r2(y0)}" width="${r2(W)}" height="${r2(H)}" rx="${r2(rr)}" fill="url(#${id}f)"/>
<rect x="${r2(xL + 0.22 * s)}" y="${r2(y0 + 0.22 * s)}" width="${r2(W - 0.44 * s)}" height="${r2(H - 0.44 * s)}" rx="${r2(rr * 0.8)}" fill="none" stroke="${p.hi}" stroke-opacity=".45" stroke-width="${r2(0.14 * s)}"/>
${engraved(shown || ' ', at.cx, y0 + H / 2 + dy, f.family, weights[d.font], size, f.letterSpacing, p, s)}
${ring([xL - ringR * 0.95, yMid], ringR, p, s, id)}
${ring([xL + W + ringR * 0.95, yMid], ringR, p, s, id)}`;
  return { body, attach: { type: 'ends', l: attachL, r: attachR } };
}

function metalText(text: string, x: number, baseline: number, family: string, weight: number, size: number, p: Palette, s: number, id: string, thicken: number): string {
  const common = `x="${r2(x)}" text-anchor="middle" font-family='${family}' font-weight="${weight}" font-size="${r2(size)}" stroke-linejoin="round" paint-order="stroke"`;
  const t = esc(text);
  return `<g filter="url(#${id}s)"><text ${common} y="${r2(baseline + 0.32 * s)}" fill="${p.edge}" stroke="${p.edge}" stroke-width="${r2(thicken)}" dx="${r2(0.16 * s)}">${t}</text></g>
<text ${common} y="${r2(baseline)}" fill="url(#${id}f)" stroke="url(#${id}f)" stroke-width="${r2(thicken)}">${t}</text>
<text ${common} y="${r2(baseline - 0.08 * s)}" dx="${r2(-0.05 * s)}" fill="none" stroke="${p.hi}" stroke-opacity=".5" stroke-width="${r2(0.09 * s)}">${t}</text>`;
}

function buildNombre(d: Design, text: string, at: Placement, p: Palette, id: string): Built {
  const s = at.s;
  const f = fonts[d.font];
  const weight = weights[d.font];
  let size = d.font === 'elegante' ? 12.5 * s : 10 * s;
  const maxW = 44 * s;
  let w = measure(text, f.family, weight, size);
  if (w > maxW) {
    size *= maxW / w;
    w = maxW;
  }
  const thicken = d.font === 'elegante' ? 0.62 * s : 0.22 * s;
  const ringR = 0.6 * s;
  const lx = at.cx - w / 2 - ringR * 0.6;
  const rx = at.cx + w / 2 + ringR * 0.6;
  const yAttach = (at.y(lx) + at.y(rx)) / 2;
  // a altura de engate fica ~ no meio das minúsculas
  const baseline = yAttach + size * (d.font === 'elegante' ? 0.18 : 0.2);
  const body = `${metalText(text, at.cx, baseline, f.family, weight, size, p, s, id, thicken)}
${ring([lx, yAttach], ringR, p, s, id)}
${ring([rx, yAttach], ringR, p, s, id)}`;
  return { body, attach: { type: 'ends', l: [lx - ringR * 0.9, yAttach], r: [rx + ringR * 0.9, yAttach] } };
}

function buildIniciales(text: string, at: Placement, p: Palette, id: string): Built {
  const s = at.s;
  const letters = [...(text || 'A')].slice(0, 3);
  const size = 14 * s;
  const cap = 0.63 * size;
  const gap = 2.4 * s;
  const widths = letters.map((ch) => measure(ch, INITIAL_FAMILY, 700, size));
  const total = widths.reduce((a, b) => a + b, 0) + gap * (letters.length - 1);
  let x = at.cx - total / 2;
  const ringR = 0.75 * s;
  let body = '';
  letters.forEach((ch, i) => {
    const lx = x + widths[i] / 2;
    const ringC: Pt = [lx, at.y(lx) + ringR * 0.7];
    const top = ringC[1] + ringR * 0.75;
    const baseline = top + cap;
    body += metalText(ch, lx, baseline, INITIAL_FAMILY, 700, size, p, s, id, 0.12 * s);
    body += ring(ringC, ringR, p, s, id);
    x += widths[i] + gap;
  });
  return { body, attach: { type: 'hang' } };
}

function buildMascota(d: Design, text: string, at: Placement, p: Palette, id: string): Built {
  const s = at.s;
  const shape = petShapes[d.animal || 'perro'];
  const k = (22 * s) / shape.box.h;
  const ringR = 0.9 * s;
  const ringC: Pt = [at.cx, at.bottomY + ringR * 0.7];
  // posiciona a argola do desenho logo abaixo da argola da corrente
  const ox = ringC[0] - shape.bail[0] * k;
  const oy = ringC[1] + ringR * 0.55 - shape.bail[1] * k;
  const tf = `translate(${r2(ox)} ${r2(oy)}) scale(${r2(k * 1000) / 1000})`;
  const f = fonts[d.font];
  const shown = f.transform === 'uppercase' ? text.toUpperCase() : text;
  let size = shape.text.size * (d.font === 'script' ? 1.45 : 1);
  const maxW = shape.text.w;
  const w = measure(shown, f.family, weights[d.font], size * k, f.letterSpacing) / k;
  if (w > maxW) size *= maxW / w;
  // gravado em coordenadas da forma (antes da escala)
  const sLocal = s / k;
  const engr = engraved(shown || ' ', shape.text.x, shape.text.y, f.family, weights[d.font], size, f.letterSpacing * 0.6, p, sLocal);
  const body = `<g transform="${tf}">
<g filter="url(#${id}s)"><path d="${shape.d}" fill="${p.edge}" transform="translate(${r2(0.16 * sLocal)} ${r2(0.3 * sLocal)})"/></g>
<path d="${shape.d}" fill="url(#${id}f)"/>
<path d="${shape.d}" fill="none" stroke="${p.hi}" stroke-opacity=".5" stroke-width="${r2(0.16 * sLocal)}" transform="translate(${r2(-0.04 * sLocal)} ${r2(-0.05 * sLocal)})"/>
${engr}
</g>
${ring(ringC, ringR, p, s, id)}`;
  return { body, attach: { type: 'hang' } };
}

function build(d: Design, at: Placement, p: Palette, id: string): Built {
  const text = cleanText(d, d.text);
  if (d.product === 'placa') return buildPlaca(d, text, at, p, id);
  if (d.product === 'mascota') return buildMascota(d, text, at, p, id);
  if (d.style === 'iniciales') return buildIniciales(text, at, p, id);
  return buildNombre(d, text || ' ', at, p, id);
}

/* ----------------------------------------------------------- cenas ---- */

/** Prévia sobre a foto do pescoço. Retorna <svg> com o mesmo viewBox da foto. */
export function renderNeck(d: Design): string {
  const id = `n${++uid}`;
  const tone = toneOf(d);
  const p = palettes[tone];
  const g: NeckGeometry = tone === 'gold' ? neck.gold : neck.silver;
  const s = g.pxPerMm;
  const at: Placement = { s, y: (x) => curveY(g, x), cx: g.bottom[0], bottomY: g.bottom[1] };
  const b = build(d, at, p, id);
  let chainD: string;
  if (b.attach.type === 'ends') {
    const { l, r } = b.attach;
    const left = g.curve.filter(([x]) => x < l[0] - 8);
    const right = g.curve.filter(([x]) => x > r[0] + 8);
    const segL: Pt[] = [[g.cutL[0] - 6, g.cutL[1] - 6 * g.slopeL], ...left, l];
    const segR: Pt[] = [r, ...right, [g.cutR[0] + 6, g.cutR[1] + 6 * g.slopeR]];
    chainD = `${polyPath(segL)} ${polyPath(segR)}`;
  } else {
    const pts: Pt[] = [[g.cutL[0] - 6, g.cutL[1] - 6 * g.slopeL], ...g.curve, [g.cutR[0] + 6, g.cutR[1] + 6 * g.slopeR]];
    chainD = polyPath(pts);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.width} ${g.height}" preserveAspectRatio="none" aria-hidden="true">${defs(id, p, s)}${chain(chainD, p, s, id)}${b.body}</svg>`;
}

/** Foco (em fração da foto) para o zoom da prévia "puesto". */
export function neckFocus(d: Design): { x: number; y: number } {
  const g = toneOf(d) === 'gold' ? neck.gold : neck.silver;
  const s = g.pxPerMm;
  let y: number;
  if (d.product === 'mascota') y = g.bottom[1] + 12 * s;
  else if (d.product === 'nombre' && d.style === 'iniciales') y = g.bottom[1] + 5 * s;
  else y = curveY(g, g.bottom[0] + 19 * s); // altura onde a peça encontra a corrente
  return { x: g.bottom[0] / g.width, y: y / g.height };
}

/** Peça em destaque, fundo transparente (viewBox 1000×800). */
export function renderStudio(d: Design, opts: { scale?: number } = {}): string {
  const id = `s${++uid}`;
  const p = palettes[toneOf(d)];
  const s = opts.scale ?? 14;
  const cx = 500;
  const hanging = d.product === 'mascota' || (d.product === 'nombre' && d.style === 'iniciales');
  const bottomY = hanging ? (d.product === 'mascota' ? 250 : 335) : 400;
  // catenária sintética (pingentes) ou linha reta (peças presas nas pontas)
  const span = 470;
  // iniciais: fundo mais plano para as letras ficarem quase alinhadas
  const expo = d.product === 'nombre' ? 2.6 : 1.7;
  const y = hanging
    ? (x: number) => {
        const u = (x - cx) / span;
        return bottomY - (bottomY + 60) * Math.pow(Math.abs(u), expo);
      }
    : () => bottomY;
  const at: Placement = { s, y, cx, bottomY };
  const b = build(d, at, p, id);
  let chainD: string;
  if (b.attach.type === 'ends') {
    const l = b.attach.l;
    const r = b.attach.r;
    chainD = `M${cx - span - 10} -40 C${r2(cx - span + 120)} ${r2(l[1] * 0.55)} ${r2(l[0] - 90)} ${r2(l[1] - 6)} ${r2(l[0])} ${r2(l[1])} M${r2(r[0])} ${r2(r[1])} C${r2(r[0] + 90)} ${r2(r[1] - 6)} ${r2(cx + span - 120)} ${r2(r[1] * 0.55)} ${cx + span + 10} -40`;
  } else {
    const pts: Pt[] = [];
    for (let x = cx - span - 20; x <= cx + span + 20; x += 30) pts.push([x, y(x)]);
    chainD = polyPath(pts);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 800" aria-hidden="true">${defs(id, p, s)}${chain(chainD, p, s, id, 0.82)}${b.body}</svg>`;
}

/** Garante que as fontes da prévia estejam carregadas antes de medir o texto. */
export async function loadPreviewFonts(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  const specs = ['400 40px "Great Vibes"', '700 40px "Dancing Script"', '600 40px "Cormorant Garamond"', '700 40px "Cormorant Garamond"', '600 40px "Manrope"'];
  await Promise.all(specs.map((f) => document.fonts.load(f, 'AaÑñ'))).catch(() => undefined);
}
