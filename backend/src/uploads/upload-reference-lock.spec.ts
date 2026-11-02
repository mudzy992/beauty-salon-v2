import { uploadPathsInReferences } from './upload-reference-lock';

describe('upload reference path extraction', () => {
  it('finds local storage paths in scalar values and embedded content', () => {
    expect(
      uploadPathsInReferences([
        'private/avatars/client-thumb.webp',
        '<img src="/uploads/public/blog/hero.webp">',
        'https://cdn.example.test/uploads/public/brand/logo.svg',
      ]),
    ).toEqual([
      'private/avatars/client-thumb.webp',
      'public/blog/hero.webp',
      'public/brand/logo.svg',
    ]);
  });

  it('does not mistake unrelated external paths for local uploads', () => {
    expect(
      uploadPathsInReferences([
        'https://cdn.example.test/public/brand/logo.svg',
        'https://example.test/private/files/document.pdf',
      ]),
    ).toEqual([]);
  });
});
