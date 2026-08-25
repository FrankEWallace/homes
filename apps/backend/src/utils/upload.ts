import { promises as fs } from 'fs';
import path from 'path';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/** Absolute path to the local dev upload dir (served statically at /uploads). */
export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'uploads');

/**
 * Dev-only fallback when neither R2 nor Cloudinary is configured: persist the
 * file to ./uploads and return an absolute URL served by the API at /uploads.
 * Never used in production (guarded by the caller).
 */
async function saveToLocalDisk(buffer: Buffer, folder: string, publicId?: string): Promise<string> {
  const mime = detectMimeType(buffer);
  const ext = getExtension(mime) || '.bin';
  const id = (publicId && !publicId.includes('.') ? publicId : Math.random().toString(36).slice(2, 12)) + ext;
  const dir = path.join(LOCAL_UPLOAD_DIR, folder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, id), buffer);
  const base = env.API_BASE_URL.replace(/\/$/, '');
  return `${base}/uploads/${folder}/${id}`;
}

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

const r2Client = env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_ACCOUNT_ID
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    })
  : null;

function detectMimeType(buffer: Buffer): string {
  if (buffer.length > 4) {
    const hex = buffer.toString('hex', 0, 4).toUpperCase();
    if (hex === '89504E47') return 'image/png';
    if (hex.startsWith('FFD8FF')) return 'image/jpeg';
    if (hex === '47494638') return 'image/gif';
    if (hex === '25504446') return 'application/pdf';
    if (buffer.toString('utf8', 8, 12) === 'WEBP') return 'image/webp';
  }
  return 'application/octet-stream';
}

function getExtension(mimeType: string): string {
  switch (mimeType) {
    case 'image/png': return '.png';
    case 'image/jpeg': return '.jpg';
    case 'image/gif': return '.gif';
    case 'image/webp': return '.webp';
    case 'application/pdf': return '.pdf';
    default: return '';
  }
}

// Public media uploads (listing photos, avatars, chat media)
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB for videos/audio
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image, audio, and video files are allowed'));
    }
  },
});

// KYC document uploads — accepts images + PDFs up to 10 MB
export const uploadKyc = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter(_req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('KYC documents must be JPEG, PNG, WebP, or PDF'));
    }
  },
});

export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  publicId?: string,
  resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto',
): Promise<string> {
  if (r2Client) {
    const mime = detectMimeType(buffer);
    const ext = getExtension(mime);
    const id = publicId || Math.random().toString(36).substring(2, 15);
    const filename = id.includes('.') ? id : `${id}${ext}`;
    const key = `tojoin/${folder}/${filename}`;

    await r2Client.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME!,
        Key: key,
        Body: buffer,
        ContentType: mime,
      })
    );

    return `${env.R2_PUBLIC_CDN_URL}/${key}`;
  }

  if (!env.CLOUDINARY_CLOUD_NAME) {
    // Dev fallback: store on local disk so agents can upload without cloud creds.
    if (env.NODE_ENV !== 'production') {
      return saveToLocalDisk(buffer, folder, publicId);
    }
    throw new AppError(503, 'Image upload service is not configured');
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `tojoin/${folder}`,
        public_id: publicId,
        resource_type: resourceType,
        transformation: resourceType === 'image' ? [{ quality: 'auto', fetch_format: 'auto' }] : undefined,
      },
      (error, result) => {
        if (error || !result) {
          return reject(error ?? new Error('Cloudinary upload returned no result'));
        }
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}

/**
 * Upload a KYC document to a private Cloudflare R2 bucket or private Cloudinary folder.
 * The returned value is the file key / public_id.
 */
export async function uploadPrivateDocument(
  buffer: Buffer,
  mimetype: string,
  folder: string,
  publicId: string,
): Promise<string> {
  if (r2Client) {
    const ext = getExtension(mimetype);
    const filename = publicId.includes('.') ? publicId : `${publicId}${ext}`;
    const key = `tojoin/private/${folder}/${filename}`;

    await r2Client.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME!,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
      })
    );

    return key;
  }

  if (!env.CLOUDINARY_CLOUD_NAME) {
    throw new AppError(503, 'Image upload service is not configured');
  }

  const resourceType = mimetype === 'application/pdf' ? 'raw' : 'image';

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `tojoin/${folder}`,
        public_id: publicId,
        resource_type: resourceType,
        type: 'private', // not publicly accessible without a signed URL
      },
      (error, result) => {
        if (error || !result) {
          return reject(error ?? new Error('Cloudinary upload returned no result'));
        }
        resolve(result.public_id);
      },
    );
    stream.end(buffer);
  });
}

/** Generate a time-limited signed download URL for a private KYC document. */
export async function signedDocumentUrl(
  publicId: string,
  mimetype: string,
  expiresInSeconds = 3600,
): Promise<string> {
  if (r2Client && publicId.startsWith('tojoin/private/')) {
    const command = new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME!,
      Key: publicId,
    });
    return getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
  }

  const resourceType = mimetype === 'application/pdf' ? 'raw' : 'image';
  const format = mimetype.split('/')[1] || 'jpg';
  
  return cloudinary.utils.private_download_url(publicId, format, {
    resource_type: resourceType,
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    attachment: false,
    type: 'private',
  });
}
