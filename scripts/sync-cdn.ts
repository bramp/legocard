import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  type _Object,
} from '@aws-sdk/client-s3';
import mime from 'mime-types';

dotenv.config();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'legocard-media';
const MEDIA_BASE_URL = (process.env.MEDIA_BASE_URL || 'https://legocard-media.bramp.net').replace(/\/$/, '');

const MEDIA_DIRECTORIES = [
  { dir: path.resolve(process.cwd(), 'data/images'), prefix: 'images' },
  { dir: path.resolve(process.cwd(), 'data/audio'), prefix: 'audio' },
  { dir: path.resolve(process.cwd(), 'data/videos'), prefix: 'videos' },
];

function checkCredentials(): boolean {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.error('❌ Error: Cloudflare R2 credentials are missing in .env.');
    console.error('');
    console.error('Please add the following variables to your .env file:');
    console.error('  R2_ACCOUNT_ID=your_cloudflare_account_id');
    console.error('  R2_ACCESS_KEY_ID=your_r2_access_key_id');
    console.error('  R2_SECRET_ACCESS_KEY=your_r2_secret_access_key');
    console.error('  R2_BUCKET_NAME=legocard-media');
    console.error('  MEDIA_BASE_URL=https://legocard-media.bramp.net');
    console.error('');
    console.error('💡 To get these credentials:');
    console.error('  1. Open Cloudflare Dashboard -> R2 -> "Manage R2 API Tokens"');
    console.error('  2. Create a token with "Admin Read & Write" permissions for your bucket.');
    console.error('  3. Copy the Account ID, Access Key ID, and Secret Access Key.');
    return false;
  }
  return true;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

async function listAllRemoteObjects(s3: S3Client, bucket: string): Promise<Map<string, number>> {
  const remoteMap = new Map<string, number>();
  let continuationToken: string | undefined = undefined;

  console.log(`🔍 Indexing existing objects in R2 bucket "${bucket}"...`);

  try {
    do {
      const res = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          ContinuationToken: continuationToken,
        })
      );

      if (res.Contents) {
        for (const obj of res.Contents) {
          if (obj.Key && obj.Size !== undefined) {
            remoteMap.set(obj.Key, obj.Size);
          }
        }
      }

      continuationToken = res.NextContinuationToken;
    } while (continuationToken);

    console.log(`   Found ${remoteMap.size} remote objects in bucket.`);
  } catch (err: any) {
    if (err.name === 'NoSuchBucket') {
      console.error(`❌ Bucket "${bucket}" does not exist. Please create it first in Cloudflare R2.`);
      process.exit(1);
    }
    throw err;
  }

  return remoteMap;
}

interface LocalFile {
  localPath: string;
  key: string;
  size: number;
}

function scanLocalMediaFiles(): LocalFile[] {
  const files: LocalFile[] = [];

  for (const { dir, prefix } of MEDIA_DIRECTORIES) {
    if (!fs.existsSync(dir)) continue;

    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      if (entry.startsWith('.') || entry.endsWith('.backup')) continue;
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isFile()) {
        files.push({
          localPath: fullPath,
          key: `${prefix}/${entry}`,
          size: stat.size,
        });
      }
    }
  }

  return files;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');

  console.log('☁️  LegoCard Cloudflare R2 Asset Sync');
  console.log(`   Bucket: ${R2_BUCKET_NAME}`);
  console.log(`   Public Domain: ${MEDIA_BASE_URL}`);
  if (dryRun) console.log('   Mode: DRY RUN (no files will be uploaded)');
  if (force) console.log('   Mode: FORCE (all files will be re-uploaded)');
  console.log('--------------------------------------------------');

  if (!checkCredentials()) {
    process.exit(1);
  }

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  });

  const remoteObjects = force ? new Map<string, number>() : await listAllRemoteObjects(s3, R2_BUCKET_NAME);
  const localFiles = scanLocalMediaFiles();

  console.log(`\n📂 Found ${localFiles.length} local media files across data/ directories.`);

  const toUpload: LocalFile[] = [];
  let alreadySyncedSize = 0;

  for (const file of localFiles) {
    const remoteSize = remoteObjects.get(file.key);
    if (!force && remoteSize !== undefined && remoteSize === file.size) {
      alreadySyncedSize += file.size;
      continue;
    }
    toUpload.push(file);
  }

  const skippedCount = localFiles.length - toUpload.length;
  console.log(`   ✓ ${skippedCount} files already in sync (${formatBytes(alreadySyncedSize)})`);

  if (toUpload.length === 0) {
    console.log('\n🎉 All media files are already up to date on Cloudflare R2!');
    return;
  }

  const totalUploadBytes = toUpload.reduce((acc, f) => acc + f.size, 0);
  console.log(`   ⬆️  ${toUpload.length} files to upload (${formatBytes(totalUploadBytes)})\n`);

  let uploadedCount = 0;
  let uploadedBytes = 0;

  for (let i = 0; i < toUpload.length; i++) {
    const file = toUpload[i];
    const mimeType = mime.lookup(file.localPath) || 'application/octet-stream';
    const progress = `[${i + 1}/${toUpload.length}]`;

    console.log(`${progress} Uploading ${file.key} (${formatBytes(file.size)}, ${mimeType})...`);

    if (!dryRun) {
      const fileStream = fs.createReadStream(file.localPath);
      await s3.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: file.key,
          Body: fileStream,
          ContentType: mimeType,
          ContentLength: file.size,
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );
    }

    uploadedCount++;
    uploadedBytes += file.size;
  }

  console.log('\n--------------------------------------------------');
  console.log(`🎉 Successfully ${dryRun ? 'verified' : 'synced'} ${uploadedCount} files (${formatBytes(uploadedBytes)}) to Cloudflare R2!`);
  console.log(`🔗 Accessible at: ${MEDIA_BASE_URL}/<key>`);
}

main().catch((err) => {
  console.error('\n❌ Fatal error during CDN sync:', err);
  process.exit(1);
});
