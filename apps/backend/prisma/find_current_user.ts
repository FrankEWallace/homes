import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 5,
    select: { id: true, firstName: true, lastName: true, phone: true, updatedAt: true }
  });
  console.log('Recent Users:');
  console.log(JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
