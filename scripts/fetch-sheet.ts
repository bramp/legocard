import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1QHvBO3RwVNfAeEzTP_bImbn7n19SoSi6coJYMTFhjQk/edit?gid=0#gid=0';

const SHEET_URL = process.env.GOOGLE_SHEETS_URL || DEFAULT_SHEET_URL;
const OUTPUT_FILE = path.resolve(process.cwd(), 'data/sets.csv');

// Regex patterns to extract sheet ID and gid
const SHEET_ID_REGEX = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
const GID_REGEX = /[?&#]gid=([0-9]+)/;

function getExportUrl(sheetUrl: string): { exportUrl: string; sheetId: string; gid: string } {
  const idMatch = sheetUrl.match(SHEET_ID_REGEX);
  if (!idMatch) {
    throw new Error(`Could not extract spreadsheet ID from URL: ${sheetUrl}`);
  }
  const sheetId = idMatch[1];

  const gidMatch = sheetUrl.match(GID_REGEX);
  const gid = gidMatch ? gidMatch[1] : '0';

  // Standard Google Sheets CSV export link
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  return { exportUrl, sheetId, gid };
}

async function main() {
  const { exportUrl, sheetId, gid } = getExportUrl(SHEET_URL);
  console.log(`📥 Fetching data from Google Sheets...`);
  console.log(`   Spreadsheet ID: ${sheetId}`);
  console.log(`   Sheet Tab (gid): ${gid}`);

  const headers: Record<string, string> = {};
  if (process.env.GOOGLE_ACCESS_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GOOGLE_ACCESS_TOKEN}`;
  }

  const res = await fetch(exportUrl, {
    headers,
    redirect: 'follow',
  });

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();

  // If Google redirects to a login page (HTML)
  if (text.trim().startsWith('<!DOCTYPE html>') || text.includes('accounts.google.com') || contentType.includes('text/html')) {
    console.error(`\n❌ Error: The Google Sheet requires access authorization.`);
    console.error(`\nTo allow direct sync without complicated OAuth tokens:`);
    console.error(`1. Open the sheet: ${SHEET_URL}`);
    console.error(`2. Click the 'Share' button in the top right.`);
    console.error(`3. Under 'General access', change from 'Restricted' to 'Anyone with the link' -> 'Viewer'.`);
    console.error(`4. Re-run: npm run fetch:sheet`);
    console.error(`\n(Alternatively, set GOOGLE_ACCESS_TOKEN in .env with a valid Bearer token).`);
    process.exit(1);
  }

  if (!res.ok) {
    console.error(`\n❌ Failed to download sheet (HTTP ${res.status}): ${res.statusText}`);
    process.exit(1);
  }

  // Backup current sets.csv if it exists
  if (fs.existsSync(OUTPUT_FILE)) {
    const backupFile = path.resolve(process.cwd(), 'data/sets.backup.csv');
    fs.copyFileSync(OUTPUT_FILE, backupFile);
    console.log(`   Backed up existing CSV to data/sets.backup.csv`);
  }

  fs.writeFileSync(OUTPUT_FILE, text, 'utf-8');
  const lineCount = text.trim().split('\n').length;
  console.log(`\n🎉 Successfully fetched sheet!`);
  console.log(`   Saved ${lineCount - 1} rows to ${OUTPUT_FILE}`);
  console.log(`\nNext step: Run 'npm run enrich' and 'npm run qr' to update your site!`);
}

main().catch((err) => {
  console.error('Fatal fetch error:', err);
  process.exit(1);
});
