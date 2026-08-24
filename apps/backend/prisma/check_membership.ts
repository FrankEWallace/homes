import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userId = 'cmoo8hfxx0000zy5k8fy5fw0t';
  const memberships = await prisma.chatMember.findMany({
    where: { userId },
    include: { room: true }
  });
  console.log(`Memberships for ${userId}: ${memberships.length}`);
  console.log(JSON.stringify(memberships, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
