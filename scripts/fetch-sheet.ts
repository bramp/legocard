import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import dotenv from 'dotenv';

dotenv.config();

const SHEET_URL = process.env.GOOGLE_SHEETS_URL;
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

function getGoogleAccessToken(): string | null {
  if (process.env.GOOGLE_ACCESS_TOKEN) {
    return process.env.GOOGLE_ACCESS_TOKEN.trim();
  }

  // Try gcloud CLI with Drive scope if available
  try {
    const token = execSync(
      'gcloud auth print-access-token --scopes="https://www.googleapis.com/auth/drive" 2>/dev/null',
      { encoding: 'utf-8' }
    ).trim();
    if (token && token.startsWith('ya29.')) {
      console.log('   🔑 Using OAuth token from gcloud CLI');
      return token;
    }
  } catch {
    // gcloud not installed or drive scope not enabled
  }

  return null;
}

async function main() {
  if (!SHEET_URL) {
    console.error('❌ Error: GOOGLE_SHEETS_URL is not defined in .env.');
    console.error('   Please add GOOGLE_SHEETS_URL=https://docs.google.com/spreadsheets/d/.../edit to your .env file.');
    process.exit(1);
  }

  const { exportUrl, sheetId, gid } = getExportUrl(SHEET_URL);
  console.log(`📥 Fetching data from Google Sheets...`);
  console.log(`   Spreadsheet ID: ${sheetId}`);
  console.log(`   Sheet Tab (gid): ${gid}`);

  const token = getGoogleAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 1. Try standard Sheets export endpoint
  let res = await fetch(exportUrl, {
    headers,
    redirect: 'follow',
  });

  let contentType = res.headers.get('content-type') || '';
  let text = await res.text();

  // 2. If token present and direct export returned HTML or 403, try Google Drive API export endpoint
  if (token && (!res.ok || text.trim().startsWith('<!DOCTYPE html>') || contentType.includes('text/html'))) {
    const driveExportUrl = `https://www.googleapis.com/drive/v3/files/${sheetId}/export?mimeType=text/csv`;
    res = await fetch(driveExportUrl, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: 'follow',
    });
    contentType = res.headers.get('content-type') || '';
    text = await res.text();
  }

  // If Google redirects to a login page (HTML) or returns auth error
  if (text.trim().startsWith('<!DOCTYPE html>') || text.includes('accounts.google.com') || contentType.includes('text/html')) {
    console.error(`\n❌ Error: The Google Sheet requires authentication.`);
    console.error(`\nChoose one of the following methods to authenticate:`);
    console.error(`\nMethod 1: Using your existing gcloud CLI (Fastest if you already use gcloud)`);
    console.error(`   Run this once in your terminal:`);
    console.error(`     gcloud auth login --enable-gdrive-access`);
    console.error(`   Then re-run: npm run fetch:sheet`);
    console.error(`\nMethod 2: Share the sheet as Viewer`);
    console.error(`   1. Open: ${SHEET_URL}`);
    console.error(`   2. Click 'Share' (top right).`);
    console.error(`   3. Under General access, set to 'Anyone with the link' (Viewer).`);
    console.error(`\nMethod 3: Set GOOGLE_ACCESS_TOKEN in .env`);
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
  console.log(`\nNext step: Run 'npm run enrich' to update your site!`);
}

main().catch((err) => {
  console.error('Fatal fetch error:', err);
  process.exit(1);
});
