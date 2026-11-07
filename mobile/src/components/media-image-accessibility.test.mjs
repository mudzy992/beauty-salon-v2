import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const mediaImage = read('./MediaImage.tsx')

const decorativeCallSites = [
  ['../screens/client/HomeScreen.tsx', 3],
  ['../screens/client/ServicesScreen.tsx', 1],
  ['../screens/client/BlogListScreen.tsx', 1],
  ['../screens/auth/LoginScreen.tsx', 1],
  ['../screens/client/ProfileScreen.tsx', 1],
  ['../screens/client/EditProfileScreen.tsx', 1],
]

test('decorative media opts out of native accessibility and gets an empty web alt', () => {
  assert.match(mediaImage, /export const DecorativeMediaImage\s*=\s*\(props: MediaImageProps\)\s*=>\s*\(\s*<MediaImage\s+\{\.\.\.props\}\s+accessible=\{false\}\s+accessibilityLabel=""\s*\/>\s*\)/)
  assert.match(mediaImage, /<DecorativeMediaImage uri=\{uri\} style=\{\[StyleSheet\.absoluteFill, imageStyle\]\} \/>/)
})

test('text-supported mobile image contexts explicitly use the decorative wrapper', () => {
  for (const [path, expectedCount] of decorativeCallSites) {
    const source = read(path)
    assert.match(source, /import \{[^}]*DecorativeMediaImage[^}]*\} from ['"]\.\.\/\.\.\/components\/MediaImage['"]/)
    const count = [...source.matchAll(/<DecorativeMediaImage\b/g)].length
    assert.equal(count, expectedCount, `${path} should explicitly classify ${expectedCount} image(s) as decorative`)
  }
  assert.match(read('../screens/client/ProfileScreen.tsx'), /<DecorativeMediaImage uri=\{getImageUrl\(user\?\.avatar\)\} style=\{styles\.avatarImage\} \/>/)
  assert.match(read('../screens/client/EditProfileScreen.tsx'), /<DecorativeMediaImage uri=\{getImageUrl\(user\?\.avatar\)\} style=\{styles\.avatarImage\} \/>/)
})
