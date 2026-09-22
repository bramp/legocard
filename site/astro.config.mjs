// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_CONFIG } from '../shared/config.ts';

/**
 * Astro integration to copy local media assets (videos, audio) to dist/ on build
 * if no remote CDN base URL is configured.
 * @returns {import('astro').AstroIntegration}
 */
function copyLocalMediaIntegration() {
  return {
    name: 'copy-local-media',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        if (process.env.PUBLIC_MEDIA_BASE_URL || process.env.MEDIA_BASE_URL) {
          return;
        }

        const outDir = fileURLToPath(dir);
        const rootDataDir = path.resolve(process.cwd(), '../data');
        const localDataDir = path.resolve(process.cwd(), 'data');
        const dataDir = fs.existsSync(rootDataDir) ? rootDataDir : localDataDir;

        for (const sub of ['videos', 'audio']) {
          const srcSubDir = path.join(dataDir, sub);
          if (fs.existsSync(srcSubDir)) {
            const destSubDir = path.join(outDir, sub);
            fs.mkdirSync(destSubDir, { recursive: true });
            const files = fs.readdirSync(srcSubDir);
            for (const file of files) {
              if (file.startsWith('.')) continue;
              const srcFile = path.join(srcSubDir, file);
              const destFile = path.join(destSubDir, file);
              if (fs.statSync(srcFile).isFile()) {
                fs.copyFileSync(srcFile, destFile);
              }
            }
          }
        }
      },
    },
  };
}

/**
 * Vite plugin to serve local media assets (videos, audio, images) from data/
 * during local development (`astro dev`) and preview (`astro preview`).
 * @returns {import('vite').Plugin}
 */
function serveLocalMedia() {
  /**
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   * @param {() => void} next
   */
  const mediaMiddleware = (req, res, next) => {
    if (!req.url) return next();
    const pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;
    if (
      !pathname.startsWith('/videos/') &&
      !pathname.startsWith('/audio/') &&
      !pathname.startsWith('/images/')
    ) {
      return next();
    }

    const rootDataDir = path.resolve(process.cwd(), '../data');
    const localDataDir = path.resolve(process.cwd(), 'data');
    const dataDir = fs.existsSync(rootDataDir) ? rootDataDir : localDataDir;

    const relativePath = decodeURIComponent(pathname.replace(/^\//, ''));
    let filePath = path.join(dataDir, relativePath);

    // Fallback for .json -> .subtitles.json
    if (!fs.existsSync(filePath) && filePath.endsWith('.json')) {
      const alt = filePath.replace(/\.json$/, '.subtitles.json');
      if (fs.existsSync(alt)) filePath = alt;
    }

    // Prevent directory traversal
    if (!filePath.startsWith(dataDir) || !fs.existsSync(filePath)) {
      return next();
    }

    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      return next();
    }

    const ext = path.extname(filePath).toLowerCase();
    /** @type {Record<string, string>} */
    const mimeTypes = {
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
      '.json': 'application/json',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');

    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize || isNaN(start)) {
        res.statusCode = 416;
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }

      const chunkSize = end - start + 1;
      res.statusCode = 206;
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', chunkSize);
      return fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.statusCode = 200;
      res.setHeader('Content-Length', fileSize);
      return fs.createReadStream(filePath).pipe(res);
    }
  };

  return {
    name: 'serve-local-media',
    configureServer(server) {
      server.middlewares.use(mediaMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(mediaMiddleware);
    },
  };
}

/**
 * Astro integration to ensure public/CNAME matches SITE_CONFIG.domain
 * @returns {import('astro').AstroIntegration}
 */
function syncCnameIntegration() {
  return {
    name: 'sync-cname',
    hooks: {
      'astro:config:setup': () => {
        const publicDir = path.resolve(process.cwd(), 'public');
        if (fs.existsSync(publicDir) && SITE_CONFIG.domain) {
          fs.writeFileSync(path.join(publicDir, 'CNAME'), `${SITE_CONFIG.domain}\n`, 'utf-8');
        }
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: SITE_CONFIG.siteUrl,
  base: '/',
  integrations: [copyLocalMediaIntegration(), syncCnameIntegration()],
  vite: {
    plugins: [tailwindcss(), serveLocalMedia()],
  },
});
