import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  cleanThemeName,
  simplifyTheme,
  THEME_OVERRIDES,
  themeEndsWithCollectiveNoun,
  formatThemeLine,
} from '../shared/themes.js';

describe('Theme helpers', () => {
  describe('cleanThemeName', () => {
    it('returns empty string for undefined or empty input', () => {
      assert.strictEqual(cleanThemeName(undefined), '');
      assert.strictEqual(cleanThemeName(''), '');
    });

    it('identifies primary franchise categories', () => {
      assert.strictEqual(cleanThemeName('The Hobbit & The Lord of the Rings / The Lord of the Rings'), 'Lord of the Rings');
      assert.strictEqual(cleanThemeName('Star Wars / Helmet Collection'), 'Star Wars');
      assert.strictEqual(cleanThemeName('Star Wars / Ultimate Collector Series'), 'Star Wars');
      assert.strictEqual(cleanThemeName('Icons (Creator Expert & Advanced Models) / Landmark'), 'Icons');
      assert.strictEqual(cleanThemeName('Harry Potter / Sculptures'), 'Harry Potter');
      assert.strictEqual(cleanThemeName('Architecture'), 'Architecture');
    });

    it('falls back to the first segment without parentheticals', () => {
      assert.strictEqual(cleanThemeName('Creator / Creator 3in1 / Creature'), 'Creator');
    });
  });

  describe('simplifyTheme', () => {
    it('simplifies Star Wars Ultimate Collector Series to Star Wars UCS', () => {
      assert.strictEqual(simplifyTheme('Star Wars / Ultimate Collector Series'), 'Star Wars UCS');
      assert.strictEqual(simplifyTheme('Star Wars Ultimate Collector Series'), 'Star Wars UCS');
    });

    it('handles explicit theme overrides', () => {
      assert.strictEqual(simplifyTheme('Creator / Creator 3in1 / Creature'), 'Creator 3-in-1');
      assert.strictEqual(simplifyTheme('Holiday & Event / Christmas'), 'Holiday Christmas');
      assert.strictEqual(simplifyTheme('Holiday & Event / Halloween'), 'Halloween');
      assert.strictEqual(simplifyTheme('Technic / Model / Space Exploration'), 'Technic Space');
    });

    it('normalizes Lord of the Rings themes', () => {
      assert.strictEqual(
        simplifyTheme('The Hobbit & The Lord of the Rings / The Lord of the Rings'),
        'Lord of the Rings'
      );
      assert.strictEqual(
        simplifyTheme('The Hobbit & The Lord of the Rings / The Lord of the Rings / Icons (Creator Expert & Advanced Models)'),
        'Lord of the Rings'
      );
    });

    it('strips episode sub-segments and parentheticals', () => {
      assert.strictEqual(
        simplifyTheme('Icons (Creator Expert & Advanced Models) / Landmark'),
        'Icons Landmark'
      );
      assert.strictEqual(
        simplifyTheme('Star Wars / Sculptures / Star Wars Episode 4/5/6'),
        'Star Wars'
      );
    });
  });

  describe('themeEndsWithCollectiveNoun', () => {
    it('detects collective nouns at the end of a theme string', () => {
      assert.strictEqual(themeEndsWithCollectiveNoun('Star Wars Helmet Collection'), true);
      assert.strictEqual(themeEndsWithCollectiveNoun('Star Wars Starship Collection'), true);
      assert.strictEqual(themeEndsWithCollectiveNoun('Botanical Collection'), true);
      assert.strictEqual(themeEndsWithCollectiveNoun('Collectible Minifigures Series'), true);
      assert.strictEqual(themeEndsWithCollectiveNoun('Special Edition Line'), true);
      assert.strictEqual(themeEndsWithCollectiveNoun('Creator Group'), true);
    });

    it('returns false for themes that do not end in a collective noun', () => {
      assert.strictEqual(themeEndsWithCollectiveNoun('Star Wars'), false);
      assert.strictEqual(themeEndsWithCollectiveNoun('Star Wars UCS'), false);
      assert.strictEqual(themeEndsWithCollectiveNoun('Lord of the Rings'), false);
      assert.strictEqual(themeEndsWithCollectiveNoun('Icons Landmark'), false);
      assert.strictEqual(themeEndsWithCollectiveNoun(undefined), false);
      assert.strictEqual(themeEndsWithCollectiveNoun(''), false);
    });
  });

  describe('formatThemeLine', () => {
    it('does not append "line" if the theme already ends with a collective noun', () => {
      assert.strictEqual(formatThemeLine('Star Wars Helmet Collection'), 'Star Wars Helmet Collection');
      assert.strictEqual(formatThemeLine('Star Wars Starship Collection'), 'Star Wars Starship Collection');
    });

    it('appends "line" for regular themes', () => {
      assert.strictEqual(formatThemeLine('Star Wars'), 'Star Wars line');
      assert.strictEqual(formatThemeLine('Star Wars UCS'), 'Star Wars UCS line');
      assert.strictEqual(formatThemeLine('Lord of the Rings'), 'Lord of the Rings line');
    });

    it('handles empty input gracefully', () => {
      assert.strictEqual(formatThemeLine(undefined), '');
      assert.strictEqual(formatThemeLine(''), '');
    });
  });
});
