import QRCode from 'qrcode';

export interface LegoBrick {
  x: number; // in units (c * M)
  y: number;
  w: number;
  h: number;
  isDark: boolean;
}

export interface LegoQrOptions {
  /** Quiet zone border in modules (default: 3) */
  margin?: number;
  /**
   * Tiling style:
   * - 'merged': merges connected modules into standard LEGO brick dimensions (2x4, 2x3, 2x2, 1x4, 1x2, etc.)
   * - 'individual': every 1x1 module is its own individual plate with seams on all sides
   * - 'baseplate': continuous light baseplate background with dark bricks on top
   * (default: 'merged')
   */
  brickStyle?: 'merged' | 'individual' | 'baseplate';
  /** QR Error Correction Level (default: 'L') */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  /** Whether to emboss the LEGO logo on top of each stud (default: 'none') */
  studLogo?: 'none' | 'lego';
}

/**
 * Standard LEGO brick dimensions (in studs), sorted from largest to smallest.
 */
const BRICK_SIZES: [number, number][] = [
  [4, 2], [2, 4],
  [3, 2], [2, 3],
  [2, 2],
  [4, 1], [1, 4],
  [3, 1], [1, 3],
  [2, 1], [1, 2],
  [1, 1],
];

/**
 * Greedy algorithm to tile a 2D boolean grid with standard rectangular LEGO bricks.
 */
export function tileBricks(grid: boolean[][], unitScale = 10): LegoBrick[] {
  const rows = grid.length;
  const cols = grid[0].length;
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const bricks: LegoBrick[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (visited[r][c]) continue;
      const isDark = grid[r][c];

      let placed = false;
      for (const [w, h] of BRICK_SIZES) {
        if (c + w <= cols && r + h <= rows) {
          let canFit = true;
          for (let dr = 0; dr < h; dr++) {
            for (let dc = 0; dc < w; dc++) {
              if (visited[r + dr][c + dc] || grid[r + dr][c + dc] !== isDark) {
                canFit = false;
                break;
              }
            }
            if (!canFit) break;
          }

          if (canFit) {
            for (let dr = 0; dr < h; dr++) {
              for (let dc = 0; dc < w; dc++) {
                visited[r + dr][c + dc] = true;
              }
            }
            bricks.push({
              x: c * unitScale,
              y: r * unitScale,
              w: w * unitScale,
              h: h * unitScale,
              isDark,
            });
            placed = true;
            break;
          }
        }
      }

      if (!placed) {
        visited[r][c] = true;
        bricks.push({
          x: c * unitScale,
          y: r * unitScale,
          w: unitScale,
          h: unitScale,
          isDark,
        });
      }
    }
  }

  return bricks;
}

/**
 * Generates a lightweight, responsive SVG string of a QR code styled as LEGO bricks viewed from directly above,
 * along with the stud dimension size.
 */
export function generateLegoQrResult(
  text: string,
  options: LegoQrOptions = {}
): { svg: string; size: number } {
  const {
    margin = 3,
    brickStyle = 'merged',
    errorCorrectionLevel = 'H',
    studLogo = 'none',
  } = options;

  const qr = QRCode.create(text, { errorCorrectionLevel });
  const rawSize = qr.modules.size;
  const totalSize = rawSize + margin * 2;
  const M = 10; // 10 units per module keeps coordinates compact & integer-based
  const totalUnits = totalSize * M;

  // Build 2D boolean grid (including quiet zone margin)
  const grid: boolean[][] = Array.from({ length: totalSize }, () => Array(totalSize).fill(false));
  for (let r = 0; r < rawSize; r++) {
    for (let c = 0; c < rawSize; c++) {
      grid[r + margin][c + margin] = qr.modules.get(r, c) === 1;
    }
  }

  // Brick layout
  let bricks: LegoBrick[] = [];
  if (brickStyle === 'merged') {
    bricks = tileBricks(grid, M);
  } else if (brickStyle === 'individual') {
    for (let r = 0; r < totalSize; r++) {
      for (let c = 0; c < totalSize; c++) {
        bricks.push({ x: c * M, y: r * M, w: M, h: M, isDark: grid[r][c] });
      }
    }
  } else {
    for (let r = 0; r < totalSize; r++) {
      for (let c = 0; c < totalSize; c++) {
        if (grid[r][c]) {
          bricks.push({ x: c * M, y: r * M, w: M, h: M, isDark: true });
        }
      }
    }
  }

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalUnits} ${totalUnits}" width="100%" height="100%">`
  );

  // Compact defs: reused gradients and stud definitions
  parts.push(`<defs>
<linearGradient id="dr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a4d5c"/><stop offset=".45" stop-color="#2c2e38"/><stop offset="1" stop-color="#0c0d11"/></linearGradient>
<radialGradient id="df" cx="42%" cy="40%" r="58%"><stop offset="0" stop-color="#2a2c36"/><stop offset=".75" stop-color="#1d1e25"/><stop offset="1" stop-color="#14151a"/></radialGradient>
<linearGradient id="db" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#343744"/><stop offset=".5" stop-color="#1e2027"/><stop offset="1" stop-color="#101116"/></linearGradient>
<linearGradient id="lr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#e8ebf0"/><stop offset="1" stop-color="#b4b9c5"/></linearGradient>
<radialGradient id="lf" cx="42%" cy="40%" r="58%"><stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#f5f6fa"/><stop offset="1" stop-color="#e2e5ec"/></radialGradient>
<linearGradient id="lb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#f6f7fa"/><stop offset="1" stop-color="#cfd3dc"/></linearGradient>
<g id="sd">
<circle cx=".4" cy=".5" r="2.85" fill="#000" opacity=".3"/>
<circle r="2.85" fill="url(#dr)"/>
<circle r="2.5" fill="url(#df)"/>
${studLogo === 'lego' ? '<text y=".3" font-family="Arial,sans-serif" font-weight="900" font-style="italic" font-size="1.7" fill="#464958" text-anchor="middle" dominant-baseline="central" letter-spacing="-.1px">LEGO</text>' : ''}
</g>
<g id="sl">
<circle cx=".3" cy=".4" r="2.85" fill="#000" opacity=".12"/>
<circle r="2.85" fill="url(#lr)"/>
<circle r="2.5" fill="url(#lf)"/>
${studLogo === 'lego' ? '<text y=".3" font-family="Arial,sans-serif" font-weight="900" font-style="italic" font-size="1.7" fill="#cbd0dc" text-anchor="middle" dominant-baseline="central" letter-spacing="-.1px">LEGO</text>' : ''}
</g>
</defs>`);

  // Seam background
  parts.push(`<rect width="${totalUnits}" height="${totalUnits}" fill="#b0b5c0"/>`);

  if (brickStyle === 'baseplate') {
    parts.push(`<rect width="${totalUnits}" height="${totalUnits}" fill="#f6f7fa"/>`);
  }

  // Dark bricks grouped
  parts.push(`<g fill="#1e2027" stroke="url(#db)" stroke-width=".3">`);
  for (const b of bricks) {
    if (b.isDark) {
      parts.push(
        `<rect x="${(b.x + 0.3).toFixed(1)}" y="${(b.y + 0.3).toFixed(1)}" width="${(b.w - 0.6).toFixed(1)}" height="${(b.h - 0.6).toFixed(1)}" rx=".6"/>`
      );
    }
  }
  parts.push(`</g>`);

  // Light bricks grouped
  parts.push(`<g fill="#f6f7fa" stroke="url(#lb)" stroke-width=".3">`);
  for (const b of bricks) {
    if (!b.isDark) {
      parts.push(
        `<rect x="${(b.x + 0.3).toFixed(1)}" y="${(b.y + 0.3).toFixed(1)}" width="${(b.w - 0.6).toFixed(1)}" height="${(b.h - 0.6).toFixed(1)}" rx=".6"/>`
      );
    }
  }
  parts.push(`</g>`);

  // Studs rendered with lightweight <use> instances
  for (let r = 0; r < totalSize; r++) {
    const y = r * M + 5;
    for (let c = 0; c < totalSize; c++) {
      const x = c * M + 5;
      const id = grid[r][c] ? '#sd' : '#sl';
      parts.push(`<use href="${id}" x="${x}" y="${y}"/>`);
    }
  }

  parts.push(`</svg>`);
  return { svg: parts.join(''), size: totalSize };
}

/**
 * Generates a lightweight, responsive SVG string of a QR code styled as LEGO bricks viewed from directly above.
 */
export function generateLegoQrSvg(text: string, options: LegoQrOptions = {}): string {
  return generateLegoQrResult(text, options).svg;
}
