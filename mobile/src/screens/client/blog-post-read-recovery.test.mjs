import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const screen = readFileSync(new URL('./BlogPostScreen.tsx', import.meta.url), 'utf8');
const translations = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8');

test('blog detail runtime-validates article reads and rejects stale route responses', () => {
  assert.match(screen, /api\.get<unknown>\(`\/api\/blog\/slug\/\$\{requestedSlug\}`\)/);
  assert.match(screen, /normalizeBlogPost\(data\)/);
  assert.match(screen, /normalized\.slug !== requestedSlug/);
  assert.match(screen, /if \(!normalized\.isPublished\)/);
  assert.match(screen, /generation !== postRequestGeneration\.current/);
  assert.match(screen, /postRequestGeneration\.current \+= 1/);
  assert.match(screen, /postState\?\.slug === slug/);
});

test('comment reads validate legacy and paginated responses and preserve recoverable state', () => {
  assert.match(screen, /api\.get<unknown>\([\s\S]*?\/api\/blog\/\$\{postId\}\/comments/);
  assert.match(screen, /normalizeBlogCommentPage\(data, COMMENT_PAGE_SIZE, offset\)/);
  assert.match(screen, /commentRequestGeneration\.current/);
  assert.match(screen, /commentsErrorPostId === post\.id/);
  assert.match(screen, /comments\.length > 0 \? t\('blog\.commentsStaleMessage'\)/);
  assert.doesNotMatch(screen, /setComments\(\[\]\)/);
});

test('blog article and comment failures expose localized retry paths', () => {
  assert.match(screen, /actionLabel=\{postLoadError \? t\('common\.retry'\)/);
  assert.match(screen, /onRefresh=\{\(\) => void fetchPost\(slug\)\}/);
  assert.match(screen, /onPress=\{\(\) => void loadPublicComments\(post\.id, 0, false\)\}/);
  for (const key of ['postLoadErrorTitle', 'postLoadErrorMessage', 'postStaleMessage', 'commentsLoadErrorTitle', 'commentsLoadErrorMessage', 'commentsStaleMessage']) {
    assert.match(translations, new RegExp(`blog:[\\s\\S]*?${key}:`));
  }
});
