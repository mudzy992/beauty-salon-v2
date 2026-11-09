import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8')

const blogPostPage = read('../../pages/public/PublicBlogPost.tsx')
const blogListPage = read('../../pages/public/PublicBlogList.tsx')
const formDialog = read('./blog-post-form-dialog.tsx')
const formValues = read('./blog-post-form.ts')
const types = read('./types.ts')
const postParser = read('./public-blog-post-data.mjs')
const listParser = read('./public-blog-list-data.mjs')
const postParserTypes = read('./public-blog-post-data.d.mts')
const listParserTypes = read('./public-blog-list-data.d.mts')

// frontend/src/features/blog -> repo root
const schema = read('../../../../backend/prisma/schema.prisma')
const migration = read(
  '../../../../backend/prisma/migrations/20261109220000_blog_post_language/migration.sql',
)
const createDto = read('../../../../backend/src/blog/dto/create-blog-post.dto.ts')
const updateDto = read('../../../../backend/src/blog/dto/update-blog-post.dto.ts')
const blogService = read('../../../../backend/src/blog/blog.service.ts')

/**
 * WCAG 3.1.2 — Language of Parts (AA).
 *
 * Članak bloga može biti na jeziku koji nije jezik stranice. Bez `lang` atributa
 * čitač ekrana čita engleski članak bosanskom fonetikom (i obrnuto), jer
 * `document.documentElement.lang` opisuje jezik **sučelja**, ne jezik članka.
 *
 * Prije ove izmjene `blog_posts` uopšte nije imao polje za jezik, pa je jezik
 * sadržaja bio neodrediv — matrica je zato držala 3.1.2 kao ❌.
 */

test('blogPostLang normalizuje jezik i vraća sigurnu zamjenu', async () => {
  // Importuje se STVARNI modul (Node 22 skida TS tipove), ne prepričana logika.
  const { blogPostLang, BLOG_POST_LANGUAGES, DEFAULT_BLOG_POST_LANGUAGE } = await import(
    './blog-language.ts'
  )

  assert.deepEqual([...BLOG_POST_LANGUAGES], ['bs', 'en'])
  assert.equal(DEFAULT_BLOG_POST_LANGUAGE, 'bs')

  assert.equal(blogPostLang({ language: 'bs' }), 'bs')
  assert.equal(blogPostLang({ language: 'en' }), 'en')
  // Regionalni podtagovi se normalizuju na osnovni jezik.
  assert.equal(blogPostLang({ language: 'en-GB' }), 'en')
  assert.equal(blogPostLang({ language: 'bs-BA' }), 'bs')
  assert.equal(blogPostLang({ language: 'EN' }), 'en')
  // Nedostajuće, prazno i nepoznato pada na jezik sajta.
  assert.equal(blogPostLang({}), 'bs')
  assert.equal(blogPostLang({ language: null }), 'bs')
  assert.equal(blogPostLang({ language: '' }), 'bs')
  assert.equal(blogPostLang({ language: 'de' }), 'bs')
  assert.equal(blogPostLang({ language: 42 }), 'bs')
})

test('javna stranica članka izdaje lang na naslovu i sadržaju (3.1.2)', () => {
  assert.match(blogPostPage, /import \{ blogPostLang \} from '\.\.\/\.\.\/features\/blog\/blog-language'/)

  // <h1> nosi jezik članka.
  assert.match(
    blogPostPage,
    /<h1\s+lang=\{blogPostLang\(post\)\}/,
    'naslov članka mora imati lang={blogPostLang(post)}',
  )
  // Sadržaj (dangerouslySetInnerHTML) nosi jezik članka.
  const content = blogPostPage.match(/<div\s+lang=\{blogPostLang\(post\)\}[\s\S]*?dangerouslySetInnerHTML/)
  assert.ok(content, 'kontejner sadržaja mora imati lang prije dangerouslySetInnerHTML')

  // Pozitivna kontrola: bez lang asertacija iznad pada.
  assert.ok(
    !/<h1 className="text-3xl/.test(blogPostPage),
    'kontrola: stari <h1> bez lang više ne postoji',
  )
})

test('javna lista blogova izdaje lang na naslovu i sažetku (3.1.2)', () => {
  assert.match(blogListPage, /import \{ blogPostLang \} from '\.\.\/\.\.\/features\/blog\/blog-language'/)
  assert.match(blogListPage, /<h2\s+lang=\{blogPostLang\(p\)\}/, 'naslov kartice')
  assert.match(blogListPage, /<p lang=\{blogPostLang\(p\)\}/, 'sažetak kartice')
})

test('admin forma čuva jezik članka', () => {
  assert.match(formDialog, /id="blog-language"/)
  assert.match(formDialog, /<Label htmlFor="blog-language">\{t\('blog\.admin\.language'\)\}<\/Label>/)
  assert.match(formDialog, /BLOG_POST_LANGUAGES\.map/, 'opcije dolaze iz zajedničke liste')
  assert.match(formDialog, /onChange=\{\(e\) => onChange\(\{ language:/)

  // Forma šalje jezik, a prazan obrazac i postojeći članak ga imaju.
  assert.match(formValues, /language: DEFAULT_BLOG_POST_LANGUAGE/)
  assert.match(formValues, /language: post\.language \|\| DEFAULT_BLOG_POST_LANGUAGE/)
  assert.match(formValues, /language: form\.language/)

  assert.match(types, /language: string/, 'BlogPost/BlogPostFormValues moraju imati language')
})

test('parse sloj propušta i validira language', () => {
  assert.match(postParser, /!isOptionalString\(payload\.language\)/)
  assert.match(listParser, /isOptionalString\(value\.language\)/)
  assert.match(postParserTypes, /language\?: string \| null/)
  assert.match(listParserTypes, /language\?: string \| null/)
})

test('backend čuva jezik: šema, migracija, DTO validacija, servis', () => {
  // Šema
  const model = schema.match(/model BlogPost \{[\s\S]*?\n\}/)
  assert.ok(model, 'model BlogPost mora postojati')
  assert.match(
    model[0],
    /language\s+String\s+@default\("bs"\)\s+@db\.VarChar\(8\)/,
    'BlogPost.language mora biti String s defaultom bs',
  )

  // Migracija
  assert.match(migration, /ALTER TABLE "blog_posts"/)
  assert.match(
    migration,
    /ADD COLUMN "language" VARCHAR\(8\) NOT NULL DEFAULT 'bs'/,
    'postojeći redovi moraju dobiti bs (jezik sajta)',
  )

  // DTO validacija — bez @IsIn bi prošla bilo koja vrijednost
  for (const [name, dto] of [['create', createDto], ['update', updateDto]]) {
    assert.match(dto, /@IsIn\(BLOG_POST_LANGUAGES\)/, `${name} DTO mora validirati jezik`)
    assert.match(dto, /language\?: string/, `${name} DTO mora imati language`)
  }

  // Servis: create postavlja default, update prosljeđuje, select liste ga vraćaju
  assert.match(blogService, /language: dto\.language \?\? DEFAULT_BLOG_POST_LANGUAGE/)
  assert.match(blogService, /\.\.\.\(dto\.language !== undefined && \{ language: dto\.language \}\)/)
  assert.equal(
    (blogService.match(/^\s*language: true,$/gm) || []).length,
    2,
    'i PUBLIC_BLOG_LIST_SELECT i PUBLIC_BLOG_DETAIL_SELECT moraju vraćati language',
  )
})
