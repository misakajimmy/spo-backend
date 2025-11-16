import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 主题库数据模型
 */
export class ThemeModel {
  /**
   * 创建主题库
   */
  static async create(data: {
    name: string;
    description?: string;
    archiveFolderName?: string;
  }) {
    return await prisma.theme.create({
      data,
    });
  }
  
  /**
   * 获取所有主题库
   */
  static async findAll() {
    return await prisma.theme.findMany({
      include: {
        themeAccounts: {
          include: {
            account: {
              select: {
                id: true,
                platform: true,
                accountName: true,
              },
            },
          },
        },
        resourcePaths: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  
  /**
   * 根据ID获取主题库
   */
  static async findById(id: number) {
    return await prisma.theme.findUnique({
      where: { id },
      include: {
        themeAccounts: {
          include: {
            account: {
              select: {
                id: true,
                platform: true,
                accountName: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
        resourcePaths: true,
      },
    });
  }
  
  /**
   * 更新主题库
   */
  static async update(id: number, data: {
    name?: string;
    description?: string;
    archiveFolderName?: string;
  }) {
    return await prisma.theme.update({
      where: { id },
      data,
    });
  }
  
  /**
   * 删除主题库
   */
  static async delete(id: number) {
    return await prisma.theme.delete({
      where: { id },
    });
  }
  
  /**
   * 添加账号到主题库
   */
  static async addAccount(themeId: number, accountId: number) {
    return await prisma.themeAccount.create({
      data: {
        themeId,
        accountId,
      },
    });
  }
  
  /**
   * 从主题库移除账号
   */
  static async removeAccount(themeId: number, accountId: number) {
    return await prisma.themeAccount.deleteMany({
      where: {
        themeId,
        accountId,
      },
    });
  }
  
  /**
   * 批量设置主题库的账号
   */
  static async setAccounts(themeId: number, accountIds: number[]) {
    // 删除现有关联
    await prisma.themeAccount.deleteMany({
      where: { themeId },
    });
    
    // 创建新关联
    if (accountIds.length > 0) {
      await prisma.themeAccount.createMany({
        data: accountIds.map(accountId => ({
          themeId,
          accountId,
        })),
      });
    }
  }
  
  /**
   * 添加资源路径到主题库
   */
  static async addResourcePath(
    themeId: number,
    libraryId: number,
    folderPath: string
  ) {
    return await prisma.themeResourcePath.create({
      data: {
        themeId,
        libraryId,
        folderPath,
      },
    });
  }
  
  /**
   * 从主题库移除资源路径
   */
  static async removeResourcePath(id: number) {
    return await prisma.themeResourcePath.delete({
      where: { id },
    });
  }
  
  /**
   * 批量设置主题库的资源路径
   */
  static async setResourcePaths(
    themeId: number,
    paths: Array<{ libraryId: number; folderPath: string }>
  ) {
    // 删除现有路径
    await prisma.themeResourcePath.deleteMany({
      where: { themeId },
    });
    
    // 创建新路径
    if (paths.length > 0) {
      await prisma.themeResourcePath.createMany({
        data: paths.map(path => ({
          themeId,
          ...path,
        })),
      });
    }
  }
  
  /**
   * 获取主题库的所有视频资源
   * (从资源路径中获取文件夹下一层的视频文件)
   */
  static async getThemeVideos(themeId: number) {
    const theme = await prisma.theme.findUnique({
      where: { id: themeId },
      include: {
        resourcePaths: true,
      },
    });
    
    return theme?.resourcePaths || [];
  }
}
