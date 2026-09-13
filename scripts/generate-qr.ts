import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';
import dotenv from 'dotenv';
import type { EnrichedLegoSet } from '../shared/types.js';

dotenv.config();

const DATA_DIR = path.resolve(process.cwd(), 'data');
const JSON_FILE = path.join(DATA_DIR, 'sets.json');
const QR_DIR = path.join(DATA_DIR, 'qr');

// Base URL for the published site, e.g. "https://bramp.github.io/legocard"
const BASE_URL = process.env.SITE_URL || 'https://bramp.github.io/legocard';

async function main() {
  if (!fs.existsSync(JSON_FILE)) {
    console.error('Missing data/sets.json. Run "npm run enrich" first.');
    process.exit(1);
  }

  const sets = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8')) as EnrichedLegoSet[];
  console.log(`Generating QR codes for ${sets.length} sets pointing to: ${BASE_URL}/sets/{id}...`);

  for (const set of sets) {
    const targetUrl = `${BASE_URL}/sets/${set.id}`;
    const svgPath = path.join(QR_DIR, `${set.id}.svg`);
    const pngPath = path.join(QR_DIR, `${set.id}.png`);

    // 1. High-res vector SVG for web embedding and sharp printing
    const svg = await QRCode.toString(targetUrl, {
      type: 'svg',
      margin: 1,
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
    });
    fs.writeFileSync(svgPath, svg, 'utf-8');

    // 2. High-res PNG for label printers or NFC writing tools
    await QRCode.toFile(pngPath, targetUrl, {
      width: 600,
      margin: 1,
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
    });

    console.log(`  ✓ #${set.id}: ${targetUrl}`);
  }

  console.log(`\n🎉 QR codes saved to ${QR_DIR}`);
}

main().catch((err) => {
  console.error('Error generating QR codes:', err);
  process.exit(1);
});
