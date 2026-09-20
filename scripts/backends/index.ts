import path from 'node:path';
import type { EnrichmentBackend } from './types.js';
import { LegoMetadataBackend } from './lego.js';
import { RebrickableBackend } from './rebrickable.js';
import { BricksetBackend } from './brickset.js';

export * from './types.js';
export * from './cache.js';
export { LegoMetadataBackend } from './lego.js';
export { RebrickableBackend } from './rebrickable.js';
export { BricksetBackend } from './brickset.js';

export interface BackendFactoryOptions {
  legoDataDir?: string;
  rebrickableApiKey?: string;
  bricksetApiKey?: string;
  cacheBaseDir?: string;
}

/**
 * Creates and returns the default list of enrichment backends.
 * The order of backends determines fallback priority:
 * 1. LEGO.com local metadata (official asset & booklet catalog)
 * 2. Rebrickable (theme hierarchies and parts)
 * 3. Brickset (retirement dates, retail availability, dimensions)
 */
export function createDefaultBackends(options: BackendFactoryOptions = {}): EnrichmentBackend[] {
  const cacheBaseDir = options.cacheBaseDir || path.resolve(process.cwd(), 'data/cache');

  return [
    new LegoMetadataBackend({
      legoDataDir: options.legoDataDir,
    }),
    new RebrickableBackend({
      apiKey: options.rebrickableApiKey,
      cacheDir: path.join(cacheBaseDir, 'rebrickable'),
    }),
    new BricksetBackend({
      apiKey: options.bricksetApiKey,
      cacheDir: path.join(cacheBaseDir, 'brickset'),
    }),
  ];
}
