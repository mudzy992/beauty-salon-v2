/**
 * Jezici u kojima članak bloga može biti napisan.
 *
 * WCAG 3.1.2 (Language of Parts, AA) traži da jezik svakog odlomka bude programski
 * odredljiv. Bez ovog polja javna stranica ne može izdati `lang` na sadržaju članka,
 * pa čitač ekrana čita engleski tekst bosanskom izgovorom (i obrnuto).
 *
 * `DEFAULT_BLOG_POST_LANGUAGE` je jezik sajta (`frontend/index.html` → `<html lang="bs">`).
 */
export const BLOG_POST_LANGUAGES = ['bs', 'en'] as const;

export type BlogPostLanguage = (typeof BLOG_POST_LANGUAGES)[number];

export const DEFAULT_BLOG_POST_LANGUAGE: BlogPostLanguage = 'bs';
