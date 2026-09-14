import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import type { EnrichedLegoSet } from '../shared/types.js';

dotenv.config();

const DATA_DIR = path.resolve(process.cwd(), 'data');
const JSON_FILE = path.join(DATA_DIR, 'sets.json');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Clean text by stripping markdown bold/stars/quotes
function cleanFactText(text: string): string {
  return text
    .replace(/^["'\s]+|["'\s]+$/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/^Fact:\s*/i, '')
    .trim();
}

async function fetchGeminiFunFacts(set: EnrichedLegoSet, apiKey: string): Promise<string | null> {
  const prompt = `Give me 2 or 3 interesting, concise fun facts or trivia about the official Lego set #${set.id}: "${set.name}" (${set.pieces || ''} pieces, released around ${set.year || ''}, theme: ${set.theme || 'Lego'}).
Include things like unique building techniques, designer easter eggs, historical significance, or record-breaking aspects of this specific Lego set.
Format as a clean 2-sentence to 3-sentence paragraph suitable for display on a collectible card. Do NOT use bullet points or markdown headers.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 250,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.warn(`[Warning] Gemini API error (${res.status}) for set #${set.id}:`, errText);
    return null;
  }

  const json = (await res.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!candidateText) return null;

  return cleanFactText(candidateText);
}

async function main() {
  if (!fs.existsSync(JSON_FILE)) {
    console.error('Missing data/sets.json. Run "npm run enrich" first.');
    process.exit(1);
  }

  if (!GEMINI_API_KEY) {
    console.error('❌ Error: GEMINI_API_KEY is not defined in .env.');
    console.error('   Please add GEMINI_API_KEY=your_key to your .env file.');
    console.error('   (Get a free API key at https://aistudio.google.com/)');
    process.exit(1);
  }

  const sets = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8')) as EnrichedLegoSet[];

  // Optional filter via CLI arg: npm run facts -- --set 10497 or --limit 10
  const setArg = process.argv.find((a) => a.startsWith('--set=') || a === '--set');
  let targetSetId: string | undefined;
  if (setArg) {
    targetSetId = setArg.startsWith('--set=') ? setArg.split('=')[1] : process.argv[process.argv.indexOf('--set') + 1];
  }

  const forceAll = process.argv.includes('--force');

  console.log(`✨ Searching fun facts with Gemini for ${sets.length} sets...`);

  let updatedCount = 0;

  for (const set of sets) {
    if (targetSetId && set.id !== targetSetId) continue;

    // Skip if already has rich fun facts (unless forced)
    if (set.funFacts && set.funFacts.length > 50 && !forceAll && !set.funFacts.startsWith('Released in')) {
      continue;
    }

    console.log(`🤖 Querying Gemini for #${set.id}: ${set.name}...`);
    try {
      const fact = await fetchGeminiFunFacts(set, GEMINI_API_KEY);
      if (fact) {
        set.funFacts = fact;
        console.log(`   ✓ "${fact.substring(0, 75)}..."`);
        updatedCount++;
      }
      // Small delay to respect rate limits
      await new Promise((r) => setTimeout(r, 600));
    } catch (err) {
      console.error(`   ✗ Error fetching fact for #${set.id}:`, err);
    }
  }

  fs.writeFileSync(JSON_FILE, JSON.stringify(sets, null, 2), 'utf-8');
  console.log(`\n🎉 Fun facts updated for ${updatedCount} sets in ${JSON_FILE}.`);
}

main().catch((err) => {
  console.error('Fatal facts error:', err);
  process.exit(1);
});
