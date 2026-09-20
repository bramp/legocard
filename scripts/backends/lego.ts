import fs from 'node:fs';
import path from 'node:path';
import type {
  LegoDimensions,
  LegoInstructionPdf,
  LegoProductVideo,
} from '../../shared/types.js';
import type {
  EnrichmentBackend,
  EnrichmentResult,
  SetContext,
} from './types.js';

/**
 * Backend for enriching LEGO set data from local metadata files collected by
 * https://github.com/bramp/build-along (metadata.json containing official booklet PDFs,
 * dimensions, high-res images, product descriptions, video links, etc.).
 */

export interface LegoRawMetadata {
  set?: string;
  locale?: string;
  name?: string;
  theme?: string;
  age?: string;
  pieces?: number;
  year?: number;
  set_image_url?: string;
  set_image_alt?: string;
  description?: string;
  features_text?: string;
  meta_description?: string;
  meta_title?: string;
  slug?: string;
  hires_image_url?: string;
  thumbnail_image_url?: string;
  images?: Array<{
    id: string;
    url: string;
  }>;
  videos?: Array<{
    id: string;
    title?: string;
    description?: string;
    url: string;
  }>;
  categories?: string[];
  brand?: string;
  dimensions?: {
    height?: number;
    width?: number;
    depth?: number;
  };
  pdfs?: Array<{
    url: string;
    filename?: string;
    filesize?: number;
    preview_url?: string;
    is_additional_info_booklet?: boolean;
    sequence_number?: number;
    sequence_total?: number;
  }>;
}

export interface LegoBackendOptions {
  legoDataDir?: string;
}

export class LegoMetadataBackend implements EnrichmentBackend {
  readonly name = 'lego';
  private readonly legoDataDir?: string;

  constructor(options: LegoBackendOptions = {}) {
    this.legoDataDir = options.legoDataDir;
  }

  init(): void {
    if (this.legoDataDir) {
      console.log(`ℹ️  [Lego] Supplemental LEGO metadata directory enabled: ${this.legoDataDir}`);
    } else {
      console.log(
        `ℹ️  [Lego] No supplemental LEGO metadata directory specified (set LEGO_DATA_DIR in .env or pass --lego-data-dir=<path>). Skipping supplemental LEGO metadata.`
      );
    }
  }

  async enrich(context: SetContext): Promise<EnrichmentResult | null> {
    const meta = this.getMetadata(context.cleanId);
    if (!meta) {
      return null;
    }

    const name = meta.name ? meta.name.replace(/[™®]/g, '').trim() : undefined;
    const theme = meta.theme ? meta.theme.replace(/LEGO®\s*/g, '').trim() : undefined;
    const pieces = meta.pieces;
    const year = meta.year;
    const age = meta.age;

    const instructions: LegoInstructionPdf[] | undefined = meta.pdfs?.map((p) => ({
      url: p.url,
      filename: p.filename,
      filesize: p.filesize,
      previewUrl: p.preview_url,
      isAdditionalInfoBooklet: p.is_additional_info_booklet,
      sequenceNumber: p.sequence_number,
      sequenceTotal: p.sequence_total,
    }));

    const instructionBooks = this.getInstructionBooksCount(meta.pdfs);

    const imageUrl = meta.set_image_url;
    const hiresImageUrl = meta.hires_image_url;
    const thumbnailImageUrl = meta.thumbnail_image_url;
    const images = meta.images?.map((img) => img.url);

    const description = meta.description;
    const featuresText = meta.features_text;
    const metaDescription = meta.meta_description;
    const metaTitle = meta.meta_title;
    const slug = meta.slug;
    const brand = meta.brand;
    const categories = meta.categories;

    const productVideos: LegoProductVideo[] | undefined = meta.videos?.map((v) => ({
      id: v.id,
      title: v.title || undefined,
      description: v.description || undefined,
      url: v.url,
    }));

    const combinedText = `${featuresText || ''} ${description || ''}`;
    const dimensions = this.parseDimensions(meta.dimensions, context.csvRecord, combinedText);

    return {
      name,
      theme,
      pieces,
      year,
      age,
      instructionBooks,
      instructions,
      imageUrl,
      hiresImageUrl,
      thumbnailImageUrl,
      images,
      description,
      featuresText,
      metaDescription,
      metaTitle,
      slug,
      brand,
      categories,
      productVideos,
      dimensions,
    };
  }

  private getMetadata(cleanId: string): LegoRawMetadata | null {
    if (!this.legoDataDir) {
      return null;
    }

    const sourceFile = path.join(this.legoDataDir, cleanId, 'metadata.json');
    if (fs.existsSync(sourceFile)) {
      try {
        const content = fs.readFileSync(sourceFile, 'utf-8');
        return JSON.parse(content) as LegoRawMetadata;
      } catch {
        // ignore
      }
    }

    return null;
  }

  private getInstructionBooksCount(pdfs?: LegoRawMetadata['pdfs']): number | undefined {
    if (!pdfs || pdfs.length === 0) return undefined;
    const nonInfo = pdfs.filter((p) => !p.is_additional_info_booklet);
    const seqTotals = pdfs.map((p) => p.sequence_total).filter(Boolean) as number[];
    const maxSeq = seqTotals.length ? Math.max(...seqTotals) : 0;
    return maxSeq || nonInfo.length || pdfs.length || undefined;
  }

  private parseDimensions(
    metaDimensions?: LegoRawMetadata['dimensions'],
    record?: Record<string, string>,
    text?: string
  ): LegoDimensions | undefined {
    // 1. Prefer structured dimensions object directly from LEGO metadata if available
    if (metaDimensions && (metaDimensions.height || metaDimensions.width || metaDimensions.depth)) {
      const result: LegoDimensions = {};
      if (typeof metaDimensions.height === 'number' && metaDimensions.height > 0) result.height = metaDimensions.height;
      if (typeof metaDimensions.width === 'number' && metaDimensions.width > 0) result.width = metaDimensions.width;
      if (typeof metaDimensions.depth === 'number' && metaDimensions.depth > 0) result.depth = metaDimensions.depth;
      if (Object.keys(result).length > 0) return result;
    }

    // 2. Next check spreadsheet columns (Height, Width, Depth)
    let h = record ? parseFloat(record['Height'] || '') : NaN;
    let w = record ? parseFloat(record['Width'] || '') : NaN;
    let d = record ? parseFloat(record['Depth'] || '') : NaN;

    // 3. Fallback: parse dimensions from description / featuresText only if needed
    if ((isNaN(h) || !h) || (isNaN(w) || !w) || (isNaN(d) || !d)) {
      if (text) {
        const hMatch =
          text.match(/(\d+(?:\.\d+)?)\s*cm[^\w]*(?:high|tall|in height)/i) ||
          text.match(/(?:high|tall|height)[^\w]*(\d+(?:\.\d+)?)\s*cm/i);
        const wMatch =
          text.match(/(\d+(?:\.\d+)?)\s*cm[^\w]*(?:wide|in width|width)/i) ||
          text.match(/(?:wide|width)[^\w]*(\d+(?:\.\d+)?)\s*cm/i);
        const dMatch =
          text.match(/(\d+(?:\.\d+)?)\s*cm[^\w]*(?:deep|long|in depth|in length|depth|length)/i) ||
          text.match(/(?:deep|long|depth|length)[^\w]*(\d+(?:\.\d+)?)\s*cm/i);

        if ((isNaN(h) || !h) && hMatch) h = parseFloat(hMatch[1]);
        if ((isNaN(w) || !w) && wMatch) w = parseFloat(wMatch[1]);
        if ((isNaN(d) || !d) && dMatch) d = parseFloat(dMatch[1]);
      }
    }

    const result: LegoDimensions = {};
    if (!isNaN(h) && h > 0) result.height = h;
    if (!isNaN(w) && w > 0) result.width = w;
    if (!isNaN(d) && d > 0) result.depth = d;

    return Object.keys(result).length > 0 ? result : undefined;
  }
}
