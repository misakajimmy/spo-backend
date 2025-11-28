import { TagModel } from '../models/tag.model';

/**
 * 关键词服务
 */
export class TagService {
  /**
   * 创建关键词
   */
  async createTag(name: string) {
    return await TagModel.create(name);
  }
  
  /**
   * 批量创建关键词
   */
  async createTags(names: string[]) {
    return await TagModel.createMany(names);
  }
  
  /**
   * 获取所有关键词
   */
  async getAllTags() {
    return await TagModel.findAll();
  }
  
  /**
   * 根据ID获取关键词
   */
  async getTag(id: number) {
    return await TagModel.findById(id);
  }
  
  /**
   * 搜索关键词
   */
  async searchTags(keyword: string) {
    return await TagModel.search(keyword);
  }
  
  /**
   * 更新关键词
   */
  async updateTag(id: number, name: string) {
    return await TagModel.update(id, name);
  }
  
  /**
   * 删除关键词
   */
  async deleteTag(id: number) {
    return await TagModel.delete(id);
  }
  
  /**
   * 批量删除关键词
   */
  async deleteTags(ids: number[]) {
    return await TagModel.deleteMany(ids);
  }
  
  /**
   * 获取主题库的关键词
   */
  async getThemeTags(themeId: number) {
    return await TagModel.getTagsByThemeId(themeId);
  }
  
  /**
   * 设置主题库的关键词
   */
  async setThemeTags(themeId: number, tagIds: number[]) {
    return await TagModel.setThemeTags(themeId, tagIds);
  }
  
  /**
   * 添加关键词到主题库
   */
  async addTagToTheme(themeId: number, tagId: number) {
    return await TagModel.addTagToTheme(themeId, tagId);
  }
  
  /**
   * 从主题库移除关键词
   */
  async removeTagFromTheme(themeId: number, tagId: number) {
    return await TagModel.removeTagFromTheme(themeId, tagId);
  }
  
  /**
   * 生成标题（从关键词）
   * @param themeId 主题库ID
   * @param count 关键词数量（默认5个）
   * @param prefix 前缀（默认#）
   * @param separator 分隔符（默认空格）
   */
  async generateTitleFromTags(
    themeId: number,
    count: number = 5,
    prefix: string = '#',
    separator: string = ' '
  ): Promise<string> {
    const tags = await TagModel.getRandomTagsByThemeId(themeId, count);
    
    if (tags.length === 0) {
      return '';
    }
    
    return tags.map(tag => `${prefix}${tag.name}`).join(separator);
  }
}
