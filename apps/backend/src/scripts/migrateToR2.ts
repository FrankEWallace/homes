import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID!,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
  },
});

function getMimeFromExtension(ext: string): string {
  switch (ext.toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.mp4':
      return 'video/mp4';
    case '.pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

async function uploadLocalFile(localPath: string, r2Key: string): Promise<string> {
  const buffer = fs.readFileSync(localPath);
  const ext = path.extname(localPath);
  const mime = getMimeFromExtension(ext);

  console.log(`Uploading local file ${path.basename(localPath)} -> R2 Key: ${r2Key} (${mime})`);
  await r2.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME!,
      Key: r2Key,
      Body: buffer,
      ContentType: mime,
    })
  );

  return `${env.R2_PUBLIC_CDN_URL}/${r2Key}`;
}

const AVATAR_UNSPLASH_URLS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400&auto=format&fit=crop',
];

async function downloadAndUploadAvatar(url: string, index: number): Promise<string> {
  const r2Key = `tojoin/avatars/avatar-seed-${index}.jpg`;
  console.log(`Downloading avatar seed: ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download avatar: ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await r2.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME!,
      Key: r2Key,
      Body: buffer,
      ContentType: 'image/jpeg',
    })
  );
  return `${env.R2_PUBLIC_CDN_URL}/${r2Key}`;
}

// Simple hash function to deterministically map an ID to an array index
function getDeterministicIndex(id: string, max: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % max;
}

async function startMigration() {
  console.log('🔄 Starting Cloudinary to Cloudflare R2 Migration & Seeding...');

  // 1. Upload Local Cities to R2
  const citiesDir = path.resolve(__dirname, '../../../mobile/assets/cities');
  const cityFiles = fs.readdirSync(citiesDir);
  const cityR2Urls: Record<string, string> = {};

  console.log('\n🏙️ Uploading City assets to R2...');
  for (const filename of cityFiles) {
    const localPath = path.join(citiesDir, filename);
    if (fs.statSync(localPath).isFile()) {
      const r2Key = `tojoin/cities/${filename}`;
      const r2Url = await uploadLocalFile(localPath, r2Key);
      const baseNameWithoutExt = path.basename(filename, path.extname(filename)).toLowerCase();
      cityR2Urls[baseNameWithoutExt] = r2Url;
    }
  }

  // 2. Upload Local Seed Images to R2 (Listings Pool)
  const seedDir = path.resolve(__dirname, '../../../mobile/assets/seed');
  const seedFiles = fs.readdirSync(seedDir);
  const listingSeedR2Urls: string[] = [];

  console.log('\n🏨 Uploading Listing seed assets to R2...');
  for (const filename of seedFiles) {
    const localPath = path.join(seedDir, filename);
    if (fs.statSync(localPath).isFile()) {
      const r2Key = `tojoin/listings/${filename}`;
      const r2Url = await uploadLocalFile(localPath, r2Key);
      listingSeedR2Urls.push(r2Url);
    }
  }

  // 3. Download and Upload Avatars
  console.log('\n👤 Uploading Avatar seed assets to R2...');
  const avatarR2Urls: string[] = [];
  for (let i = 0; i < AVATAR_UNSPLASH_URLS.length; i++) {
    try {
      const r2Url = await downloadAndUploadAvatar(AVATAR_UNSPLASH_URLS[i], i);
      avatarR2Urls.push(r2Url);
    } catch (err: any) {
      console.error(`❌ Failed to upload avatar seed ${i}:`, err.message);
    }
  }

  // 4. Update Cities in DB
  console.log('\n🏙️ Updating Cities in database...');
  const dbCities = await prisma.city.findMany();
  for (const city of dbCities) {
    let targetKey = city.slug.toLowerCase();
    // Special mapping for dar-es-salaam -> daresalam
    if (targetKey === 'dar-es-salaam') {
      targetKey = 'daresalam';
    }
    const r2Url = cityR2Urls[targetKey] || cityR2Urls['zanzibar'];
    if (r2Url) {
      await prisma.city.update({
        where: { id: city.id },
        data: { imageUrl: r2Url },
      });
      console.log(`✅ City ${city.name} imageUrl updated to ${r2Url}`);
    }
  }

  // 5. Update User Avatars in DB
  console.log('\n👤 Updating User Avatars in database...');
  const users = await prisma.user.findMany({
    where: { avatarUrl: { not: null } },
  });
  for (const user of users) {
    if (!user.avatarUrl) continue;
    const isCloudinaryOrRelative = user.avatarUrl.includes('cloudinary.com') || !user.avatarUrl.startsWith('http');
    if (isCloudinaryOrRelative) {
      const idx = getDeterministicIndex(user.id, avatarR2Urls.length);
      const r2Url = avatarR2Urls[idx];
      await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: r2Url },
      });
      console.log(`✅ User ${user.firstName} avatarUrl updated to ${r2Url}`);
    }
  }

  // 6. Update Categories in DB
  console.log('\n📁 Updating Category Icons in database...');
  const categories = await prisma.category.findMany({
    where: { iconUrl: { not: null } },
  });
  for (const cat of categories) {
    if (!cat.iconUrl) continue;
    if (cat.iconUrl.includes('cloudinary.com') || !cat.iconUrl.startsWith('http')) {
      const idx = getDeterministicIndex(cat.id, listingSeedR2Urls.length);
      const r2Url = listingSeedR2Urls[idx];
      await prisma.category.update({
        where: { id: cat.id },
        data: { iconUrl: r2Url },
      });
      console.log(`✅ Category ${cat.name} iconUrl updated to ${r2Url}`);
    }
  }

  // 7. Update Listing Types in DB
  console.log('\n🏷️ Updating Listing Type Icons in database...');
  const dbListingTypes = await prisma.listingType.findMany({
    where: { iconUrl: { not: null } },
  });
  for (const lt of dbListingTypes) {
    if (!lt.iconUrl) continue;
    if (lt.iconUrl.includes('cloudinary.com') || !lt.iconUrl.startsWith('http')) {
      const idx = getDeterministicIndex(lt.id, listingSeedR2Urls.length);
      const r2Url = listingSeedR2Urls[idx];
      await prisma.listingType.update({
        where: { id: lt.id },
        data: { iconUrl: r2Url },
      });
      console.log(`✅ ListingType ${lt.name} iconUrl updated to ${r2Url}`);
    }
  }

  // 8. Update Listings in DB
  console.log('\n🏨 Updating Listings images in database...');
  const listings = await prisma.listing.findMany();
  for (const listing of listings) {
    if (!listing.images || listing.images.length === 0) continue;
    const newImages: string[] = [];
    let updated = false;

    for (let i = 0; i < listing.images.length; i++) {
      const img = listing.images[i];
      const isCloudinaryOrRelative = img.includes('cloudinary.com') || !img.startsWith('http');
      if (isCloudinaryOrRelative) {
        // Deterministically assign an image from the R2 listings seed pool
        const idx = getDeterministicIndex(`${listing.id}-${i}`, listingSeedR2Urls.length);
        const r2Url = listingSeedR2Urls[idx];
        newImages.push(r2Url);
        updated = true;
      } else {
        newImages.push(img);
      }
    }

    if (updated) {
      await prisma.listing.update({
        where: { id: listing.id },
        data: { images: newImages },
      });
      console.log(`✅ Listing "${listing.title}" images updated to [${newImages.join(', ')}]`);
    }
  }

  console.log('\n🎉 Cloudinary to Cloudflare R2 Migration & Seeding script completed successfully!');
}

startMigration()
  .catch((err) => console.error('Migration crashed:', err))
  .finally(() => prisma.$disconnect());
