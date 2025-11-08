import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./data/test.db',
    },
  },
});

export async function resetDatabase() {
  // 清空所有表
  await prisma.platformAccount.deleteMany();
}

export async function closeDatabase() {
  await prisma.$disconnect();
}

export { prisma };
