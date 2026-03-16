/**
 * Generiše URL‑slug iz naslova (bosanski/latinica: zamjena dijakritika, mala slova, crtice).
 */
export function slugify(title: string): string {
  const from = 'čćžšđžČĆŽŠĐŽ';
  const to = 'cczsdzCCZSDZ';
  let s = title.trim();
  for (let i = 0; i < from.length; i++) {
    s = s.replace(new RegExp(from[i], 'g'), to[i]);
  }
  return (
    s
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'post'
  );
}
