/**
 * Geometria das fotos-base da prévia "puesto" (pescoço).
 * Coordenadas em pixels da foto original (1856×2304). Os pontos foram medidos
 * automaticamente sobre a corrente real da foto (scripts/ e README explicam como refazer).
 * A parte central da corrente foi removida da foto; o SVG desenha essa parte.
 */
export interface NeckGeometry {
  width: number;
  height: number;
  cutL: [number, number];
  cutR: [number, number];
  slopeL: number;
  slopeR: number;
  bottom: [number, number];
  curve: [number, number][];
  /** pixels por milímetro na altura do colo */
  pxPerMm: number;
}

const W = 1856;
const H = 2304;

export const neck: Record<'gold' | 'silver', NeckGeometry> = {
  gold: {
    width: W,
    height: H,
    cutL: [696, 1143.4],
    cutR: [1176, 1144.4],
    slopeL: 1.569,
    slopeR: -1.557,
    bottom: [936, 1318.0],
    curve: [
      [696, 1143.4], [720, 1178.9], [744, 1210.1], [768, 1237.0], [792, 1259.6], [816, 1278.2],
      [840, 1292.9], [864, 1304.1], [888, 1311.9], [912, 1316.5], [936, 1318.0], [960, 1316.4],
      [984, 1311.8], [1008, 1304.0], [1032, 1292.8], [1056, 1278.1], [1080, 1259.6], [1104, 1237.2],
      [1128, 1210.6], [1152, 1179.7], [1176, 1144.4],
    ],
    pxPerMm: 8.4,
  },
  silver: {
    width: W,
    height: H,
    cutL: [704, 1162.1],
    cutR: [1184, 1139.0],
    slopeL: 1.52,
    slopeR: -1.741,
    bottom: [944, 1321.9],
    curve: [
      [704, 1162.1], [728, 1196.2], [752, 1225.6], [776, 1250.3], [800, 1270.8], [824, 1287.2],
      [848, 1300.1], [872, 1309.8], [896, 1316.6], [920, 1320.6], [944, 1321.9], [968, 1320.6],
      [992, 1316.4], [1016, 1309.1], [1040, 1298.3], [1064, 1283.7], [1088, 1264.7], [1112, 1241.0],
      [1136, 1212.3], [1160, 1178.2], [1184, 1139.0],
    ],
    pxPerMm: 8.4,
  },
};

/** y da corrente original em x (interpolação linear entre amostras). */
export function curveY(g: NeckGeometry, x: number): number {
  const c = g.curve;
  if (x <= c[0][0]) return c[0][1] + (x - c[0][0]) * g.slopeL;
  if (x >= c[c.length - 1][0]) return c[c.length - 1][1] + (x - c[c.length - 1][0]) * g.slopeR;
  for (let i = 1; i < c.length; i++) {
    if (x <= c[i][0]) {
      const t = (x - c[i - 1][0]) / (c[i][0] - c[i - 1][0]);
      return c[i - 1][1] + t * (c[i][1] - c[i - 1][1]);
    }
  }
  return c[c.length - 1][1];
}
