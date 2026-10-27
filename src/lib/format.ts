const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

/** $499 */
export function money(n: number): string {
  return mxn.format(n).replace(/\s?MXN/, '');
}

/** $499 MXN */
export function moneyMxn(n: number): string {
  return `${money(n)} MXN`;
}
