import type { APIRoute, GetStaticPaths } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { getLegoSets } from '../../lib/sets.js';
import { generateLegoQrSvg } from '../../../../shared/lego-qr.js';

// Resolve persistent disk cache in data/cache/qr
const CACHE_DIR = (() => {
  const rootDataCache = path.resolve(process.cwd(), '../data/cache/qr');
  const directDataCache = path.resolve(process.cwd(), 'data/cache/qr');
  const dir = fs.existsSync(path.dirname(rootDataCache)) ? rootDataCache : directDataCache;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
})();

export const getStaticPaths: GetStaticPaths = () => {
  const sets = getLegoSets();
  const formats = ['svg', 'png', 'webp'] as const;

  return sets.flatMap((set) =>
    formats.map((format) => ({
      params: { id: set.id, format },
      props: { set },
    }))
  );
};

export const GET: APIRoute = async ({ params, props }) => {
  const { id, format } = params;
  const baseUrl = (import.meta.env.SITE_URL || 'https://legocard.bramp.net').replace(/\/$/, '');
  const targetUrl = `${baseUrl}/sets/${id}`;

  const svg = generateLegoQrSvg(targetUrl, { brickStyle: 'merged' });

  if (format === 'svg') {
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  const cachedFile = path.join(CACHE_DIR, `${id}.${format}`);
  if (fs.existsSync(cachedFile)) {
    const cachedBuffer = fs.readFileSync(cachedFile);
    const contentType = format === 'webp' ? 'image/webp' : 'image/png';
    return new Response(cachedBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  const svgBuffer = Buffer.from(svg, 'utf-8');

  if (format === 'webp') {
    const webpBuffer = await sharp(svgBuffer).resize(400, 400).webp({ quality: 90 }).toBuffer();
    try {
      fs.writeFileSync(cachedFile, webpBuffer);
    } catch {
      // ignore cache write errors
    }
    return new Response(webpBuffer, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  if (format === 'png') {
    const pngBuffer = await sharp(svgBuffer).resize(400, 400).png().toBuffer();
    try {
      fs.writeFileSync(cachedFile, pngBuffer);
    } catch {
      // ignore cache write errors
    }
    return new Response(pngBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  return new Response('Not found', { status: 404 });
};
