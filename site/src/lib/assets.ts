import type { EnrichedLegoSet } from '../../../shared/types.js';

const CDN_BASE_URL = (
  import.meta.env.PUBLIC_MEDIA_BASE_URL ||
  import.meta.env.MEDIA_BASE_URL ||
  'https://legocard-media.bramp.net'
).replace(/\/$/, '');

/**
 * Resolves a relative media path (e.g. "images/10497.jpg") to its full CDN URL.
 * If the path is already a full URL (http:// or https://), returns it unchanged.
 */
export function getAssetUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${CDN_BASE_URL}/${path.replace(/^\//, '')}`;
}

/**
 * Returns the best image URL for a given Lego set.
 * Prefers the CDN asset on legocard-media.bramp.net, falling back to Rebrickable CDN.
 */
export function getSetImageUrl(set: EnrichedLegoSet): string {
  if (set.media?.image) {
    return getAssetUrl(set.media.image)!;
  }
  if (set.id) {
    return getAssetUrl(`images/${set.id}.jpg`)!;
  }
  return set.imageUrl;
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
