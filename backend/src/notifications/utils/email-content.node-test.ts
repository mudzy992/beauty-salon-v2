import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDefaultEmailTemplateHtml,
  escapeEmailHtml,
  renderCampaignEmailHtml,
  resolveSafeEmailHref,
  sanitizeCampaignEmailHtml,
} from './email-content';

void test('escapes admin-template text before placing it in HTML contexts', () => {
  assert.equal(
    escapeEmailHtml(`<img src=x onerror="alert(1)"> & 'quoted'`),
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;quoted&#39;',
  );
});

void test('escapes every dynamic value in the default email template and drops unsafe CTA URLs', () => {
  const html = buildDefaultEmailTemplateHtml({
    title: '<img src=x onerror="alert(1)">',
    intro: '<script>alert(1)</script>',
    body: '<svg onload="alert(1)">',
    ctaLabel: 'Click <img>',
    ctaUrl: 'https://salon.example',
    codeBlock: '" onmouseover="alert(1)',
    signature: '<strong>Fake salon</strong>',
  });

  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&lt;svg onload=&quot;alert\(1\)&quot;&gt;/);
  assert.match(
    html,
    /href="https:\/\/salon\.example\/"[^>]*>Click &lt;img&gt;/,
  );
  assert.match(html, /&quot; onmouseover=&quot;alert\(1\)/);
  assert.match(html, /&lt;strong&gt;Fake salon&lt;\/strong&gt;/);
  assert.doesNotMatch(html, /<img|<script|<svg|<strong|javascript:/i);

  const unsafeCta = buildDefaultEmailTemplateHtml({
    title: 'Title',
    intro: 'Intro',
    body: 'Body',
    ctaLabel: 'Open',
    ctaUrl: 'javascript:alert(1)',
  });
  assert.doesNotMatch(unsafeCta, /href=/i);
});

void test('allows only safe absolute action URL protocols without credentials', () => {
  assert.equal(
    resolveSafeEmailHref('https://salon.example/reset?a=1&b=2'),
    'https://salon.example/reset?a=1&b=2',
  );
  assert.equal(
    resolveSafeEmailHref('mailto:salon@example.test'),
    'mailto:salon@example.test',
  );
  assert.equal(resolveSafeEmailHref('javascript:alert(1)'), null);
  assert.equal(resolveSafeEmailHref('https://user:pass@salon.example/'), null);
  assert.equal(resolveSafeEmailHref('/relative/path'), null);
});

void test('campaign HTML strips active tags, event attributes, and unsafe URLs', () => {
  const sanitized = sanitizeCampaignEmailHtml(
    '<div><script>alert(1)</script><p onclick="alert(1)">Offer</p><a href="javascript:alert(1)">unsafe link</a><img src="data:image/svg+xml,<svg onload=alert(1)>" onerror="alert(1)"></div>',
  );

  assert.match(sanitized, /<p>Offer<\/p>/);
  assert.match(sanitized, /<a rel="noreferrer noopener">unsafe link<\/a>/);
  assert.doesNotMatch(
    sanitized,
    /<script|onclick|onerror|javascript:|data:image/i,
  );
});

void test('campaign placeholders cannot inject markup and unsafe URLs lose their href', () => {
  const injectedName = '<img src=x onerror="alert(1)">';
  const html = renderCampaignEmailHtml(
    '<p>Hello {{ firstName }}</p><a href="{{appUrl}}">Open</a>',
    {
      firstName: injectedName,
      lastName: '',
      username: '',
      email: '',
      appUrl: 'javascript:alert(1)',
    },
  );

  assert.match(html, /&lt;img src=x onerror="alert\(1\)"&gt;/);
  assert.match(html, /<a rel="noreferrer noopener">Open<\/a>/);
  assert.doesNotMatch(html, /<(?:img|script)\b|javascript:/i);
});

void test('campaign styling is limited to a harmless inline CSS allowlist', () => {
  const sanitized = sanitizeCampaignEmailHtml(
    '<p style="color:#2d1f1c;margin:0 auto;background-image:url(https://evil.test/x);position:fixed">Text</p>',
  );

  assert.match(sanitized, /color:#2d1f1c/i);
  assert.doesNotMatch(sanitized, /background-image|position:fixed|url\(/i);
});
