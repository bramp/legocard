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
- [x] Download high-resolution official stock images into [data/images/](data/images/).
- [ ] Add QR code generation script in [scripts/generate-qrcodes.ts](scripts/generate-qrcodes.ts) to produce SVG/PNG QR codes for every set pointing to its direct URL.

### Step 1.2: Astro Web Application Scaffolding
- [ ] Scaffold Astro 5 project inside [site/](site/) configured with Tailwind CSS.
- [ ] Symlink or copy enriched datasets and images into Astro's `src/content/` or `public/` directory for fast, zero-JS builds.
- [ ] Configure Astro site URL, base path, and image optimization in [site/astro.config.mjs](site/astro.config.mjs).

### Step 1.3: Mobile-First Card Design & Templates
- [ ] **Individual Set Route (`/sets/[id]`)**:
  - Optimized for mobile scanning: fast load time (<100ms static HTML).
  - Prominent hero image viewer with touch zoom / modal.
  - Spec callout pills: Piece count, Release year, Theme, Dimensions.
  - Personal build badges: Build duration ($4.5\text{ hrs}$), Date completed, Built by, Star rating.
  - Fun facts & notes section.
  - "Scan / Share" QR drawer for showing the set's QR code to another device.
  - Video embed placeholder (ready for Phase 2).
- [ ] **Collection Gallery Route (`/`)**:
  - Filterable and searchable by theme, piece count, release year, and builder.
  - Responsive collectible card grid (1 column on mobile, 2-3 on tablet/desktop).
  - Quick stats bar: Total sets, total pieces assembled, total build hours.
- [ ] **Printable Tags Route (`/print-tags`)**:
  - A clean print-stylesheet page that formats 2x3" display stand cards with set title, piece count, thumbnail, and QR code to print onto cardstock.

### Step 1.4: Deployment & Automation
- [ ] Set up GitHub Actions workflow in [.github/workflows/deploy.yml](.github/workflows/deploy.yml) for automated builds on push to `main`.
- [ ] Verify responsive layouts across iPhone / Android viewports.

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
