/**
 * WCAG 3.1.2 — Language of Parts (AA).
 *
 * Članak bloga može biti napisan na jeziku koji nije jezik stranice. Bez `lang`
 * atributa čitač ekrana primjenjuje fonetiku jezika stranice na cijeli članak,
 * pa engleski tekst na bosanskoj stranici zvuči nerazumljivo (i obrnuto).
 *
 * Backend čuva jezik u `blog_posts.language` (default `'bs'`, jezik sajta iz
 * `frontend/index.html` → `<html lang="bs">`). Ova funkcija normalizuje vrijednost
 * i vraća sigurnu zamjenu ako API vrati nešto neočekivano (npr. stari keš).
 */
export const BLOG_POST_LANGUAGES = ['bs', 'en'] as const

export type BlogPostLanguage = (typeof BLOG_POST_LANGUAGES)[number]

export const DEFAULT_BLOG_POST_LANGUAGE: BlogPostLanguage = 'bs'

export const blogPostLang = (post: { language?: string | null }): BlogPostLanguage => {
  // `typeof` provjera je namjerna: tip kaže `string | null`, ali vrijednost stiže s
  // API-ja i test je pokazao da bi broj bacio TypeError u `.toLowerCase()`.
  const raw = typeof post.language === 'string' ? post.language : ''
  const base = raw.toLowerCase().split('-')[0]
  return (BLOG_POST_LANGUAGES as readonly string[]).includes(base)
    ? (base as BlogPostLanguage)
    : DEFAULT_BLOG_POST_LANGUAGE
}
