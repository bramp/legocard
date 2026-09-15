# Todo List

- [ ] Create a custom QR code generator that renders QR code modules shaped like Lego bricks / round studs.
- [x] Add script to pull collection spreadsheet directly from Google Sheets (`scripts/fetch-sheet.ts` / `npm run fetch:sheet`).
- [ ] Implement Phase 2: Remotion vertical video showcase composition and batch MP4 rendering.

## Metadata Enrichment & Data Sources
- [ ] **Minifigures (Rebrickable / BrickLink)**: Pull minifigure count (`num_minifigs`) and list of minifigures (names, IDs, minifig images) via `/api/v3/lego/sets/{set_num}/minifigs/`.
- [ ] **Physical Dimensions & Weight (BrickLink / LEGO)**: Ingest build dimensions (Height, Width, Depth in cm/inches) and weight (grams/oz) from BrickLink catalog.
- [ ] **Age Recommendation & Packaging**: Track recommended age group (`18+`, `9+`, etc.) and set type (UCS, D2C, GWP, Polybag, Box).
- [ ] **LEGO Digital Instructions Link**: Add link to official PDF building instructions via `https://www.lego.com/service/buildinginstructions/{set_num}`.
- [ ] **Set Designer / Master Builder**: Attribute lead LEGO model designers (e.g. Mike Psiaki, Henrik Andersen, César Soares) where published.
- [ ] **Unique Part Count & Inventory Stats**: Track unique piece count vs. total parts, and sticker vs. printed part breakdown.
- [ ] **Real-world Context / Historical Trivia (Google / Gemini)**: 1–2 sentence background on the real monument, vehicle, or pop-culture subject behind the set.
- [ ] **Set Easter Eggs & Play Features**: Document hidden compartments, light bricks, and special mechanical features.


