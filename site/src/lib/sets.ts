import fs from 'node:fs';
import path from 'node:path';
import type { EnrichedLegoSet } from '../../shared/types.js';

export function getLegoSets(): EnrichedLegoSet[] {
  const dataPath = path.resolve(process.cwd(), '../data/sets.json');
  // Fallback if running directly in root or site
  const altPath = path.resolve(process.cwd(), 'data/sets.json');
  const filePath = fs.existsSync(dataPath) ? dataPath : altPath;

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as EnrichedLegoSet[];
}

export function getLegoSetById(id: string): EnrichedLegoSet | undefined {
  const sets = getLegoSets();
  return sets.find((s) => s.id === id);
}
