// Procedural sound effects synthesized into WAV base64 data URIs
// Zero external files, fully deterministic, instant loading in Remotion

function createWavDataUri(samples: Float32Array, sampleRate = 22050): string {
  const byteLength = 44 + samples.length * 2;
  const buffer = new Uint8Array(byteLength);
  const view = new DataView(buffer.buffer);

  // RIFF header
  buffer.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  view.setUint32(4, 36 + samples.length * 2, true);
  buffer.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"

  // fmt subchunk
  buffer.set([0x66, 0x6d, 0x74, 0x20], 12); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // 16-bit

  // data subchunk
  buffer.set([0x64, 0x61, 0x74, 0x61], 36); // "data"
  view.setUint32(40, samples.length * 2, true);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(44 + i * 2, int16, true);
  }

  // Convert binary to base64
  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  const bufGlobal = (globalThis as unknown as { Buffer?: { from(b: Uint8Array): { toString(enc: string): string } } }).Buffer;
  const base64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : bufGlobal
      ? bufGlobal.from(buffer).toString('base64')
      : '';
  return `data:audio/wav;base64,${base64}`;
}

// 1. Airy Whoosh Sound (300ms)
function generateWhoosh(): string {
  const sampleRate = 22050;
  const dur = 0.32;
  const n = Math.floor(sampleRate * dur);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const env = Math.sin(t * Math.PI) ** 2;
    const freq = 130 + Math.sin(t * Math.PI) * 420;
    const noise = (Math.random() * 2 - 1) * 0.35;
    const tone = Math.sin(2 * Math.PI * freq * (i / sampleRate));
    s[i] = (tone * 0.65 + noise * 0.35) * env * 0.5;
  }
  return createWavDataUri(s, sampleRate);
}

// 2. Soft Smooth Card Slide & Subtle Dampened Landing (Zero harsh click)
function generateCardSlide(): string {
  const sampleRate = 22050;
  const dur = 0.22;
  const n = Math.floor(sampleRate * dur);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    // Smooth bell-shaped envelope for gentle air displacement
    const env = Math.sin(t * Math.PI) ** 2.2;
    // Low-frequency subtle swoop (120Hz -> 280Hz -> 90Hz)
    const freq = 120 + Math.sin(t * Math.PI) * 160;
    const tone = Math.sin(2 * Math.PI * freq * (i / sampleRate));
    // Soft, rounded low-end cushion right at arrival (75Hz, dampened)
    const thudEnv = t > 0.68 ? Math.exp(-(t - 0.68) * 36) : 0;
    const thud = Math.sin(2 * Math.PI * 75 * (i / sampleRate)) * thudEnv * 0.25;
    s[i] = (tone * env * 0.35 + thud) * 0.7;
  }
  return createWavDataUri(s, sampleRate);
}

// Cached singleton URIs
export const WHOOSH_SFX = generateWhoosh();
export const CARD_SNAP_SFX = generateCardSlide();
