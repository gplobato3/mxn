// Gera public/og.jpg (1200×630) e public/apple-touch-icon.png a partir das fotos e da marca.
// Uso: node scripts/build-og.mjs
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const W = 1200;
const H = 630;

const hero = await sharp('src/assets/photos/hero-desktop.jpg')
  .resize(W, H, { fit: 'cover', position: 'right' })
  .toBuffer();

const fade = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#f3eadd" stop-opacity=".92"/><stop offset=".55" stop-color="#f3eadd" stop-opacity=".35"/><stop offset=".75" stop-color="#f3eadd" stop-opacity="0"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
);

const logo = await sharp(await readFile('public/brand/logo-full.svg'), { density: 220 }).resize({ width: 470 }).png().toBuffer();

await sharp(hero)
  .composite([
    { input: fade, top: 0, left: 0 },
    { input: logo, top: Math.round(H / 2 - 85), left: 70 },
  ])
  .jpeg({ quality: 84, progressive: true, mozjpeg: true })
  .toFile('public/og.jpg');

await sharp('public/favicon.svg', { density: 600 }).resize(180, 180).png().toFile('public/apple-touch-icon.png');
console.log('og.jpg e apple-touch-icon.png gerados');
