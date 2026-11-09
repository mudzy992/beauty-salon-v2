import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const reviews = read('../../pages/Reviews.tsx')
const gallery = read('../../pages/Gallery.tsx')
const blog = read('../../pages/Blog.tsx')
const postsTable = read('../blog/blog-posts-table.tsx')
const postForm = read('../blog/blog-post-form-dialog.tsx')
const seoFields = read('../blog/blog-post-seo-fields.tsx')
const commentsDialog = read('../blog/blog-comments-dialog.tsx')
const css = read('../../index.css')

// ---------------------------------------------------------------------------
// Faza 9 — Sadržaj: Blog / Galerija / Recenzije (1623 linije, 10 admin fajlova)
//
// 4.1.2: 2 <Switch> bez pristupačnog imena.
// 1.3.1: 6 <Label> bez htmlFor u Gallery — inputi ostali bez imena.
// 1.1.1: Stars renderuje 5 aria-hidden ikona; u tabeli NIJE bilo brojčanog
//        ekvivalenta, pa su ćelije ocjena za čitač ekrana bile prazne.
// 1.3.1/1.4.10: 2 tabele, 15 <th>, 0 scope, 0 caption, 0 data-label.
// ---------------------------------------------------------------------------

const ALL = { 'Reviews.tsx': reviews, 'Gallery.tsx': gallery, 'Blog.tsx': blog,
  'blog-posts-table.tsx': postsTable, 'blog-post-form-dialog.tsx': postForm,
  'blog-post-seo-fields.tsx': seoFields, 'blog-comments-dialog.tsx': commentsDialog }

test('svaki Switch ima pristupačno ime (4.1.2)', () => {
  let total = 0
  for (const [name, src] of Object.entries(ALL)) {
    for (const m of src.matchAll(/<Switch\b[\s\S]*?\/>/g)) {
      total += 1
      assert.match(m[0], /aria-label=\{t\(/, `${name}: Switch bez aria-label`)
    }
  }
  assert.equal(total, 2, 'ukupno 2 Switch kontrole u modulu')
})

test('svaki <Label> je programski povezan s kontrolom (1.3.1)', () => {
  let total = 0
  for (const [name, src] of Object.entries(ALL)) {
    for (const m of src.matchAll(/<Label\b([^>]*)>/g)) {
      total += 1
      if (/htmlFor=/.test(m[1])) continue
      // dozvoljeno ako omota kontrolu
      const end = src.indexOf('</Label>', m.index + m[0].length)
      const inner = end === -1 ? '' : src.slice(m.index + m[0].length, end)
      assert.match(inner, /<(Input|Select|Textarea|Switch|Checkbox)\b/,
        `${name}: <Label> bez htmlFor i bez ugnijezdene kontrole`)
    }
  }
  // Reviews/Blog/posts-table/comments-dialog nemaju <Label> (koriste Badge,
  // dugmad s tekstom i role="img"). Ukupno 15, svih 15 asocirano.
  // 2026-11-09: +1 za `blog.admin.language` (selektor jezika članka, WCAG 3.1.2).
  assert.equal(total, 15, `očekivano 15 <Label>, nađeno ${total}`)
})

test('Gallery: 6 polja u dijalozima ima htmlFor/id par (1.3.1)', () => {
  const ids = ['gallery-category-name', 'gallery-category-description',
    'gallery-category-sort-order', 'gallery-image-title',
    'gallery-image-description', 'gallery-image-sort-order']
  for (const id of ids) {
    assert.equal((gallery.match(new RegExp(`htmlFor="${id}"`, 'g')) || []).length, 1,
      `${id}: htmlFor nije jedinstven`)
    assert.equal((gallery.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1,
      `${id}: id nije jedinstven`)
  }
})

test('Stars ima tekstualnu alternativu (1.1.1)', () => {
  // Ikone su aria-hidden; bez role="img" + aria-label tabela ne bi imala
  // nikakav tekst za ocjenu (detaljni panel ga je imao, tabela nije).
  assert.match(reviews, /role="img"/)
  assert.match(reviews, /aria-label=\{t\('reviews\.aria\.ratingValue'/)
  assert.match(reviews, /value: formatLocalizedNumber\(count, i18n\.language\)/)
  // ikone moraju ostati dekorativne
  assert.match(reviews, /aria-hidden="true"/)
})

test('SEO sekcija je fieldset/legend, ne div s naslovom (1.3.1)', () => {
  // Sekcija je vizuelno izdvojena (okvir + naslov), pa mora biti i programski.
  assert.match(seoFields, /import \{ FormSection \} from '\.\.\/shell\/admin\/ui\/form-section'/)
  assert.match(seoFields, /<FormSection title="SEO" description=\{t\('blog\.admin\.seoHint'\)\}>/)
  assert.match(seoFields, /<\/FormSection>/)
  assert.equal(/<p className="text-sm font-medium[^"]*">SEO<\/p>/.test(seoFields), false,
    'naslov grupe ne smije ostati običan <p>')
})

test('obje tabele imaju scope i caption (1.3.1)', () => {
  let thTotal = 0
  let capTotal = 0
  for (const [name, src] of [['Reviews.tsx', reviews], ['blog-posts-table.tsx', postsTable]]) {
    const ths = src.match(/<th\b[^>]*>/g) || []
    thTotal += ths.length
    assert.deepEqual(ths.filter((h) => !/scope="col"/.test(h)), [], `${name}: <th> bez scope`)
    capTotal += (src.match(/<caption className="sr-only">\{t\('[^']+'\)\}<\/caption>/g) || []).length
  }
  assert.equal(thTotal, 15, 'ukupno 15 <th> u modulu')
  assert.equal(capTotal, 2, '2 tabele -> 2 <caption>')
})

test('obje tabele opt-in u card mode (1.4.10)', () => {
  for (const [name, src] of [['Reviews.tsx', reviews], ['blog-posts-table.tsx', postsTable]]) {
    for (const t of src.match(/<table className="[^"]*"/g) || []) {
      assert.match(t, /data-table/, `${name}: tabela bez data-table klase`)
    }
    const tds = src.match(/<td\b[^>]*>/g) || []
    const span = tds.filter((t) => /colSpan=/.test(t))
    const labelled = tds.filter((t) => /data-label=\{t\(/.test(t))
    assert.equal(labelled.length + span.length, tds.length,
      `${name}: <td> bez data-label (${tds.length} ukupno, ${labelled.length} label, ${span.length} colSpan)`)
    assert.equal(tds.filter((t) => /data-label="/.test(t)).length, 0,
      `${name}: data-label ne smije biti hardkodovan literal`)
  }
  assert.match(css, /table\.data-table tbody td::before/)
})

test('D4 iz plana NIJE prekršaj — nema drag-only uploada (2.5.7)', () => {
  // Plan je tražio "upload zona → native input, bez obaveznog drag&drop-a".
  // U modulu uopšte nema drag&drop-a: oba uploada su već native <input type="file">.
  for (const [name, src] of Object.entries(ALL)) {
    assert.equal(/onDrop=/.test(src), false, `${name}: pojavio se onDrop`)
  }
  assert.match(gallery, /type="file"/)
  assert.match(postForm, /type="file"/)
  assert.match(gallery, /htmlFor="gallery-manual-file"/, 'gallery upload mora ostati asociran')
})

test('D5 iz plana NIJE prekršaj — svaka slika ima alt (1.1.1)', () => {
  let total = 0
  for (const [name, src] of Object.entries(ALL)) {
    for (const m of src.matchAll(/<(img|MediaImage)\b[\s\S]*?\/>/g)) {
      total += 1
      // Granica je obavezna: /alt=/ bi prošao i na 'data-alt='.
      assert.match(m[0], /(^|\s)alt=/, `${name}: slika bez alt`)
    }
  }
  assert.equal(total, 3, 'ukupno 3 slike u admin dijelu modula')
})

test('D7 iz plana NIJE prekršaj — status badge nosi tekst, ne samo boju (1.4.1)', () => {
  assert.match(reviews, /<Badge variant="success">\{t\('reviews\.approved'\)\}<\/Badge>/)
  assert.match(reviews, /<Badge variant="danger">\{t\('reviews\.rejected'\)\}<\/Badge>/)
  assert.match(reviews, /<Badge variant="warning">\{t\('reviews\.pending'\)\}<\/Badge>/)
})
