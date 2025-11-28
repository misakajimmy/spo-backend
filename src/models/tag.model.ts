import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 关键词数据模型
 */
export class TagModel {
  /**
   * 标准化关键词名称（去除#前缀和首尾空格）
   */
  static normalizeName(name: string): string {
    return name.replace(/^#+/, '').trim();
  }
  
  /**
   * 创建关键词
   */
  static async create(name: string) {
    const normalizedName = this.normalizeName(name);
    
    if (!normalizedName) {
      throw new Error('关键词名称不能为空');
    }
    
    // 检查是否已存在
    const existing = await prisma.tag.findUnique({
      where: { name: normalizedName },
    });
    
    if (existing) {
      throw new Error(`关键词 "${normalizedName}" 已存在`);
    }
    
    return await prisma.tag.create({
      data: { name: normalizedName },
    });
  }
  
  /**
   * 批量创建关键词（忽略已存在的）
   */
  static async createMany(names: string[]) {
    const normalizedNames = names
      .map(n => this.normalizeName(n))
      .filter(n => n.length > 0);
    
    // 获取已存在的关键词
    const existing = await prisma.tag.findMany({
      where: {
        name: { in: normalizedNames },
      },
      select: { name: true },
    });
    
    const existingSet = new Set(existing.map(e => e.name));
    const newNames = normalizedNames.filter(n => !existingSet.has(n));
    
    // 逐个创建新关键词（SQLite 不支持 skipDuplicates）
    for (const name of newNames) {
      try {
        await prisma.tag.create({ data: { name } });
      } catch (e) {
        // 忽略重复错误
      }
    }
    
    // 返回所有关键词（包括已存在的和新创建的）
    return await prisma.tag.findMany({
      where: {
        name: { in: normalizedNames },
      },
      orderBy: { name: 'asc' },
    });
  }
  
  /**
   * 获取所有关键词
   */
  static async findAll() {
    return await prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { themeTags: true },
        },
      },
    });
  }
  
  /**
   * 根据ID获取关键词
   */
  static async findById(id: number) {
    return await prisma.tag.findUnique({
      where: { id },
      include: {
        themeTags: {
          include: {
            theme: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }
  
  /**
   * 根据名称获取关键词
   */
  static async findByName(name: string) {
    const normalizedName = this.normalizeName(name);
    return await prisma.tag.findUnique({
      where: { name: normalizedName },
    });
  }
  
  /**
   * 搜索关键词
   */
  static async search(keyword: string) {
    return await prisma.tag.findMany({
      where: {
        name: {
          contains: keyword,
        },
      },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { themeTags: true },
        },
      },
    });
  }
  
  /**
   * 更新关键词
   */
  static async update(id: number, name: string) {
    const normalizedName = this.normalizeName(name);
    
    if (!normalizedName) {
      throw new Error('关键词名称不能为空');
    }
    
    // 检查是否已存在同名关键词（排除自身）
    const existing = await prisma.tag.findFirst({
      where: {
        name: normalizedName,
        NOT: { id },
      },
    });
    
    if (existing) {
      throw new Error(`关键词 "${normalizedName}" 已存在`);
    }
    
    return await prisma.tag.update({
      where: { id },
      data: { name: normalizedName },
    });
  }
  
  /**
   * 删除关键词
   */
  static async delete(id: number) {
    return await prisma.tag.delete({
      where: { id },
    });
  }
  
  /**
   * 批量删除关键词
   */
  static async deleteMany(ids: number[]) {
    return await prisma.tag.deleteMany({
      where: {
        id: { in: ids },
      },
    });
  }
  
  /**
   * 获取主题库关联的关键词
   */
  static async getTagsByThemeId(themeId: number) {
    const themeTags = await prisma.themeTag.findMany({
      where: { themeId },
      include: {
        tag: true,
      },
      orderBy: {
        tag: { name: 'asc' },
      },
    });
    
    return themeTags.map(tt => tt.tag);
  }
  
  /**
   * 设置主题库的关键词（批量）
   */
  static async setThemeTags(themeId: number, tagIds: number[]) {
    // 删除现有关联
    await prisma.themeTag.deleteMany({
      where: { themeId },
    });
    
    // 逐个创建新关联（SQLite 不支持 skipDuplicates）
    for (const tagId of tagIds) {
      try {
        await prisma.themeTag.create({
          data: { themeId, tagId },
        });
      } catch (e) {
        // 忽略重复错误
      }
    }
  }
  
  /**
   * 添加关键词到主题库
   */
  static async addTagToTheme(themeId: number, tagId: number) {
    return await prisma.themeTag.create({
      data: {
        themeId,
        tagId,
      },
    });
  }
  
  /**
   * 从主题库移除关键词
   */
  static async removeTagFromTheme(themeId: number, tagId: number) {
    return await prisma.themeTag.deleteMany({
      where: {
        themeId,
        tagId,
      },
    });
  }
  
  /**
   * 随机获取主题库的关键词
   * @param themeId 主题库ID
   * @param count 需要的数量
   * @returns 随机选取的关键词数组
   */
  static async getRandomTagsByThemeId(themeId: number, count: number = 5) {
    const tags = await this.getTagsByThemeId(themeId);
    
    if (tags.length === 0) {
      return [];
    }
    
    // 随机打乱数组
    const shuffled = tags.sort(() => Math.random() - 0.5);
    
    // 返回指定数量（不超过实际数量）
    return shuffled.slice(0, Math.min(count, tags.length));
  }
}
