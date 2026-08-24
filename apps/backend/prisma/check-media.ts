import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const listings = await prisma.listing.findMany({
    select: { id: true, title: true, images: true }
  });

  console.log('--- Listing Media Report ---');
  for (const l of listings) {
    const mediaCount = l.images.length;
    const videoUrls = l.images.filter(url => url.toLowerCase().endsWith('.mp4') || url.includes('video') || url.includes('cloudinary') && url.includes('/video/'));
    
    if (videoUrls.length > 0) {
      console.log(`[${l.id}] ${l.title}:`);
      console.log(`  Total Media: ${mediaCount}`);
      console.log(`  Video URLs found: ${videoUrls.length}`);
      videoUrls.forEach(url => console.log(`    - ${url}`));
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
