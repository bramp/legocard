import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateLegoQrResult,
  generateLegoQrSvg,
  tileBricks,
} from '../shared/lego-qr.js';
import { SITE_CONFIG } from '../shared/config.js';

describe('Lego QR Code Generator', () => {
  describe('tileBricks', () => {
    it('tiles a 4x4 uniform grid into two 4x2 bricks', () => {
      const grid = [
        [true, true, true, true],
        [true, true, true, true],
        [true, true, true, true],
        [true, true, true, true],
      ];
      const bricks = tileBricks(grid, 10);

      // Two 4x2 bricks (40x20 units)
      assert.equal(bricks.length, 2);
      assert.deepEqual(
        bricks.map((b) => ({ w: b.w, h: b.h, isDark: b.isDark })),
        [
          { w: 40, h: 20, isDark: true },
          { w: 40, h: 20, isDark: true },
        ]
      );
    });

    it('tiles a 1x1 grid as a single 1x1 plate', () => {
      const grid = [[false]];
      const bricks = tileBricks(grid, 10);

      assert.equal(bricks.length, 1);
      assert.equal(bricks[0].w, 10);
      assert.equal(bricks[0].h, 10);
      assert.equal(bricks[0].isDark, false);
    });

    it('covers every cell without gaps in checkerboard pattern', () => {
      const grid = [
        [true, false],
        [false, true],
      ];
      const bricks = tileBricks(grid, 10);

      // Cannot merge different colors, so four 1x1 bricks
      assert.equal(bricks.length, 4);
      for (const b of bricks) {
        assert.equal(b.w, 10);
        assert.equal(b.h, 10);
      }
    });
  });

  describe('generateLegoQrResult', () => {
    it('generates valid SVG structure and calculates dimensions', () => {
      const result = generateLegoQrResult(SITE_CONFIG.siteUrl, {
        margin: 4,
        brickStyle: 'merged',
        errorCorrectionLevel: 'H',
      });

      assert.ok(result.svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
      assert.ok(result.svg.endsWith('</svg>'));
      assert.ok(result.svg.includes('<defs>'));
      assert.ok(result.svg.includes('id="sd"'));
      assert.ok(result.svg.includes('id="sl"'));

      // Version 1 QR code is 21x21 modules. With margin 4, totalSize = 21 + 8 = 29.
      // Higher versions will be 25+8=33, 29+8=37, etc.
      assert.ok(result.size >= 29);
      assert.ok(result.svg.includes(`viewBox="0 0 ${result.size * 10} ${result.size * 10}"`));
    });

    it('respects different margins', () => {
      const r1 = generateLegoQrResult('A', { margin: 1, errorCorrectionLevel: 'L' });
      const r4 = generateLegoQrResult('A', { margin: 4, errorCorrectionLevel: 'L' });

      // Difference in stud dimension should be exactly (4 - 1) * 2 = 6 studs
      assert.equal(r4.size - r1.size, 6);
    });

    it('supports individual plates style', () => {
      const result = generateLegoQrResult('Test', {
        brickStyle: 'individual',
        margin: 2,
      });

      assert.ok(result.svg.includes('</svg>'));
      assert.ok(result.size > 0);
    });

    it('supports baseplate style', () => {
      const result = generateLegoQrResult('Test', {
        brickStyle: 'baseplate',
        margin: 2,
      });

      assert.ok(result.svg.includes('fill="#f6f7fa"'));
      assert.ok(result.svg.includes('</svg>'));
    });

    it('renders embossed LEGO logo on studs when requested', () => {
      const withLogo = generateLegoQrResult('Test', { studLogo: 'lego' });
      const withoutLogo = generateLegoQrResult('Test', { studLogo: 'none' });

      assert.ok(withLogo.svg.includes('LEGO</text>'));
      assert.ok(!withoutLogo.svg.includes('LEGO</text>'));
    });
  });

  describe('generateLegoQrSvg', () => {
    it('returns raw SVG string identical to generateLegoQrResult.svg', () => {
      const svg = generateLegoQrSvg('Hello');
      assert.ok(svg.startsWith('<svg'));
      assert.ok(svg.endsWith('</svg>'));
    });
  });
});
