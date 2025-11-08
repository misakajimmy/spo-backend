import { PrismaClient } from '@prisma/client';

// 创建全局 Prisma Client 实例
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

export default prisma;
