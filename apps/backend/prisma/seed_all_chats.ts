import { PrismaClient, ChatType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.info('🌱 Seeding Chat Data for ALL users...');

  const users = await prisma.user.findMany();
  const host = users.find(u => u.phone === '+255622760864') || users[0];

  if (!host) {
    console.error('No users found in database!');
    return;
  }

  for (const user of users) {
    if (user.id === host.id) continue;

    // Create a direct room between host and this user
    const room = await prisma.chatRoom.create({
      data: {
        type: ChatType.direct,
        name: `Chat with ${host.firstName}`,
        members: {
          create: [
            { userId: host.id, role: 'host' },
            { userId: user.id, role: 'member' },
          ],
        },
      },
    });

    await prisma.message.create({
      data: {
        roomId: room.id,
        senderId: host.id,
        text: `Jambo ${user.firstName}! This is a test message from ToJoin Support.`,
      },
    });

    console.info(`  ✅ Room created for ${user.firstName} (ID: ${user.id})`);
  }

  console.info('✅ Global Chat seeding complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
