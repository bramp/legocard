import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';
import { getLegoSets } from '../../lib/sets.js';
import { generateLegoQrSvg } from '../../../../shared/lego-qr.js';

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

  const svgBuffer = Buffer.from(svg, 'utf-8');

  if (format === 'webp') {
    const webpBuffer = await sharp(svgBuffer).resize(400, 400).webp({ quality: 90 }).toBuffer();
    return new Response(webpBuffer, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  if (format === 'png') {
    const pngBuffer = await sharp(svgBuffer).resize(400, 400).png().toBuffer();
    return new Response(pngBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  return new Response('Not found', { status: 404 });
};
