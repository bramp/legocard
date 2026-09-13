# Architecture & Design: LegoCard

## 1. Executive Summary
**LegoCard** is a static web app and media showcase for a personal collection of ~100+ Lego sets. 

The primary physical interaction model is scanning:
- Every displayed Lego set has a physical NFC / RFID tag or a small printed QR code card.
- Tapping or scanning immediately opens that specific set's card page on mobile.
- Visitors can view official stock imagery, technical specifications (piece count, release year, dimensions/theme), personal build logs (who built it, how long it took, completion date), and fun facts.
- When ready, each set page also embeds an automated vertical video highlight reel generated programmatically with Remotion and neural TTS audio.

---

## 2. High-Level Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Data Ingestion                       │
│                                                        │
│   data/sets.csv (Source of truth: build logs, notes)   │
│                          │                             │
│                          ▼                             │
│              scripts/enrich-data.ts                    │
│   (Rebrickable API: piece count, theme, stock photo)   │
│                          │                             │
│                          ▼                             │
│        data/sets.json + data/images/{id}.jpg           │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌─────────────────────────┐ ┌─────────────────────────────┐
│  Phase 1: Astro Site    │ │  Phase 2: Remotion Videos   │
│                         │ │                             │
│  - Mobile-first cards   │ │  - scripts/generate-tts.ts  │
│  - QR code & RFID URLs  │ │    (edge-tts neural audio)  │
│  - Gallery & Filters    │ │  - video/src/ (9:16 Shorts) │
│  - Detail card pages    │ │  - scripts/render-videos.ts │
│  - Zero-JS static HTML  │ │    (batch MP4 generation)   │
│  - GitHub Pages deploy  │ │                             │
└─────────────────────────┘ └─────────────────────────────┘
```

---

## 3. Technology Stack Decisions

| Layer / Need | Technology | Rationale |
| :--- | :--- | :--- |
| **Data Source** | CSV (`data/sets.csv`) | Simple to export from Google Sheets / Excel, easy to edit locally or track in git. |
| **Metadata & Imagery** | Rebrickable API + CDN cache | Reliable Lego catalog API providing exact piece counts, release year, themes, and high-resolution official stock images. |
| **Web Framework** | **Astro 5** + Tailwind CSS | Zero client-side JavaScript by default, instant page load speeds on mobile, rich image optimization, content collections with type safety. |
| **Physical Scannability** | QR Codes (`qrcode` package) + Clean URLs | Clean set URLs (`/sets/10497`) easily programmed onto NFC NTAG213/215 stickers or printed onto collectible physical cards. Auto-generates high-res printable QR SVGs for each set. |
| **Video Engine** | **Remotion** (React) | Code-driven motion graphics; allows reusing web CSS tokens, responsive typography, Ken Burns stock photo animations, and CLI batch rendering. |
| **Voiceover Engine** | `msedge-tts` (Edge Neural TTS) | Completely free, natural Microsoft neural voices without API rate limits or recurring costs. |
| **Hosting & CI/CD** | GitHub Pages + GitHub Actions | Free, zero maintenance static hosting automatically updated on git push. |

---

## 4. Mobile-First Card UX & Scannability

### Physical Tagging Model
- **URL Route Pattern**: `https://<user>.github.io/legocard/sets/<set_number>` (or custom domain `https://legocard.app/sets/<set_number>`).
- **NFC / RFID**: NTAG213 / NTAG215 stickers (144 - 504 bytes) programmed with the direct URL. When a phone taps the tag on the Lego display stand, it opens directly in Safari/Chrome.
- **Printed Cards**: Each set card page provides a printable mini-card view (or downloadable QR code SVG) to place on physical display stands.

### Mobile Screen Architecture
1. **Header / Identity**: Set number badge, official theme pill, year, and set title.
2. **Hero Visual**: Crisp stock photo with clean zoom / pinch preview.
3. **Key Stats Grid (2x2 or 3x1 on mobile)**:
   - Pieces ($1,254$)
   - Build Time ($4.5\text{ hrs}$)
   - Built By (e.g., *Bram & Family*)
   - Rating ($5/5\star$)
4. **Story & Fun Facts**: Personal notes, build history, official Lego trivia.
5. **Video Showcase**: Compact HTML5 9:16 video player with custom play button and animated captions.
6. **QR Share & Navigation**: "Back to Collection" and "Show QR Code" popover for quick scanning by friends.

---

## 5. Data Flow & Schema

### Normalized Enriched Set (`data/sets.json`)
```typescript
interface EnrichedLegoSet {
  id: string;               // "10497"
  setNum: string;           // "10497-1"
  name: string;             // "Galaxy Explorer"
  year: number;             // 2022
  theme: string;            // "Classic Space / Icons"
  pieces: number;           // 1254
  imageUrl: string;         // Remote CDN URL
  localImagePath?: string;  // "data/images/10497.jpg"
  buildDate?: string;       // "2023-08-15"
  buildTimeHours?: number;  // 4.5
  builtBy?: string;         // "Bram & Family"
  rating?: number;          // 5
  funFacts: string;         // Trivia / notes
  notes?: string;           // Display location, etc.
  audioPath?: string;       // "data/audio/10497.mp3"
  videoPath?: string;       // "data/videos/10497.mp4"
}
```
