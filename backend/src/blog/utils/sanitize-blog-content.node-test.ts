import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeBlogContent } from './sanitize-blog-content';

void test('preserves common safe editorial markup and local media', () => {
  const sanitized = sanitizeBlogContent(
    '<h2>Naslov</h2><p><strong>Važno</strong> i <em>istaknuto</em>. ' +
      '<a href="https://example.com" title="Link">Pročitaj</a>' +
      '<br><img src="/uploads/blog-photo.jpg" alt="Fotografija"></p>',
  );

  assert.ok(sanitized.includes('<h2>Naslov</h2>'));
  assert.ok(sanitized.includes('<strong>Važno</strong>'));
  assert.ok(sanitized.includes('<em>istaknuto</em>'));
  assert.ok(sanitized.includes('href="https://example.com"'));
  assert.ok(sanitized.includes('src="/uploads/blog-photo.jpg"'));
  assert.ok(sanitized.includes('alt="Fotografija"'));
});

void test('removes scripts, SVG/iframe active content, event handlers and unsafe URLs', () => {
  const sanitized = sanitizeBlogContent(
    '<p onclick="alert(1)" style="color:red">Tekst' +
      '<a href="javascript:alert(1)" onmouseover="alert(2)">link</a></p>' +
      '<script>alert(3)</script><iframe src="https://evil.example"></iframe>' +
      '<svg onload="alert(4)"><script>alert(5)</script></svg>' +
      '<img src="data:image/svg+xml,<svg onload=alert(6)>" onerror="alert(7)">' +
      '<meta http-equiv="refresh" content="0;url=javascript:alert(8)">' +
      '<noscript><p onclick="alert(9)">fallback</p></noscript>' +
      '</textarea/><script>alert(10)</script>',
  );

  assert.ok(sanitized.includes('<p>Tekst<a>link</a></p>'));
  assert.doesNotMatch(sanitized, /<\/?(?:script|iframe|svg)\b/i);
  assert.doesNotMatch(sanitized, /\son\w+\s*=/i);
  assert.doesNotMatch(sanitized, /javascript:|data:image/i);
  assert.ok(!sanitized.includes('style='));
});
