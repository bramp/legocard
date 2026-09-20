import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import type { EnrichedLegoSet } from '../shared/types.js';

dotenv.config();

const DATA_DIR = path.resolve(process.cwd(), 'data');
const JSON_FILE = path.join(DATA_DIR, 'sets.json');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

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

// Clean text by stripping markdown bold/stars/quotes
function cleanFactText(text: string): string {
  return text
    .replace(/^["'\s]+|["'\s]+$/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/^Fact:\s*/i, '')
    .trim();
}

export function buildFunFactsPrompt(set: EnrichedLegoSet): string {
  return `Give me 2 concise, engaging fun facts or trivia about the official Lego set #${set.id}: "${set.name}".
Focus on story and universe lore, iconic movie or history moments the model captures, character details, or fun secret easter eggs hidden inside.
Keep it accessible and enjoyable for casual fans and collectors rather than Lego building experts—avoid builder acronyms like NPU, technical clutch techniques, or parts jargon.
Do NOT repeat the set number, set name, release year, piece count, or theme name, as those are already announced in the intro.
Format strictly as a short, punchy 2-sentence paragraph (under 50 words) suitable for a display card and natural spoken voiceover narration. Do NOT use bullet points or markdown formatting.`;
}

async function fetchGeminiFunFacts(set: EnrichedLegoSet, clientContext: GenAIClientContext): Promise<string | null> {
  const prompt = buildFunFactsPrompt(set);

  const response = await clientContext.client.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      temperature: 0.7,
      maxOutputTokens: 2500,
      thinkingConfig: {
        thinkingBudget: 0,
      },
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
  --preview, --dry-run    Preview prompt and model output without modifying sets.json
  --force                 Re-generate facts even if set already has fun facts
  -h, --help              Show this help message

Environment Variables:
  GEMINI_API_KEY          Google AI Studio API key (optional if ADC is configured)
  GOOGLE_CLOUD_PROJECT    GCP project ID for Vertex AI ADC authentication
  GOOGLE_CLOUD_LOCATION   GCP location for Vertex AI (default: us-central1)
  GEMINI_MODEL            Model name (default: gemini-2.5-flash)
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

  const sets = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8')) as EnrichedLegoSet[];

  if (isPreview) {
    console.log(`📋 Running in PREVIEW mode (no changes will be written to sets.json)`);
    console.log(`🔑 Auth mode: ${clientContext.authMode === 'api-key' ? 'Google AI Studio (API Key)' : `Vertex AI ADC (Project: ${clientContext.project})`}\n`);
  } else {
    console.log(`✨ Searching fun facts with Gemini for ${sets.length} sets...`);
    console.log(`🔑 Auth mode: ${clientContext.authMode === 'api-key' ? 'Google AI Studio (API Key)' : `Vertex AI ADC (Project: ${clientContext.project})`}\n`);
  }

  let updatedCount = 0;

  for (const set of sets) {
    if (targetSetId && set.id !== targetSetId) continue;

    // Skip if already has rich fun facts (unless forced or previewing)
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
    try {
      const fact = await fetchGeminiFunFacts(set, clientContext);
      if (fact) {
        console.log(`\n✨ Generated Fun Facts:\n   "${fact}"\n`);
        if (!isPreview) {
          set.funFacts = fact;
          updatedCount++;
        }
      } else {
        console.warn(`   ⚠️ No text returned by Gemini.`);
      }

      // Small delay between multiple sets to respect rate limits
      if (!targetSetId) {
        await new Promise((r) => setTimeout(r, 600));
      }
    } catch (err) {
      console.error(`   ✗ Error fetching fact for #${set.id}:`, err);
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
