# Implementation Plan: LegoCard

## Overview
LegoCard is built in two primary phases:
- **Phase 1 (Active Focus)**: Build a mobile-first collectible card static website using Astro and Tailwind CSS, enriched from your spreadsheet via Rebrickable, with direct QR/RFID scannable URLs, full search/filtering, and printable QR codes.
- **Phase 2 (Subsequent)**: Video highlight pipeline with Remotion and neural TTS audio.

---

## Phase 1: Mobile-First Static Site & Scannable Cards (Current Priority)

### Step 1.1: Data Enrichment & Asset Storage
- [x] Create monorepo structure and shared TypeScript definitions in [shared/types.ts](shared/types.ts).
- [x] Implement CSV ingestion and Rebrickable API enrichment in [scripts/enrich-data.ts](scripts/enrich-data.ts).
- [x] Download high-resolution official stock images into [data/images/](data/images/) (gitignored locally).
- [x] Build in-Astro dynamic QR generator ([site/src/pages/qr/[id].[format].ts](site/src/pages/qr/[id].[format].ts)) producing SVG/PNG/WebP stud codes.

### Step 1.2: Astro Web Application Scaffolding
- [x] Scaffold Astro 5 project inside [site/](site/) configured with Tailwind CSS.
- [x] Load enriched dataset via [site/src/lib/sets.ts](site/src/lib/sets.ts) for fast, zero-JS builds.
- [x] Configure custom domain `legocard.bramp.net` and build output in [site/astro.config.mjs](site/astro.config.mjs).

### Step 1.3: Mobile-First Card Design & Templates
- [x] **Individual Set Route (`/sets/[id]`)**:
  - Optimized for mobile scanning: fast load time (<100ms static HTML).
  - Hero image viewer with modal preview.
  - Spec callout pills: Piece count, Release year, Theme, Dimensions.
  - Personal build badges: Build duration, Date completed, Built by, Star rating.
  - Fun facts & notes section.
  - Interactive "Show QR Code" modal for physical card scanning.
- [x] **Collection Gallery Route (`/`)**:
  - Search and filter bar by keyword and theme.
  - Responsive collectible card grid with cover photos and quick stats.
- [x] **Printable Tags Route (`/print-tags`)**:
  - Paginated print sheet (9 tags per page) sorted chronologically by build date.
  - High-resolution SVG LEGO QR code on each tag ready for cardstock printing.

### Step 1.4: Cloudflare R2 Media CDN Pipeline
- [ ] Create Cloudflare R2 bucket (`legocard-media`) with custom domain `https://legocard-media.bramp.net`.
- [ ] Add central asset resolver in [site/src/lib/assets.ts](site/src/lib/assets.ts) pointing to CDN URLs.
- [ ] Implement [scripts/sync-cdn.ts](scripts/sync-cdn.ts) to sync local images, audio, and videos to R2 via S3 API with caching headers.
- [ ] Update [scripts/enrich-data.ts](scripts/enrich-data.ts) to populate relative `media` keys in [data/sets.json](data/sets.json).

### Step 1.5: Deployment & Automation
- [x] Set up GitHub Actions workflow in [.github/workflows/deploy.yml](.github/workflows/deploy.yml) using `withastro/action@v6`.
- [x] Configure automated static site builds and GitHub Pages deployment.

---

## Phase 2: Video Highlight Reel Pipeline (Remotion & TTS)

### Step 2.1: Neural Voiceover Narration
- [ ] Build [scripts/generate-tts.ts](scripts/generate-tts.ts) using Edge Neural TTS to synthesize audio narration (.mp3) from set specs and fun facts.
- [ ] Extract word-level subtitle timing into `.subtitles.json` for animated captions.

### Step 2.2: Remotion Video PoC
- [ ] Scaffold Remotion project in [video/](video/) with 9:16 vertical (1080x1920) resolution.
- [ ] Create animated composition:
  - Intro card with set title and piece count badge.
  - Ken Burns pan/zoom on stock photo.
  - Animated stat counters.
  - Synchronized subtitle captions.
- [ ] Interactive review using `npm run video:preview` (Remotion Studio).

### Step 2.3: Batch Video Renderer
- [ ] Implement CLI renderer in [scripts/render-videos.ts](scripts/render-videos.ts) using `@remotion/renderer`.
- [ ] Link rendered videos into the Astro set pages.

---

## Verification & Testing
1. **Data Ingestion**: Run `npm run enrich` to ensure CSV data is merged with Rebrickable imagery.
2. **Local Preview**: Run `npm run dev:site` and open `http://localhost:4321` on mobile / DevTools mobile emulation.
3. **QR & RFID Verification**: Scan generated QR codes on a mobile phone to confirm instant navigation to `/sets/<id>`.
4. **Site Build**: Run `npm run build:site` and verify all static HTML pages generate with zero errors.
