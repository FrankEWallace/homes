import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seedAdminReplies() {
  const userId = 'cmoo8hfxx0000zy5k8fy5fw0t'; // "to join" user
  const adminId = 'cmo86q7po0006ssbco65o0l29'; // Admin/Support ID

  console.log('Finding rooms for user:', userId);

  // 1. Find all rooms where the user is a member
  const memberships = await prisma.chatMember.findMany({
    where: { userId: userId },
    include: { room: true },
  });

  console.log(`Found ${memberships.length} rooms. Seeding replies...`);

  const messages = [
    "Habari! I'm your ToJoin Support assistant. How can I help you today?",
    "I see you're interested in some adventures! Our hosts are ready for you.",
    "Karibu sana! Let me know if you have any questions about the booking process.",
    "Your profile looks great! Ready to start exploring?",
  ];

  for (const membership of memberships) {
    const roomId = membership.roomId;
    
    // Ensure admin is in the room
    await prisma.chatMember.upsert({
      where: { roomId_userId: { roomId, userId: adminId } },
      update: {},
      create: { roomId, userId: adminId, role: 'host' },
    });

    // Add a few messages
    for (const text of messages) {
      await prisma.message.create({
        data: {
          roomId: roomId,
          senderId: adminId,
          text: text,
        },
      });
    }
    console.log(`Seeded replies to room: ${roomId}`);
  }

  console.log('Seeding complete!');
}

seedAdminReplies()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
