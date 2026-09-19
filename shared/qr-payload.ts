export type QrPayloadOptions =
  | { type: 'url'; url: string }
  | { type: 'text'; text: string }
  | {
      type: 'wifi';
      ssid: string;
      password?: string;
      auth?: 'WPA' | 'WEP' | 'nopass';
      hidden?: boolean;
    }
  | {
      type: 'vcard';
      firstName?: string;
      lastName?: string;
      org?: string;
      phone?: string;
      email?: string;
      url?: string;
    }
  | {
      type: 'email';
      to: string;
      subject?: string;
      body?: string;
    }
  | {
      type: 'phone';
      phone: string;
    }
  | {
      type: 'sms';
      phone: string;
      message?: string;
    }
  | {
      type: 'geo';
      lat: number | string;
      lng: number | string;
    };

/**
 * Escapes special characters for Wi-Fi QR payloads (\ ; , : ")
 */
export function escapeWifiString(str: string): string {
  return str.replace(/([\\;,:"'])/g, '\\$1');
}

/**
 * Builds a standardized QR code payload string based on the content type.
 */
export function buildQrPayload(options: QrPayloadOptions): string {
  switch (options.type) {
    case 'url':
      return options.url.trim() || 'https://legocard.bramp.net';

    case 'text':
      return options.text.trim() || 'Hello';

    case 'wifi': {
      const ssid = escapeWifiString(options.ssid.trim());
      const pass = options.password ? escapeWifiString(options.password) : '';
      const auth = options.auth || 'WPA';
      const hidden = Boolean(options.hidden);
      return `WIFI:T:${auth};S:${ssid};P:${pass};H:${hidden};;`;
    }

    case 'vcard': {
      const fn = (options.firstName || '').trim();
      const ln = (options.lastName || '').trim();
      const fullName = [fn, ln].filter(Boolean).join(' ');
      const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${ln};${fn};;;`,
        `FN:${fullName || 'Contact'}`,
      ];
      if (options.org?.trim()) lines.push(`ORG:${options.org.trim()}`);
      if (options.phone?.trim()) lines.push(`TEL:${options.phone.trim()}`);
      if (options.email?.trim()) lines.push(`EMAIL:${options.email.trim()}`);
      if (options.url?.trim()) lines.push(`URL:${options.url.trim()}`);
      lines.push('END:VCARD');
      return lines.join('\n');
    }

    case 'email': {
      const to = (options.to || '').trim();
      const params = new URLSearchParams();
      if (options.subject) params.set('subject', options.subject);
      if (options.body) params.set('body', options.body);
      const q = params.toString();
      return `mailto:${to}${q ? '?' + q : ''}`;
    }

    case 'phone': {
      return `tel:${(options.phone || '').trim()}`;
    }

    case 'sms': {
      const phone = (options.phone || '').trim();
      const msg = options.message || '';
      return `smsto:${phone}:${msg}`;
    }

    case 'geo': {
      const lat = String(options.lat ?? '').trim() || '0';
      const lng = String(options.lng ?? '').trim() || '0';
      return `geo:${lat},${lng}`;
    }
  }
}
