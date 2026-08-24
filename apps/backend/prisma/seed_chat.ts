import { PrismaClient, ChatType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const hostId = 'cmoo8hfxx0000zy5k8fy5fw0t';
  const adminId = 'cmo86q7po0006ssbco65o0l29';

  console.info('🌱 Seeding Chat Data...');

  // 1. Create a Direct Chat Room
  const room = await prisma.chatRoom.create({
    data: {
      type: ChatType.direct,
      name: 'Host & Admin Support',
      members: {
        create: [
          { userId: hostId, role: 'host' },
          { userId: adminId, role: 'admin' },
        ],
      },
    },
  });

  console.info(`  ✅ Chat Room created: ${room.id}`);

  // 2. Add some messages
  await prisma.message.createMany({
    data: [
      {
        roomId: room.id,
        senderId: hostId,
        text: 'Hello Admin, I have a question about my latest listing approval.',
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
      },
      {
        roomId: room.id,
        senderId: adminId,
        text: 'Jambo! I am checking it right now. Everything looks great so far.',
        createdAt: new Date(Date.now() - 1800000), // 30 mins ago
      },
      {
        roomId: room.id,
        senderId: hostId,
        text: 'Asante sana! Please let me know if you need any more documents.',
        createdAt: new Date(Date.now() - 600000), // 10 mins ago
      },
    ],
  });

  console.info('  ✅ Messages seeded');
  console.info('✅ Chat seeding complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
