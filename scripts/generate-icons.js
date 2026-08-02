import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const outDir = path.join(__dirname, '..', 'public')
const preferredPng = path.join(outDir, 'ak-ico.png')
const legacyPng = path.join(outDir, 'ak-logo.png')
const fallbackSvg = path.join(outDir, 'favicon.svg')

const input = fs.existsSync(preferredPng)
    ? preferredPng
    : fs.existsSync(legacyPng)
        ? legacyPng
        : fallbackSvg
if (!fs.existsSync(input)) {
    console.error('No source image found. Place your PNG at public/ak-ico.png or public/ak-logo.png, or ensure public/favicon.svg exists.')
    process.exit(2)
}

const sizes = [
    { name: 'ak-icon-16.png', size: 16 },
    { name: 'ak-icon-32.png', size: 32 },
    { name: 'ak-logo-64.png', size: 64 },
    { name: 'ak-icon-180.png', size: 180 },
    { name: 'ak-icon-192.png', size: 192 },
    { name: 'ak-icon-512.png', size: 512 }
]

async function generate() {
    try {
        for (const s of sizes) {
            const out = path.join(outDir, s.name)
            await sharp(input, { density: 300 })
                .resize(s.size, s.size, { fit: 'cover' })
                .png({ quality: 100 })
                .toFile(out)
            console.log('Created', out)
        }
        console.log('All icons generated')
    } catch (e) {
        console.error('Error creating icons:', e)
        process.exit(1)
    }
}

await generate()
