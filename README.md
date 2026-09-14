# 🧱 LegoCard

A lightweight, mobile-first static website and automated video showcase for a personal Lego collection. 

Designed for physical interaction: each set can have an **NFC/RFID tag** or a **printed QR code** on its display stand. Tapping or scanning with a smartphone instantly brings up a collectible info card with official stock photos, piece counts, personal build time, who built it, ratings, and fun facts.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18 or later (tested on v24)
- **npm** (or pnpm/yarn)
- *(Optional)* [Rebrickable API Key](https://rebrickable.com/api/) (free) to fetch piece counts, themes, and high-res stock photos automatically.

### 2. Setup
Clone the repository and install root dependencies:
```bash
git clone https://github.com/bramp/legocard.git
cd legocard
npm install
```

Copy the environment template if you have a Rebrickable API key:
```bash
cp .env.example .env
# Edit .env and paste your REBRICKABLE_API_KEY
```
*(Note: If you don't have an API key yet, the pipeline will still work using direct CDN image links and local spreadsheet values).*

---

## 🛠️ Usage & Commands

| Command | Description |
| :--- | :--- |
| `npm run fetch:sheet` | Downloads the latest data directly from your Google Sheet into `data/sets.csv`. |
| `npm run sync` | One-shot command: fetches Google Sheet and runs Rebrickable enrichment. |
| `npm run enrich` | Reads `data/sets.csv`, queries Rebrickable API, downloads stock images, and updates `data/sets.json`. |
| `npm run facts` | Queries Gemini API to discover fun facts and trivia for each set. |
| `npm run dev:site` | Starts the Astro development server (open `http://localhost:4321` on desktop or phone via local WiFi). |
| `npm run build:site` | Builds the static website into `site/dist/` for GitHub Pages. |
| `npm run preview:site`| Serves the production static build locally to test performance and routes. |
| `npm run tts` | Generates neural voiceover MP3s and word-level subtitle timings. |
| `npm run video:preview` | Launches Remotion Studio to preview video animations in the browser. |
| `npm run video:render` | Batch renders 9:16 vertical MP4 showcase videos for each set. |

---

## 📝 Updating Your Lego Data

### Option A: Google Sheets Sync (Recommended)
1. Add your Google Sheet URL to `.env`:
   ```bash
   GOOGLE_SHEETS_URL=https://docs.google.com/spreadsheets/d/<spreadsheet-id>/edit?gid=0#gid=0
   ```
2. Run the sync command:
   ```bash
   npm run sync
   ```
   - If authentication is needed to read your sheet, the script will guide you to authorize access via `gcloud` or provide an access token:
     ```bash
     gcloud auth login --enable-gdrive-access
     ```
   - It will automatically download the sheet into `data/sets.csv`, download any missing official stock photos from Rebrickable, and update `data/sets.json`.

### Option B: Local CSV
1. Open `data/sets.csv` (or export directly from your spreadsheet application).
2. Ensure column headers match your layout (e.g. `Set Number`, `Name`, `Category`, `Number of Pieces`, `Time to Build`, `Date Finished`, `Notes`).
3. Run the enrichment script:
   ```bash
   npm run enrich
   ```

---

## 🏷️ Physical Tags & QR Codes

### NFC / RFID Stickers
1. Buy standard **NTAG213** or **NTAG215** adhesive tags (very cheap in packs of 25–50).
2. Using an app like **NFC Tools** (iOS/Android), write a URL record to the tag:
   ```
   https://legocard.bramp.net/sets/<set_number>
   ```
3. Stick the tag under or beside the Lego display stand. Tapping any iPhone or Android phone will open the set card instantly without opening an app first.

### Printed QR Code Cards
Visit `/print-tags` on the running site to see a formatted, print-ready page of collectible cards featuring the set title, piece count, thumbnail, and scannable QR code.

---

## 📁 Repository Structure

```
legocard/
├── data/
│   ├── sets.csv         # Source of truth: your build history
│   ├── sets.json        # Normalized enriched metadata
│   ├── images/          # Downloaded official stock photos
│   └── audio/           # Generated TTS audio tracks & subtitles
├── scripts/
│   ├── enrich-data.ts   # Ingestion & Rebrickable fetcher
│   ├── fetch-sheet.ts   # Google Sheets downloader
│   ├── generate-tts.ts  # Neural TTS voiceover generator
│   └── render-videos.ts # Remotion batch MP4 renderer
├── site/                # Astro 5 static mobile-first web app
│   ├── public/
│   │   └── CNAME        # Custom domain (legocard.bramp.net)
│   └── src/pages/
│       ├── index.astro         # Catalog & filterable gallery
│       ├── sets/[id].astro     # Mobile-optimized collectible card
│       └── print-tags.astro    # Printable display stand QR cards
├── video/               # Remotion React video project (Phase 2)
├── shared/              # Shared TypeScript definitions
├── DESIGN.md            # System architecture & technology decisions
├── PLAN.md              # Work breakdown and roadmap
└── README.md            # Project guide & documentation
```

---

## 🚢 Deployment & Custom Domain

The site is configured for automatic deployment to **GitHub Pages** at **`legocard.bramp.net`**:

### DNS Setup (in your DNS provider for bramp.net)
Add a CNAME DNS record:
- **Type**: `CNAME`
- **Name/Host**: `legocard`
- **Target/Value**: `bramp.github.io.`

### GitHub Pages Settings
1. Go to your repo settings on GitHub: **Settings** $\to$ **Pages**.
2. Under **Build and deployment**, ensure **Source** is set to **GitHub Actions**.
3. Under **Custom domain**, ensure `legocard.bramp.net` is entered and check **Enforce HTTPS** (GitHub will provision a free Let's Encrypt TLS certificate once the DNS record propagates).

Every push to `main` builds the site and publishes to `https://legocard.bramp.net/`.
