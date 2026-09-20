import type {
  EnrichedLegoSet,
  LegoDimensions,
  LegoInstructionPdf,
  LegoProductVideo,
} from '../../shared/types.js';

export interface SetContext {
  /** Clean set number without variant suffix, e.g. "10234" */
  cleanId: string;
  /** Full set number, typically with variant suffix, e.g. "10234-1" */
  setNum: string;
  /** The raw record parsed from the input CSV */
  csvRecord: Record<string, string>;
  /** Any previously enriched data from data/sets.json */
  previous?: Partial<EnrichedLegoSet>;
}

export interface EnrichmentResult {
  name?: string;
  year?: number;
  yearReleased?: number;
  yearRetired?: number;
  dateReleased?: string;
  dateRetired?: string;
  theme?: string;
  age?: string;
  pieces?: number;
  imageUrl?: string;
  hiresImageUrl?: string;
  thumbnailImageUrl?: string;
  images?: string[];
  instructionBooks?: number;
  instructions?: LegoInstructionPdf[];
  description?: string;
  featuresText?: string;
  metaDescription?: string;
  metaTitle?: string;
  slug?: string;
  brand?: string;
  categories?: string[];
  productVideos?: LegoProductVideo[];
  dimensions?: LegoDimensions;
  rating?: number;
}

export interface EnrichmentBackend {
  /** A human-readable identifier for this backend (e.g. "lego", "rebrickable", "brickset") */
  readonly name: string;

  /** Optional lifecycle hook called before processing begins (e.g. printing configuration status) */
  init?(): Promise<void> | void;

  /** Enrich a single set context, returning any metadata this backend can provide */
  enrich(context: SetContext): Promise<EnrichmentResult | null>;
}
