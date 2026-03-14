import { slugify } from './slug.utils';

describe('slug.utils', () => {
  it('generiše slug iz naslova', () => {
    expect(slugify('Novi članak')).toBe('novi-clanak');
    expect(slugify('Šišanje i brijanje')).toBe('sisanje-i-brijanje');
  });
  it('uklanja višestruke crtice i trim', () => {
    expect(slugify('  nešto   sa   razmacima  ')).toBe('nesto-sa-razmacima');
  });
  it('vraća "post" za prazan string nakon čišćenja', () => {
    expect(slugify('!!!')).toBe('post');
  });
});
