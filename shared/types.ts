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

export interface WordTimestamp {
  word: string;
  start: number; // in milliseconds
  end: number;   // in milliseconds
}

export interface LegoDimensions {
  height?: number; // cm
  width?: number;  // cm
  depth?: number;  // cm
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
  year?: number; // Primary display year (yearReleased or year from metadata)
  yearReleased?: number;
  yearRetired?: number;
  dateReleased?: string;
  dateRetired?: string;
  theme?: string;
  pieces?: number;
  imageUrl?: string;
  media?: LegoMedia;
  localImagePath?: string;
  audioPath?: string;
  subtitles?: WordTimestamp[];
  narrationText?: string;
  videoPath?: string;
  buildDate?: string;
  buildTimeHours?: number;
  timeToBuildFormatted?: string;
  builtBy?: string;
  funFacts?: string;
  notes?: string;
  dimensions?: LegoDimensions;
  datePurchased?: string;
}
