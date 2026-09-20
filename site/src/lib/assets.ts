import type { EnrichedLegoSet } from '../../../shared/types.js';

const CDN_BASE_URL = (
  import.meta.env.PUBLIC_MEDIA_BASE_URL ||
  import.meta.env.MEDIA_BASE_URL ||
  ''
).replace(/\/$/, '');

/**
 * Resolves a relative media path (e.g. "images/10497.jpg") to its full CDN URL.
 * If the path is already a full URL (http:// or https://), returns it unchanged.
 * If no remote CDN is configured, resolves to a site-relative path (e.g. "/videos/10234.mp4").
 */
export function getAssetUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.replace(/^\//, '');
  if (CDN_BASE_URL) {
    return `${CDN_BASE_URL}/${cleanPath}`;
  }
  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  return `${baseUrl}/${cleanPath}`;
}

/**
 * Returns the best image URL for a given Lego set.
 * Uses official external URLs directly (LEGO high-res or Rebrickable),
 * falling back to custom media if specified.
 */
export function getSetImageUrl(set: EnrichedLegoSet): string {
  if (set.hiresImageUrl) return set.hiresImageUrl;
  if (set.imageUrl) return set.imageUrl;
  if (set.images && set.images.length > 0) return set.images[0];
  if (set.thumbnailImageUrl) return set.thumbnailImageUrl;
  if (set.media?.image) {
    return getAssetUrl(set.media.image)!;
  }
  return '';
}

/**
 * Returns the resolved media URLs for a Lego set (image, video, audio, subtitles).
 */
export function getSetMediaUrls(set: EnrichedLegoSet) {
  return {
    image: getSetImageUrl(set),
    video: set.media?.video
      ? getAssetUrl(set.media.video)
      : set.videoPath
        ? getAssetUrl(`videos/${set.id}.mp4`)
        : undefined,
    audio: set.media?.audio
      ? getAssetUrl(set.media.audio)
      : set.audioPath
        ? getAssetUrl(`audio/${set.id}.mp3`)
        : undefined,
    subtitles: set.media?.subtitles ? getAssetUrl(set.media.subtitles) : undefined,
  };
}
