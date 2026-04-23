import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const root = path.resolve(process.cwd())
const input = path.join(root, 'assets', 'favicon-source.png')
const outDir = path.join(root, 'public')

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true })
}

const writePng = async (size, filename) => {
  const outPath = path.join(outDir, filename)
  await sharp(input)
    .resize(size, size, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(outPath)
}

await ensureDir(outDir)

await writePng(16, 'favicon-16x16.png')
await writePng(32, 'favicon-32x32.png')
await writePng(180, 'apple-touch-icon.png')
await writePng(192, 'android-chrome-192x192.png')
await writePng(512, 'android-chrome-512x512.png')

const icoPngBuffers = await Promise.all(
  [16, 32, 48].map(async (s) => sharp(input).resize(s, s, { fit: 'cover' }).png().toBuffer()),
)
const icoBuffer = await pngToIco(icoPngBuffers)
await fs.writeFile(path.join(outDir, 'favicon.ico'), icoBuffer)

console.log('Favicons generated in', outDir)

