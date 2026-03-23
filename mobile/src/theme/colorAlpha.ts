/** Build rgba() from #RRGGBB for gradients (e.g. hero blend into app background). */
export function colorWithAlpha(hex: string, alpha: number): string {
  const c = hex.replace('#', '').trim();
  if (c.length !== 6) return hex;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
