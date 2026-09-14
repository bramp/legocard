import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import QRCode from 'qrcode';
import dotenv from 'dotenv';
import { generateLegoQrSvg } from '../shared/lego-qr.js';
import type { EnrichedLegoSet } from '../shared/types.js';

dotenv.config();

const DATA_DIR = path.resolve(process.cwd(), 'data');
const JSON_FILE = path.join(DATA_DIR, 'sets.json');
const QR_DIR = path.join(DATA_DIR, 'qr');
const SITE_PUBLIC_QR_DIR = path.resolve(process.cwd(), 'site/public/qr');

// Base URL for the published site
const BASE_URL = process.env.SITE_URL || 'https://legocard.bramp.net';

function hasRsvgConvert(): boolean {
  try {
    execSync('rsvg-convert --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function hasMagick(): boolean {
  try {
    execSync('magick -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function hasOxipng(): boolean {
  try {
    execSync('oxipng --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function hasOptipng(): boolean {
  try {
    execSync('optipng -v', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function renderPngFromSvg(svg: string, pngPath: string, targetUrl: string, size = 400) {
  if (hasRsvgConvert()) {
    // Pipe SVG directly via stdin - no temporary SVG file needed!
    execSync(`rsvg-convert -w ${size} -h ${size} -o "${pngPath}"`, { input: svg });

    // Quantize palette to 128 colors and strip metadata
    if (hasMagick()) {
      execSync(`magick "${pngPath}" -colors 128 -depth 8 -strip "${pngPath}"`);
    }

    // Lossless compression via oxipng or optipng
    if (hasOxipng()) {
      execSync(`oxipng -o 4 --strip all -q "${pngPath}"`);
    } else if (hasOptipng()) {
      execSync(`optipng -quiet -o7 -strip all "${pngPath}"`);
    }
  } else {
    // Fallback if rsvg-convert is not installed
    await QRCode.toFile(pngPath, targetUrl, {
      width: size,
      margin: 3,
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
    });
  }
}

async function main() {
  const args = process.argv.slice(2);
  const urlArgIndex = args.findIndex((a) => a === '--url' || a === '-u');
  const outArgIndex = args.findIndex((a) => a === '--out' || a === '-o');
  const hasLogo = args.includes('--logo');
  const saveSvg = args.includes('--svg');
  const studLogo = hasLogo ? 'lego' : 'none';

  // One-off CLI generation mode: npx tsx scripts/generate-qr.ts --url "https://..." [--out ./code.png] [--logo] [--svg]
  if (urlArgIndex !== -1 && args[urlArgIndex + 1]) {
    const customUrl = args[urlArgIndex + 1];
    const outPath =
      outArgIndex !== -1 && args[outArgIndex + 1]
        ? path.resolve(process.cwd(), args[outArgIndex + 1])
        : path.resolve(process.cwd(), 'lego-qr.png');

    console.log(`Generating LEGO QR code for: ${customUrl} (logo: ${studLogo})`);
    const svg = generateLegoQrSvg(customUrl, { brickStyle: 'merged', studLogo });

    if (saveSvg || outPath.endsWith('.svg')) {
      const svgPath = outPath.endsWith('.svg') ? outPath : outPath.replace(/\.png$/, '.svg');
      fs.writeFileSync(svgPath, svg, 'utf-8');
      console.log(`✓ Saved SVG to ${svgPath}`);
    }

    const pngPath = outPath.endsWith('.svg') ? outPath.replace(/\.svg$/, '.png') : outPath;
    await renderPngFromSvg(svg, pngPath, customUrl);
    console.log(`✓ Saved optimized PNG to ${pngPath}`);
    return;
  }

  // Batch mode: generate for all sets in data/sets.json
  if (!fs.existsSync(JSON_FILE)) {
    console.error('Missing data/sets.json. Run "npm run enrich" first.');
    process.exit(1);
  }

  if (!fs.existsSync(QR_DIR)) {
    fs.mkdirSync(QR_DIR, { recursive: true });
  }
  if (!fs.existsSync(SITE_PUBLIC_QR_DIR)) {
    fs.mkdirSync(SITE_PUBLIC_QR_DIR, { recursive: true });
  }

  const sets = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8')) as EnrichedLegoSet[];
  console.log(
    `Generating optimized LEGO QR PNGs for ${sets.length} sets (saving SVG: ${saveSvg ? 'yes' : 'no'})...`
  );

  for (const set of sets) {
    const targetUrl = `${BASE_URL}/sets/${set.id}`;
    const pngPath = path.join(QR_DIR, `${set.id}.png`);

    // 1. Generate LEGO Brick QR Code SVG in-memory
    const svg = generateLegoQrSvg(targetUrl, { brickStyle: 'merged', studLogo });

    // Optional SVG export (only if --svg flag is passed)
    if (saveSvg) {
      const svgPath = path.join(QR_DIR, `${set.id}.svg`);
      fs.writeFileSync(svgPath, svg, 'utf-8');
    }

    // 2. Render and optimize PNG directly
    await renderPngFromSvg(svg, pngPath, targetUrl);

    // 3. Keep site/public/qr synced for fast static web serving
    fs.copyFileSync(pngPath, path.join(SITE_PUBLIC_QR_DIR, `${set.id}.png`));

    console.log(`  ✓ #${set.id}: ${targetUrl}`);
  }

  console.log(`\n🎉 LEGO QR codes saved to ${QR_DIR} and ${SITE_PUBLIC_QR_DIR}`);
}

main().catch((err) => {
  console.error('Error generating QR codes:', err);
  process.exit(1);
});
