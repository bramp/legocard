import fs from 'node:fs';
import path from 'node:path';

export function ensureCacheDir(cacheDir: string): void {
  fs.mkdirSync(cacheDir, { recursive: true });
}

export function getCachedJson<T>(cacheDir: string, filename: string): T | null {
  const filePath = path.join(cacheDir, filename);
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
    } catch {
      return null;
    }
  }
  return null;
}

export function setCachedJson(cacheDir: string, filename: string, data: unknown): void {
  ensureCacheDir(cacheDir);
  const filePath = path.join(cacheDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
