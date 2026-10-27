export const mxStates = [
  'Aguascalientes',
  'Baja California',
  'Baja California Sur',
  'Campeche',
  'Chiapas',
  'Chihuahua',
  'Ciudad de México',
  'Coahuila',
  'Colima',
  'Durango',
  'Estado de México',
  'Guanajuato',
  'Guerrero',
  'Hidalgo',
  'Jalisco',
  'Michoacán',
  'Morelos',
  'Nayarit',
  'Nuevo León',
  'Oaxaca',
  'Puebla',
  'Querétaro',
  'Quintana Roo',
  'San Luis Potosí',
  'Sinaloa',
  'Sonora',
  'Tabasco',
  'Tamaulipas',
  'Tlaxcala',
  'Veracruz',
  'Yucatán',
  'Zacatecas',
] as const;

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/** Converte o nome de estado devolvido pela API de CP para a lista oficial. */
export function matchState(raw: string): string | undefined {
  const r = norm(raw);
  if (r.includes('distrito federal') || r.includes('ciudad de mexico')) return 'Ciudad de México';
  if (r === 'mexico' || r.startsWith('estado de mexico')) return 'Estado de México';
  // ex.: "Veracruz de Ignacio de la Llave" -> "Veracruz"; escolhe o prefixo mais longo
  // para não confundir "Baja California Sur" com "Baja California".
  const hits = mxStates.filter((s) => r.startsWith(norm(s)));
  return hits.sort((a, b) => b.length - a.length)[0];
}
