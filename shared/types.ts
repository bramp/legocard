export interface CsvLegoRecord {
  set_number: string;
  name?: string;
  build_date?: string;
  build_time_hours?: string | number;
  built_by?: string;
  rating?: string | number;
  fun_facts?: string;
  notes?: string;
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

export interface EnrichedLegoSet {
  id: string; // Clean set number (e.g. "10497")
  setNum: string; // Rebrickable format (e.g. "10497-1")
  name: string;
  year: number;
  theme: string;
  pieces: number;
  imageUrl: string;
  localImagePath?: string;
  audioPath?: string;
  subtitles?: WordTimestamp[];
  narrationText?: string;
  videoPath?: string;
  buildDate?: string;
  buildTimeHours?: number;
  builtBy?: string;
  rating?: number;
  funFacts: string;
  notes?: string;
}
