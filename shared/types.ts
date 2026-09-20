export interface CsvLegoRecord {
  // Support both snake_case and Google Sheet title case headers
  'Set Number'?: string;
  set_number?: string;
  Name?: string;
  name?: string;
  Category?: string;
  category?: string;
  'Number of Pieces'?: string | number;
  pieces?: string | number;
  'Time to Build'?: string;
  time_to_build?: string;
  build_time_hours?: string | number;
  'Date Finished'?: string;
  build_date?: string;
  'Year Finished'?: string;
  'Year Purchased'?: string;
  'Date Purchased'?: string;
  'Date Set Released'?: string;
  'Date Set Retired'?: string;
  'RRP ($)'?: string;
  'Price Paid with tax ($)'?: string;
  Supplier?: string;
  Height?: string | number;
  Width?: string | number;
  Depth?: string | number;
  Notes?: string;
  notes?: string;
  built_by?: string;
  rating?: string | number;
  fun_facts?: string;
}

export interface RebrickableSetResponse {
  set_num: string;
  name: string;
  year: number;
  theme_id: number;
  num_parts: number;
  set_img_url: string | null;
  set_url: string;
  last_modified_dt: string;
}

export interface BricksetDimensions {
  height?: number;
  width?: number;
  depth?: number;
  weight?: number;
}

export interface BricksetAgeRange {
  min?: number;
  max?: number;
}

export interface BricksetImage {
  thumbnailURL?: string;
  imageURL?: string;
}

export interface BricksetLegoComRegion {
  retailPrice?: number;
  dateFirstAvailable?: string;
  dateLastAvailable?: string;
}

export interface BricksetSet {
  setID: number;
  number: string;
  numberVariant: number;
  name: string;
  year: number;
  theme?: string;
  themeGroup?: string;
  subtheme?: string;
  category?: string;
  released?: boolean;
  pieces?: number;
  minifigs?: number;
  image?: BricksetImage;
  bricksetURL?: string;
  rating?: number;
  reviewCount?: number;
  packagingType?: string;
  availability?: string;
  instructionsCount?: number;
  additionalImageCount?: number;
  ageRange?: BricksetAgeRange;
  dimensions?: BricksetDimensions;
  barcode?: {
    EAN?: string;
    UPC?: string;
  };
  extendedData?: Record<string, unknown>;
  lastUpdated?: string;
  LEGOCom?: {
    US?: BricksetLegoComRegion;
    UK?: BricksetLegoComRegion;
    CA?: BricksetLegoComRegion;
    DE?: BricksetLegoComRegion;
    [key: string]: BricksetLegoComRegion | undefined;
  };
}

export interface BricksetApiResponse {
  status: 'success' | 'error';
  message?: string;
  matches?: number;
  sets?: BricksetSet[];
}

export interface WordTimestamp {
  word: string;
  start: number; // in milliseconds
  end: number;   // in milliseconds
}

export interface LegoShowcaseProps {
  id: string;
  name: string;
  theme?: string;
  year?: number;
  pieces?: number;
  buildTimeHours?: number;
  timeToBuildFormatted?: string;
  funFacts?: string;
  imageSrc: string; // File URL, data URL, or web URL
  audioSrc?: string; // File URL, data URL, or web URL
  subtitles?: WordTimestamp[];
  audioDurationInSeconds?: number;
}

export interface LegoDimensions {
  height?: number; // cm
  width?: number;  // cm
  depth?: number;  // cm
}

export interface LegoInstructionPdf {
  url: string;
  filename?: string;
  filesize?: number;
  previewUrl?: string;
  isAdditionalInfoBooklet?: boolean;
  sequenceNumber?: number;
  sequenceTotal?: number;
}

export interface LegoProductVideo {
  id: string;
  title?: string;
  description?: string;
  url: string;
}

export interface LegoMedia {
  image?: string;     // Relative path on CDN, e.g. "images/10497.jpg"
  audio?: string;     // Relative path on CDN, e.g. "audio/10497.mp3"
  subtitles?: string; // Relative path on CDN, e.g. "audio/10497.json"
  video?: string;     // Relative path on CDN, e.g. "videos/10497.mp4"
}

export interface EnrichedLegoSet {
  id: string; // Clean set number (e.g. "10497")
  setNum: string; // Rebrickable format (e.g. "10497-1")
  name: string;

  /**
   * Release year of the set (e.g. 2024).
   * Guaranteed / canonical numeric release year across all sets, sourced from metadata backends or release dates.
   * Used for sorting, rankings, and narration templates.
   */
  year?: number;

  /**
   * Exact release date when known (e.g. "June 4, 2024" or "August 2023").
   * Provides higher precision than `year` when available from LEGO.com, Brickset, or user CSV records.
   * Some promotional or uncatalogued sets may only have `year` if an exact month/day was not published.
   */
  dateReleased?: string;

  /**
   * Date or status when the set was retired (e.g. "November 21, 2016", "July 2026", or "Retired").
   * Can represent either an accomplished retirement or a scheduled/projected retirement date.
   * Derive the retired status or retirement year via `isSetRetired()` / `getRetiredYear()`.
   */
  dateRetired?: string;

  theme?: string;
  age?: string; // Recommended age, e.g. "18+", "16+"
  pieces?: number;
  imageUrl?: string;
  hiresImageUrl?: string;
  thumbnailImageUrl?: string;
  images?: string[];
  instructionBooks?: number;
  description?: string;
  featuresText?: string;
  metaDescription?: string;
  metaTitle?: string;
  slug?: string;
  brand?: string;
  categories?: string[];
  productVideos?: LegoProductVideo[];
  media?: LegoMedia;
  audioPath?: string;
  subtitles?: WordTimestamp[];
  narrationText?: string;
  videoPath?: string;
  buildDate?: string;
  buildTimeHours?: number;
  timeToBuildFormatted?: string;
  rating?: number;
  funFacts?: string;
  notes?: string;
  dimensions?: LegoDimensions;
  instructions?: LegoInstructionPdf[];
  datePurchased?: string;
}
