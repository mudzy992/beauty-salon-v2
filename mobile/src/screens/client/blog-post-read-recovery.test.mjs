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

test('optional public settings ignore late responses after another refresh or unmount', () => {
  assert.match(screen, /publicSettingsGeneration = useRef\(0\)/);
  assert.match(screen, /publicSettingsMounted = useRef\(false\)/);
  assert.match(screen, /if \(!publicSettingsMounted\.current\) return/);
  assert.match(screen, /const generation = \+\+publicSettingsGeneration\.current/);
  assert.match(screen, /publicSettingsMounted\.current && generation === publicSettingsGeneration\.current\) setSettings\(items\)/);
  assert.match(screen, /publicSettingsMounted\.current = false/);
  assert.match(screen, /publicSettingsGeneration\.current \+= 1/);
});

test('comment submission remains bound to the active user, article route, and mounted screen', () => {
  assert.match(screen, /commentActionIdentityRef = useRef\(\{ userId, slug, generation: 0, mounted: true \}\)/);
  assert.match(screen, /commentActionIdentityRef\.current\.userId !== userId \|\| commentActionIdentityRef\.current\.slug !== slug/);
  assert.match(screen, /current\.mounted &&[\s\S]*current\.userId === userId[\s\S]*current\.slug === slug[\s\S]*currentCommentPostIdRef\.current === postId[\s\S]*useAuthStore\.getState\(\)\.user\?\.id === userId/);
  assert.match(screen, /await api\.post\(`\/api\/blog\/\$\{postId\}\/comments`[\s\S]*?if \(!isCurrentAction\(\)\) return;/);
  assert.match(screen, /if \(isCurrentAction\(\)\) Alert\.alert\(t\('blog\.commentErrorTitle'/);
  assert.match(screen, /finally \{\s*const shouldUpdateCurrentAction = isCurrentAction\(\);\s*if \(activeCommentActionRef\.current === token\) activeCommentActionRef\.current = null;\s*if \(shouldUpdateCurrentAction\) setSubmittingComment\(false\);/);
  assert.match(screen, /\}, \[userId, slug\]\)/);
});

test('blog article and comment failures expose localized retry paths', () => {
  assert.match(screen, /actionLabel=\{postLoadError \? t\('common\.retry'\)/);
  assert.match(screen, /onRefresh=\{\(\) => void fetchPost\(slug\)\}/);
  assert.match(screen, /onPress=\{\(\) => void loadPublicComments\(post\.id, 0, false\)\}/);
  for (const key of ['postLoadErrorTitle', 'postLoadErrorMessage', 'postStaleMessage', 'commentsLoadErrorTitle', 'commentsLoadErrorMessage', 'commentsStaleMessage']) {
    assert.match(translations, new RegExp(`blog:[\\s\\S]*?${key}:`));
  }
});
