import { PrismaClient, UserRole, ListingStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.info('🌱 Seeding 15 high-fidelity local Tanzanian experiences...');

  // 1. Get Categories
  const categories = await prisma.category.findMany();
  const getCatId = (slug: string) => categories.find((c) => c.slug === slug)?.id;

  // 2. Ensure Local Admin Host exists
  const password = await bcrypt.hash('ToJoinLocal@2026', 12);
  const localHost = await prisma.user.upsert({
    where: { phone: '+255700000020' },
    update: { avatarUrl: 'assets/icon/icon.png' },
    create: {
      phone: '+255700000020',
      phoneVerified: true,
      email: 'local@tojoin.co.tz',
      firstName: 'ToJoin',
      lastName: 'Local',
      role: UserRole.host,
      businessName: 'ToJoin Local Adventures',
      passwordHash: password,
      kycStatus: 'approved',
      avatarUrl: 'assets/icon/icon.png'
    },
  });

  // 3. Define 15 Experiences with Real Map Data and Local Assets
  const experiences = [
    {
      title: 'Serengeti Great Migration Safari',
      slug: 'serengeti-migration-safari',
      description: 'Witness the worlds largest terrestrial mammal migration. A breathtaking journey through the endless plains of the Serengeti.',
      priceAmount: 480000,
      category: 'safaris',
      type: 'safari',
      city: 'Serengeti',
      locationName: 'Serengeti National Park',
      lat: -2.3333,
      lng: 34.8333,
      isFeatured: true,
      images: [
        'assets/seed/Witness the Magic_ Serengeti Calving Season Guide.jpg',
        'assets/seed/serengeti2.mp4',
        'assets/seed/serengeti.jpg',
        'assets/seed/wild and free.jpg'
      ]
    },
    {
      title: 'Zanzibar Stone Town & Spice Tour',
      slug: 'zanzibar-stone-town-spice',
      description: 'Explore the winding alleys of Stone Town and discover why Zanzibar is known as the Spice Island.',
      priceAmount: 120000,
      category: 'tours',
      type: 'tour',
      city: 'Zanzibar City',
      locationName: 'Stone Town',
      lat: -6.1659,
      lng: 39.2026,
      isFeatured: true,
      images: [
        'assets/seed/zanzibar 1.jpg',
        'assets/seed/Zanzibar tableau😆🩷🌺✈️.jpg',
        'assets/seed/zanzibar from the skies☀️.jpg',
        'assets/seed/zanzibar_turtles.mp4'
      ]
    },
    {
      title: 'Dar es Salaam City Skyline Walk',
      slug: 'dar-city-skyline-walk',
      description: 'A guided walk through the modern heart of Dar es Salaam, exploring its architecture and hidden gems.',
      priceAmount: 45000,
      category: 'tours',
      type: 'tour',
      city: 'Dar es Salaam',
      locationName: 'City Center',
      lat: -6.7924,
      lng: 39.2083,
      isFeatured: false,
      images: [
        'assets/seed/Magnificent city of Dar es Salaam, Tanzania 🇹🇿__This is Africa_.jpg',
        'assets/seed/dar_beach.mp4',
        'assets/seed/daresalam_beach.jpg'
      ]
    },
    {
      title: 'Arusha Cultural Music Night',
      slug: 'arusha-cultural-music',
      description: 'Join us for an evening of traditional Tanzanian drumming and dance around a massive campfire in Arusha.',
      priceAmount: 35000,
      category: 'events',
      type: 'event',
      city: 'Arusha',
      locationName: 'Mount Meru Foothills',
      lat: -3.3731,
      lng: 36.6853,
      isFeatured: true,
      images: [
        'assets/seed/drums.jpg',
        'assets/seed/campfire_arusha.jpg',
        'assets/seed/camp_fire.jpg'
      ]
    },
    {
      title: 'Lake Manyara Flamingo Safari',
      slug: 'manyara-flamingo-safari',
      description: 'Discover the pink-hued shores of Lake Manyara, home to thousands of flamingos and tree-climbing lions.',
      priceAmount: 260000,
      category: 'safaris',
      type: 'safari',
      city: 'Manyara',
      locationName: 'Lake Manyara National Park',
      lat: -3.5833,
      lng: 35.8333,
      isFeatured: false,
      images: [
        'assets/seed/manyara.mp4',
        'assets/seed/tanzania_beuty.jpg',
        'assets/seed/Tanzania.jpg'
      ]
    },
    {
      title: 'Ruaha River Elephant Tracking',
      slug: 'ruaha-elephant-tracking-v2',
      description: 'Follow the ancient elephant paths along the Ruaha River in Tanzanias largest national park.',
      priceAmount: 340000,
      category: 'safaris',
      type: 'safari',
      city: 'Iringa',
      locationName: 'Ruaha National Park',
      lat: -7.6333,
      lng: 34.8333,
      isFeatured: false,
      images: [
        'assets/seed/ruaha_elephants.mp4',
        'assets/seed/Hakuna matata 🍃.jpg',
        'assets/seed/serengeti3.mp4'
      ]
    },
    {
      title: 'Pongwe Beach Sunset Party',
      slug: 'pongwe-sunset-party',
      description: 'The ultimate beach event in Zanzibar. Music, fresh seafood, and the most beautiful sunset in the Indian Ocean.',
      priceAmount: 75000,
      category: 'events',
      type: 'event',
      city: 'Zanzibar',
      locationName: 'Pongwe Beach',
      lat: -6.0428,
      lng: 39.4000,
      isFeatured: true,
      images: [
        'assets/seed/Pongwe beach, Zanzibar_ #TravelAfrica #Zanzibar.jpg',
        'assets/seed/zanizbar_pebbels.jpg',
        'assets/seed/zanzibar2.jpg'
      ]
    },
    {
      title: 'Kazimzumbwi Forest Hiking Expedition',
      slug: 'kazimzumbwi-forest-hike',
      description: 'Escape the city heat with a refreshing hike through the ancient Kazimzumbwi Forest Reserve near Dar es Salaam.',
      priceAmount: 30000,
      category: 'tours',
      type: 'tour',
      city: 'Kisarawe',
      locationName: 'Kazimzumbwi Forest',
      lat: -6.9800,
      lng: 39.0500,
      isFeatured: false,
      images: [
        'assets/seed/kazimzumbwi_forest.jpg',
        'assets/seed/Tanzania.jpg',
        'assets/seed/Hakuna matata 🍃.jpg'
      ]
    },
    {
      title: 'Tanzanian Coastal Market Experience',
      slug: 'coastal-market-tour',
      description: 'Immerse yourself in the sights, sounds, and smells of a traditional East African coastal market.',
      priceAmount: 25000,
      category: 'tours',
      type: 'tour',
      city: 'Tanga',
      locationName: 'Tanga Market',
      lat: -5.0667,
      lng: 39.1000,
      isFeatured: false,
      images: [
        'assets/seed/coast_market.jpg',
        'assets/seed/daresalam_beach.jpg',
        'assets/seed/zanizbar_pebbels.jpg'
      ]
    },
    {
      title: 'Dodoma Wine & Food Festival',
      slug: 'dodoma-food-festival',
      description: 'Taste the best of Tanzanias central region. Local wines, traditional dishes, and live entertainment.',
      priceAmount: 40000,
      category: 'events',
      type: 'event',
      city: 'Dodoma',
      locationName: 'Nyerere Square',
      lat: -6.1722,
      lng: 35.7397,
      isFeatured: false,
      images: [
        'assets/seed/camp_fire.jpg',
        'assets/seed/drums.jpg',
        'assets/seed/tanzania_beuty.jpg'
      ]
    },
    {
      title: 'Mwanza Rock City Adventure',
      slug: 'mwanza-rock-city',
      description: 'Explore the unique rock formations of Mwanza on the shores of Lake Victoria.',
      priceAmount: 85000,
      category: 'tours',
      type: 'tour',
      city: 'Mwanza',
      locationName: 'Bismarck Rock',
      lat: -2.5167,
      lng: 32.9000,
      isFeatured: false,
      images: [
        'assets/seed/Hakuna matata 🍃.jpg',
        'assets/seed/tanzania_beuty.jpg',
        'assets/seed/Tanzania.jpg'
      ]
    },
    {
      title: 'Selous River Safari',
      slug: 'selous-river-safari',
      description: 'A unique boat safari experience in the Selous Game Reserve, encountering hippos and crocodiles.',
      priceAmount: 390000,
      category: 'safaris',
      type: 'safari',
      city: 'Selous',
      locationName: 'Rufiji River',
      lat: -9.0000,
      lng: 37.5000,
      isFeatured: false,
      images: [
        'assets/seed/ruaha_elephants.mp4',
        'assets/seed/serengeti3.mp4',
        'assets/seed/wild and free.jpg'
      ]
    },
    {
      title: 'Ngorongoro Crater Day Trip',
      slug: 'ngorongoro-crater-trip',
      description: 'Descend into the worlds largest inactive volcanic caldera for an unparalleled wildlife viewing experience.',
      priceAmount: 420000,
      category: 'safaris',
      type: 'safari',
      city: 'Ngorongoro',
      locationName: 'Ngorongoro Conservation Area',
      lat: -3.2389,
      lng: 35.4853,
      isFeatured: true,
      images: [
        'assets/seed/serengeti.jpg',
        'assets/seed/serengeti2.mp4',
        'assets/seed/Witness the Magic_ Serengeti Calving Season Guide.jpg'
      ]
    },
    {
      title: 'Bagamoyo Arts & Drumming Workshop',
      slug: 'bagamoyo-drumming-workshop',
      description: 'Learn the rhythms of the coast in the historic town of Bagamoyo, the center of East African arts.',
      priceAmount: 50000,
      category: 'events',
      type: 'event',
      city: 'Bagamoyo',
      locationName: 'Tasuba Arts Institute',
      lat: -6.4403,
      lng: 38.9047,
      isFeatured: false,
      images: [
        'assets/seed/drums.jpg',
        'assets/seed/campfire_arusha.jpg',
        'assets/seed/Zanzibar tableau😆🩷🌺✈️.jpg'
      ]
    },
    {
      title: 'Nungwi Beach Moonlight Gala',
      slug: 'nungwi-moonlight-gala',
      description: 'An elegant evening event on the northern tip of Zanzibar. Fine dining and live jazz under the full moon.',
      priceAmount: 150000,
      category: 'events',
      type: 'event',
      city: 'Zanzibar',
      locationName: 'Nungwi Beach',
      lat: -5.7233,
      lng: 39.2964,
      isFeatured: false,
      images: [
        'assets/seed/zanzibar 1.jpg',
        'assets/seed/zanzibar from the skies☀️.jpg',
        'assets/seed/zanizbar_pebbels.jpg'
      ]
    }
  ];

  // 4. Upsert Listings
  const discountMap: Record<string, number> = {
    'serengeti-migration-safari': 15,
    'zanzibar-stone-town-spice': 20,
    'pongwe-sunset-party': 10,
    'ngorongoro-crater-trip': 12,
    'selous-river-safari': 25,
    'arusha-cultural-music': 18,
    'nungwi-moonlight-gala': 30,
  };

  for (const exp of experiences) {
    const catId = getCatId(exp.category);
    const discount = discountMap[exp.slug] ?? 0;
    
    const defaultMetadata = {
      importantInfo: 'Please carry your original identification documents (Passport/National ID). Warm layered clothing is highly recommended for morning game drives and evening walks. Please arrive at least 15 minutes prior to the scheduled departure time.',
      childPolicy: 'Children under 5 years of age are granted complimentary access. Parental supervision is strictly mandated across all remote viewing regions and open transport vehicles.',
      facilities: 'High-speed Wi-Fi accessible at central hospitality lodges, dedicated luggage lockers, multi-cuisine dining options, inclusive emergency medical assistance, and fully secured valet parking spaces.',
      includes: [
        'Certified Professional Guide',
        'Private Transportation',
        'Traditional Meals & Drinks',
        'Photography Assistance',
        'Hotel Pickup & Dropoff',
        'Park/Entry Fees Included',
      ],
    };

    await prisma.listing.upsert({
      where: { slug: exp.slug },
      update: { 
        discount,
        metadata: defaultMetadata,
      },
      create: {
        hostId: localHost.id,
        categoryId: catId,
        type: exp.type,
        status: ListingStatus.approved,
        title: exp.title,
        description: exp.description,
        slug: exp.slug,
        priceAmount: exp.priceAmount,
        priceCurrency: 'TZS',
        priceUnit: 'per_person',
        locationName: exp.locationName,
        city: exp.city,
        latitude: exp.lat,
        longitude: exp.lng,
        capacityMax: 20,
        images: exp.images,
        isFeatured: exp.isFeatured,
        discount,
        isBuddySearchEnabled: true,
        metadata: defaultMetadata,
      },
    });
  }

  console.info(`✅ Successfully seeded ${experiences.length} local Tanzanian experiences with real assets and map data.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
