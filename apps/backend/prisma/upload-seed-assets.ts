import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadFile(filePath: string): Promise<string> {
  const extension = path.extname(filePath).toLowerCase();
  const resourceType = (extension === '.mp4' || extension === '.mov') ? 'video' : 'image';
  
  console.log(`  Uploading ${path.basename(filePath)} as ${resourceType}...`);
  
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      {
        folder: 'tojoin/seed_migration',
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result!.secure_url);
      }
    );
  });
}

async function main() {
  console.info('🚀 Starting Cloudinary migration for local seed assets...');

  const listings = await prisma.listing.findMany();
  console.info(`Found ${listings.length} listings to process.`);

  const assetBaseDir = path.resolve(__dirname, '../../mobile/assets/seed');

  for (const listing of listings) {
    const images = listing.images as string[];
    if (!images || images.length === 0) continue;

    console.info(`Processing listing: ${listing.title} (${listing.id})`);
    
    let updated = false;
    const newImages: string[] = [];

    for (const imgPath of images) {
      if (imgPath.startsWith('assets/seed/')) {
        const fileName = imgPath.replace('assets/seed/', '');
        const fullLocalPath = path.join(assetBaseDir, fileName);

        if (fs.existsSync(fullLocalPath)) {
          try {
            const cloudinaryUrl = await uploadFile(fullLocalPath);
            newImages.push(cloudinaryUrl);
            updated = true;
          } catch (err) {
            console.error(`  ❌ Failed to upload ${fileName}:`, err);
            newImages.push(imgPath); // Keep local if failed
          }
        } else {
          console.warn(`  ⚠️ Local file not found: ${fullLocalPath}`);
          newImages.push(imgPath);
        }
      } else {
        // Already a URL or different path
        newImages.push(imgPath);
      }
    }

    if (updated) {
      await prisma.listing.update({
        where: { id: listing.id },
        data: { images: newImages },
      });
      console.info(`  ✅ Updated ${listing.title} with Cloudinary URLs.`);
    }
  }

  // Also update User avatars if they are local
  const users = await prisma.user.findMany({
    where: { avatarUrl: { startsWith: 'assets/' } }
  });

  console.info(`Found ${users.length} users with local avatars to process.`);
  for (const user of users) {
    const avatarPath = user.avatarUrl!;
    const fileName = avatarPath.split('/').pop()!;
    // For icons/avatars, we might need a different base dir if they aren't in assets/seed
    // But in seed-local-data.ts I used assets/icon/icon.png
    // Let's assume for now we only handle assets/seed/ or we check assets/icon/
    
    let localPath = '';
    if (avatarPath.startsWith('assets/seed/')) {
      localPath = path.join(assetBaseDir, fileName);
    } else if (avatarPath.startsWith('assets/icon/')) {
      localPath = path.resolve(__dirname, '../../mobile/assets/icon', fileName);
    }

    if (fs.existsSync(localPath)) {
      try {
        const cloudinaryUrl = await uploadFile(localPath);
        await prisma.user.update({
          where: { id: user.id },
          data: { avatarUrl: cloudinaryUrl },
        });
        console.info(`  ✅ Updated avatar for user ${user.email}`);
      } catch (err) {
        console.error(`  ❌ Failed to upload avatar ${fileName}:`, err);
      }
    }
  }

  console.info('🏁 Cloudinary migration complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
