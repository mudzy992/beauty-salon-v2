import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const screen = readFileSync(new URL('./BlogListScreen.tsx', import.meta.url), 'utf8');
const translations = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8');

test('blog list validates paginated responses and ignores stale requests', () => {
  assert.match(screen, /api\.get<unknown>\('\/api\/blog'/);
  assert.match(screen, /normalizeBlogPage\(data, PAGE_SIZE, offset\)/);
  assert.match(screen, /generation !== requestGeneration\.current/);
  assert.match(screen, /requestGeneration\.current \+= 1/);
  assert.match(screen, /catch \{\s*if \(generation === requestGeneration\.current\) setLoadError\(true\)/);
  assert.doesNotMatch(screen, /catch \{\s*if \(!append\)\s*\{\s*setPosts\(\[\]\)/);
});

test('blog list differentiates empty, initial error, stale data and retry states', () => {
  assert.match(screen, /loadError && posts\.length > 0/);
  assert.match(screen, /blog\.staleMessage/);
  assert.match(screen, /blog\.loadErrorMessage/);
  assert.match(screen, /actionLabel=\{t\('common\.retry'\)\}/);
  assert.match(screen, /await fetchPosts\(0, false\);\s*\} finally \{\s*setRefreshing\(false\)/);
  for (const key of ['loadErrorTitle', 'loadErrorMessage', 'staleMessage']) {
    assert.match(translations, new RegExp(`blog:[\\s\\S]*?${key}:`));
  }
});
