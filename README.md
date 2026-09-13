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
| `npm run sync` | One-shot command: fetches Google Sheet, runs Rebrickable enrichment, and regenerates QR codes. |
| `npm run enrich` | Reads `data/sets.csv`, queries Rebrickable API, downloads stock images, and updates `data/sets.json`. |
| `npm run qr` | Generates high-res SVG & PNG QR codes for each set in `data/qr/` for NFC/stand printing. |
| `npm run dev:site` | Starts the Astro development server (open `http://localhost:4321` on desktop or phone via local WiFi). |
| `npm run build:site` | Builds the static website into `site/dist/` for GitHub Pages. |
| `npm run preview:site`| Serves the production static build locally to test performance and routes. |
| `npm run tts` | Generates neural voiceover MP3s and word-level subtitle timings. |
| `npm run video:preview` | Launches Remotion Studio to preview video animations in the browser. |
| `npm run video:render` | Batch renders 9:16 vertical MP4 showcase videos for each set. |

---

## 📝 Updating Your Lego Data

### Option A: Direct Google Sheets Sync (Recommended)
1. Ensure your Google Sheet is shared as **"Anyone with the link can view"**:
   - [Open your spreadsheet](https://docs.google.com/spreadsheets/d/1QHvBO3RwVNfAeEzTP_bImbn7n19SoSi6coJYMTFhjQk/edit?gid=0#gid=0)
   - Click **Share** (top right) $\to$ change General access to **Anyone with the link** (Viewer).
2. Run the sync command:
   ```bash
   npm run sync
   ```
   This will automatically pull the sheet into `data/sets.csv`, download any missing official stock photos from Rebrickable, update `data/sets.json`, and regenerate your QR codes.

### Option B: Local CSV
1. Open `data/sets.csv` (or export from your Google Sheet).
2. Add your new Lego set with its set number and your personal build notes:
   ```csv
   set_number,name,build_date,build_time_hours,built_by,rating,fun_facts,notes
   10497,Galaxy Explorer,2023-08-15,4.5,Bram & Family,5,Recreation of the 1979 classic 497.,Displayed in study.
   ```
3. Run the enrichment script:
   ```bash
   npm run enrich && npm run qr
   ```

---

## 🏷️ Physical Tags & QR Codes

### NFC / RFID Stickers
1. Buy standard **NTAG213** or **NTAG215** adhesive tags (very cheap in packs of 25–50).
2. Using an app like **NFC Tools** (iOS/Android), write a URL record to the tag:
   ```
   https://<your-username>.github.io/legocard/sets/<set_number>
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
│   ├── audio/           # Generated TTS audio tracks & subtitles
│   └── qr/              # Generated QR code SVGs & PNGs
├── scripts/
│   ├── enrich-data.ts   # Ingestion & Rebrickable fetcher
│   ├── generate-qr.ts   # QR code generator for NFC/print
│   ├── generate-tts.ts  # Neural TTS voiceover generator
│   └── render-videos.ts # Remotion batch MP4 renderer
├── site/                # Astro 5 static mobile-first web app
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

## 🚢 Deployment

The site is configured for automatic deployment to **GitHub Pages** via GitHub Actions:
1. Push to the `main` branch.
2. The workflow builds the static site and deploys it to your GitHub Pages URL:
   `https://<your-username>.github.io/legocard/`
