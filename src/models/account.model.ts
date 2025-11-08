import prisma from './prisma';
import { PlatformAccount as PrismaPlatformAccount } from '@prisma/client';
import { Platform, PlatformAccountInfo } from '../types';

export class AccountModel {
  // 创建账号
  static async create(data: {
    platform: Platform;
    accountName: string;
    accountId?: string;
    cookiePath: string;
    isActive?: boolean;
  }): Promise<PrismaPlatformAccount> {
    return await prisma.platformAccount.create({
      data: {
        platform: data.platform,
        accountName: data.accountName,
        accountId: data.accountId,
        cookiePath: data.cookiePath,
        isActive: data.isActive ?? true,
      },
    });
  }

  // 查询所有账号
  static async findAll(): Promise<PrismaPlatformAccount[]> {
    return await prisma.platformAccount.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // 根据 ID 查询账号
  static async findById(id: number): Promise<PrismaPlatformAccount | null> {
    return await prisma.platformAccount.findUnique({
      where: { id },
    });
  }

  // 根据平台查询账号
  static async findByPlatform(platform: Platform): Promise<PrismaPlatformAccount[]> {
    return await prisma.platformAccount.findMany({
      where: { platform },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // 更新账号
  static async update(
    id: number,
    data: {
      platform?: string;
      accountName?: string;
      accountId?: string | null;
      cookiePath?: string;
      isActive?: boolean;
    }
  ): Promise<PrismaPlatformAccount> {
    return await prisma.platformAccount.update({
      where: { id },
      data,
    });
  }

  // 删除账号
  static async delete(id: number): Promise<PrismaPlatformAccount> {
    return await prisma.platformAccount.delete({
      where: { id },
    });
  }
}
