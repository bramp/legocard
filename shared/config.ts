/**
 * Central configuration for Brick Nook.
 * Domain, branding, CDN URLs, and defaults are defined here.
 */
export const SITE_CONFIG = {
  name: 'Brick Nook',
  shortName: 'Brick Nook',
  tagline: 'Personal Collection Showcase • Designed for NFC & QR Scans',
  domain: 'bricknook.me',
  siteUrl: 'https://bricknook.me',
  mediaDomain: 'media.bricknook.me',
  mediaUrl: 'https://media.bricknook.me',
  r2Bucket: 'bricknook-media',
  userAgent: 'bricknook/1.0',
} as const;

export type SiteConfig = typeof SITE_CONFIG;
