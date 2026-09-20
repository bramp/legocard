import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import type { EnrichedLegoSet } from '../shared/types.js';
import { getCachedJson, setCachedJson } from './backends/cache.js';
import { cleanPromptTitle } from '../shared/format.js';

dotenv.config();

const DATA_DIR = path.resolve(process.cwd(), 'data');
const JSON_FILE = path.join(DATA_DIR, 'sets.json');
const GEMINI_CACHE_DIR = path.join(DATA_DIR, 'cache', 'gemini');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

export interface CachedGeminiFact {
  setId: string;
  name: string;
  model: string;
  generatedAt: string;
  fact: string;
}

export function getCachedFunFact(setId: string): CachedGeminiFact | null {
  return getCachedJson<CachedGeminiFact>(GEMINI_CACHE_DIR, `set_${setId}.json`);
}

export function setCachedFunFact(fact: CachedGeminiFact): void {
  setCachedJson(GEMINI_CACHE_DIR, `set_${fact.setId}.json`, fact);
}

interface GenAIClientContext {
  client: GoogleGenAI;
  authMode: 'api-key' | 'vertex-adc';
  project?: string;
  location?: string;
}

function initGenAIClient(): GenAIClientContext {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey.trim()) {
    return {
      client: new GoogleGenAI({ apiKey: apiKey.trim() }),
      authMode: 'api-key',
    };
  }

  const project =
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    'bramp-gemini-cli-472820';
  const location = process.env.GOOGLE_CLOUD_LOCATION || process.env.GCP_LOCATION || 'global';

  return {
    client: new GoogleGenAI({
      vertexai: true,
      project,
      location,
    }),
    authMode: 'vertex-adc',
    project,
    location,
  };
}

// Clean text by stripping markdown bold/stars/quotes and search citations
function cleanFactText(text: string): string {
  let cleaned = text
    .replace(/\[cite[^\]]*\]/gi, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/^Fact:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If the entire text was wrapped in outer matching quotes, unwrap them
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  return cleaned;
}

export function buildFunFactsPrompt(set: EnrichedLegoSet): string {
  const cleanName = cleanPromptTitle(set.name);
  const themeContext = set.theme ? ` (Theme: ${set.theme})` : '';
  return `You are a friendly, engaging tour guide sharing cool trivia with visitors admiring official Lego set #${set.id}: "${cleanName}"${themeContext}.

Write exactly a 2-sentence fun fact paragraph with this 2-part structure:
1. Real-World / Lore Connection: Tell one fascinating fact about the REAL subject (the iconic movie/book lore, the actual historical monument, the real space mission, or real botanical plant species).
2. Hidden Inside Details: Connect it to a surprising, non-obvious Easter egg or secret detail tucked INSIDE the model (do NOT describe obvious exterior figures or features that anyone can already see, and do NOT mention modular assembly or building techniques).

Tone & Style:
- Use clear, conversational, everyday language that is fun and effortless to read aloud. Avoid dense architectural descriptions or convoluted sentences.
- The audience is NOT a Lego building expert—they are everyday fans looking for fun and amusement!
- Avoid builder jargon (no NPU, clutch power, studs, brackets, modular sections).
- Do NOT repeat the set number, set name, release year, piece count, or theme name.
- Do NOT include citations or reference tags like [cite: 1].
- Length: Strictly 2 sentences (under 50 words total). Clean punctuation with double quotes for dialogue or titles.`;
}

async function fetchGeminiFunFacts(set: EnrichedLegoSet, clientContext: GenAIClientContext): Promise<string | null> {
  const prompt = buildFunFactsPrompt(set);

  const response = await clientContext.client.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      temperature: 0,
      tools: [{ googleSearch: {} }],
      maxOutputTokens: 2500,
    },
  });

  const candidateText = response.text;
  if (!candidateText) return null;

  return cleanFactText(candidateText);
}

async function main() {
  const args = process.argv.slice(2);
  const isHelp = args.includes('--help') || args.includes('-h');

  if (isHelp) {
    console.log(`Usage: npm run facts -- [options]

Generates trivia and fun facts for Lego sets using Gemini AI.
Supports both Google AI Studio (API key) and Google Cloud Vertex AI (ADC).

Options:
  --set <id>, --set=<id>  Target a specific set ID (e.g. --set=10237)
  --limit <n>             Maximum number of sets to process (e.g. --limit 10)
  --preview, --dry-run    Preview prompt and model output without modifying sets.json
  --force                 Re-generate facts even if set already has fun facts
  -h, --help              Show this help message

Environment Variables:
  GEMINI_API_KEY          Google AI Studio API key (optional if ADC is configured)
  GOOGLE_CLOUD_PROJECT    GCP project ID for Vertex AI ADC authentication
  GOOGLE_CLOUD_LOCATION   GCP location for Vertex AI (default: global)
  GEMINI_MODEL            Model name (default: gemini-3.8-flash)
`);
    return;
  }

  if (!fs.existsSync(JSON_FILE)) {
    console.error('Missing data/sets.json. Run "npm run enrich" first.');
    process.exit(1);
  }

  let clientContext: GenAIClientContext;
  try {
    clientContext = initGenAIClient();
  } catch (err: any) {
    console.error('❌ Error initializing Gemini authentication:', err.message);
    console.error('   Either provide GEMINI_API_KEY in .env or configure ADC via `gcloud auth application-default login`.');
    process.exit(1);
  }

  const isPreview = args.includes('--preview') || args.includes('--dry-run');
  const forceAll = args.includes('--force');

  // Optional filter via CLI arg: npm run facts -- --set 10497 or --set=10497
  const setArg = args.find((a) => a.startsWith('--set=') || a === '--set');
  let targetSetId: string | undefined;
  if (setArg) {
    targetSetId = setArg.startsWith('--set=') ? setArg.split('=')[1] : args[args.indexOf('--set') + 1];
  }

  const limitArg = args.find((a) => a.startsWith('--limit=') || a === '--limit');
  let limit: number | undefined;
  if (limitArg) {
    limit = parseInt(limitArg.startsWith('--limit=') ? limitArg.split('=')[1] : args[args.indexOf('--limit') + 1], 10);
  }

  const sets = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8')) as EnrichedLegoSet[];

  if (isPreview) {
    console.log(`📋 Running in PREVIEW mode (no changes will be written to sets.json)`);
    console.log(`🔑 Auth mode: ${clientContext.authMode === 'api-key' ? 'Google AI Studio (API Key)' : `Vertex AI ADC (Project: ${clientContext.project})`}\n`);
  } else {
    console.log(`✨ Searching fun facts with Gemini for ${sets.length} sets...`);
    console.log(`🔑 Auth mode: ${clientContext.authMode === 'api-key' ? 'Google AI Studio (API Key)' : `Vertex AI ADC (Project: ${clientContext.project})`}\n`);
  }

  let updatedCount = 0;
  let processedCount = 0;

  for (const set of sets) {
    if (targetSetId && set.id !== targetSetId) continue;
    if (limit && processedCount >= limit) break;

    // Check disk cache first unless forced
    const cached = getCachedFunFact(set.id);
    if (cached?.fact && !forceAll) {
      if (!set.funFacts || set.funFacts !== cached.fact) {
        set.funFacts = cached.fact;
        updatedCount++;
      }
      if (targetSetId || isPreview) {
        console.log(`================================================================================`);
        console.log(`[#${set.id}] ${set.name} (${set.year}, ${set.pieces?.toLocaleString() ?? '—'} pieces)`);
        console.log(`💾 Using cached Gemini fact (generated ${cached.generatedAt.slice(0, 10)} by ${cached.model}):`);
        console.log(`   "${cached.fact}"\n`);
        processedCount++;
      }
      continue;
    }

    processedCount++;

    // Skip if already has rich fun facts in sets.json (unless forced)
    if (set.funFacts && set.funFacts.length > 50 && !forceAll && !isPreview && !set.funFacts.startsWith('Released in')) {
      continue;
    }

    console.log(`================================================================================`);
    console.log(`[#${set.id}] ${set.name} (${set.year}, ${set.pieces?.toLocaleString() ?? '—'} pieces)`);
    if (set.funFacts) {
      console.log(`\n📌 Current fun facts:\n   "${set.funFacts}"`);
    }

    const prompt = buildFunFactsPrompt(set);
    console.log(`\n💬 Prompt sent to Gemini:`);
    console.log(`   ${prompt.split('\n').join('\n   ')}`);

    console.log(`\n🤖 Querying Gemini (${GEMINI_MODEL})...`);
    let fact: string | null = null;
    let attempts = 0;
    while (attempts < 4) {
      try {
        attempts++;
        fact = await fetchGeminiFunFacts(set, clientContext);
        break;
      } catch (err: any) {
        if (err.status === 429 && attempts < 4) {
          const waitSec = attempts * 10;
          console.warn(`   ⚠️ Rate limit (429) on #${set.id}. Retrying in ${waitSec}s...`);
          await new Promise((r) => setTimeout(r, waitSec * 1000));
        } else {
          console.error(`   ✗ Error fetching fact for #${set.id}:`, err);
          break;
        }
      }
    }

    if (fact) {
      console.log(`\n✨ Generated Fun Facts:\n   "${fact}"\n`);
      if (!isPreview) {
        set.funFacts = fact;
        setCachedFunFact({
          setId: set.id,
          name: set.name,
          model: GEMINI_MODEL,
          generatedAt: new Date().toISOString(),
          fact,
        });
        updatedCount++;
      }
    } else if (attempts > 0) {
      console.warn(`   ⚠️ No text returned by Gemini.`);
    }

    // Small delay between multiple sets to respect rate limits
    if (!targetSetId) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  if (isPreview) {
    console.log(`\n🔍 Preview complete. No changes were written to sets.json.`);
    return;
  }

  fs.writeFileSync(JSON_FILE, JSON.stringify(sets, null, 2), 'utf-8');
  console.log(`\n🎉 Fun facts updated for ${updatedCount} sets in ${JSON_FILE}.`);
}

main().catch((err) => {
  console.error('Fatal facts error:', err);
  process.exit(1);
});
