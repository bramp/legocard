import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildQrPayload, escapeWifiString } from '../shared/qr-payload.js';

describe('QR Payload Formatter', () => {
  describe('escapeWifiString', () => {
    it('escapes special characters with backslashes', () => {
      assert.equal(escapeWifiString('NormalText'), 'NormalText');
      assert.equal(escapeWifiString('Semi;Colon'), 'Semi\\;Colon');
      assert.equal(escapeWifiString('Back\\Slash'), 'Back\\\\Slash');
      assert.equal(escapeWifiString('Col:on'), 'Col\\:on');
      assert.equal(escapeWifiString('Com,ma'), 'Com\\,ma');
      assert.equal(escapeWifiString('Double"Quote'), 'Double\\"Quote');
    });
  });

  describe('buildQrPayload', () => {
    it('builds standard URL payload', () => {
      assert.equal(
        buildQrPayload({ type: 'url', url: 'https://legocard.bramp.net' }),
        'https://legocard.bramp.net'
      );
      assert.equal(
        buildQrPayload({ type: 'url', url: '   https://example.com/test   ' }),
        'https://example.com/test'
      );
    });

    it('falls back to default URL when empty', () => {
      assert.equal(
        buildQrPayload({ type: 'url', url: '   ' }),
        'https://legocard.bramp.net'
      );
    });

    it('builds plain text payload', () => {
      assert.equal(
        buildQrPayload({ type: 'text', text: 'Hello, World!' }),
        'Hello, World!'
      );
    });

    it('builds Wi-Fi network payloads', () => {
      const wifi = buildQrPayload({
        type: 'wifi',
        ssid: 'Home_Network',
        password: 'secret:password;123',
        auth: 'WPA',
        hidden: false,
      });

      assert.equal(
        wifi,
        'WIFI:T:WPA;S:Home_Network;P:secret\\:password\\;123;H:false;;'
      );
    });

    it('builds hidden Wi-Fi network payload with open security', () => {
      const wifi = buildQrPayload({
        type: 'wifi',
        ssid: 'OpenNet',
        auth: 'nopass',
        hidden: true,
      });

      assert.equal(wifi, 'WIFI:T:nopass;S:OpenNet;P:;H:true;;');
    });

    it('builds vCard 3.0 contact cards', () => {
      const vcard = buildQrPayload({
        type: 'vcard',
        firstName: 'Ada',
        lastName: 'Lovelace',
        org: 'Analytical Engine Corp',
        phone: '+1 555-0199',
        email: 'ada@example.org',
        url: 'https://en.wikipedia.org/wiki/Ada_Lovelace',
      });

      const lines = vcard.split('\n');
      assert.equal(lines[0], 'BEGIN:VCARD');
      assert.equal(lines[1], 'VERSION:3.0');
      assert.ok(lines.includes('N:Lovelace;Ada;;;'));
      assert.ok(lines.includes('FN:Ada Lovelace'));
      assert.ok(lines.includes('ORG:Analytical Engine Corp'));
      assert.ok(lines.includes('TEL:+1 555-0199'));
      assert.ok(lines.includes('EMAIL:ada@example.org'));
      assert.ok(lines.includes('URL:https://en.wikipedia.org/wiki/Ada_Lovelace'));
      assert.equal(lines[lines.length - 1], 'END:VCARD');
    });

    it('builds vCard with minimal fields', () => {
      const vcard = buildQrPayload({
        type: 'vcard',
        firstName: 'Mononym',
      });

      assert.ok(vcard.startsWith('BEGIN:VCARD\nVERSION:3.0'));
      assert.ok(vcard.includes('FN:Mononym'));
      assert.ok(vcard.endsWith('END:VCARD'));
    });

    it('builds email mailto links with subject and body', () => {
      const email = buildQrPayload({
        type: 'email',
        to: 'lego@example.com',
        subject: 'Set #10234',
        body: 'Love this set!',
      });

      assert.equal(
        email,
        'mailto:lego@example.com?subject=Set+%2310234&body=Love+this+set%21'
      );
    });

    it('builds simple mailto link without params', () => {
      const email = buildQrPayload({
        type: 'email',
        to: 'info@lego.com',
      });

      assert.equal(email, 'mailto:info@lego.com');
    });

    it('builds phone tel URI', () => {
      assert.equal(
        buildQrPayload({ type: 'phone', phone: '+1 (800) 555-0199' }),
        'tel:+1 (800) 555-0199'
      );
    });

    it('builds SMS smsto URI', () => {
      assert.equal(
        buildQrPayload({
          type: 'sms',
          phone: '+15551234',
          message: 'See you at BrickCon',
        }),
        'smsto:+15551234:See you at BrickCon'
      );
    });

    it('builds geo URI', () => {
      assert.equal(
        buildQrPayload({
          type: 'geo',
          lat: 55.7289,
          lng: 9.1176, // Billund, Denmark
        }),
        'geo:55.7289,9.1176'
      );
    });
  });
});
