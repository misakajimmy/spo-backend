import { ThemeModel } from '../models/theme.model';
import { ResourceService } from '../resources/resource.service';
import { UploadService } from '../uploaders/upload.service';
import * as path from 'path';

/**
 * 主题库服务
 */
export class ThemeService {
  private resourceService: ResourceService;
  private uploadService: UploadService;
  
  constructor() {
    this.resourceService = new ResourceService();
    this.uploadService = new UploadService();
  }
  
  /**
   * 创建主题库
   */
  async createTheme(data: {
    name: string;
    description?: string;
    archiveFolderName?: string;
    accountIds?: number[];
    resourcePaths?: Array<{ libraryId: number; folderPath: string }>;
  }) {
    // 创建主题库
    const theme = await ThemeModel.create({
      name: data.name,
      description: data.description,
      archiveFolderName: data.archiveFolderName,
    });
    
    // 关联账号
    if (data.accountIds && data.accountIds.length > 0) {
      await ThemeModel.setAccounts(theme.id, data.accountIds);
    }
    
    // 添加资源路径
    if (data.resourcePaths && data.resourcePaths.length > 0) {
      await ThemeModel.setResourcePaths(theme.id, data.resourcePaths);
    }
    
    return await ThemeModel.findById(theme.id);
  }
  
  /**
   * 获取所有主题库
   */
  async getAllThemes() {
    return await ThemeModel.findAll();
  }
  
  /**
   * 获取单个主题库
   */
  async getTheme(id: number) {
    return await ThemeModel.findById(id);
  }
  
  /**
   * 更新主题库
   */
  async updateTheme(
    id: number,
    data: {
      name?: string;
      description?: string;
      archiveFolderName?: string;
      accountIds?: number[];
      resourcePaths?: Array<{ libraryId: number; folderPath: string }>;
    }
  ) {
    // 更新基本信息
    if (data.name !== undefined || data.description !== undefined || data.archiveFolderName !== undefined) {
      await ThemeModel.update(id, {
        name: data.name,
        description: data.description,
        archiveFolderName: data.archiveFolderName,
      });
    }
    
    // 更新账号关联
    if (data.accountIds !== undefined) {
      await ThemeModel.setAccounts(id, data.accountIds);
    }
    
    // 更新资源路径
    if (data.resourcePaths !== undefined) {
      await ThemeModel.setResourcePaths(id, data.resourcePaths);
    }
    
    return await ThemeModel.findById(id);
  }
  
  /**
   * 删除主题库
   */
  async deleteTheme(id: number) {
    return await ThemeModel.delete(id);
  }
  
  /**
   * 获取主题库的视频列表
   * (从所有资源路径的文件夹中获取第一层的视频文件)
   * 包含主文件夹的视频(未发布)和归档文件夹的视频(已发布)
   */
  async getThemeVideos(themeId: number) {
    const theme = await ThemeModel.findById(themeId);
    if (!theme) {
      throw new Error('主题库不存在');
    }
    
    const resourcePaths = await ThemeModel.getThemeVideos(themeId);
    const archiveFolderName = theme.archiveFolderName || 'published';
    
    const allVideos: any[] = [];
    
    // 遍历所有资源路径
    for (const resourcePath of resourcePaths) {
      try {
        // 1. 获取主文件夹下的视频(未发布)
        const mainResources = await this.resourceService.browseLibrary(
          resourcePath.libraryId,
          resourcePath.folderPath,
          {
            type: 'video',
          }
        );
        
        const mainVideos = mainResources.filter(r => r.type === 'video');
        const mainVideosWithInfo = mainVideos.map(video => ({
          ...video,
          libraryId: resourcePath.libraryId,
          libraryPath: resourcePath.folderPath,
          fullPath: `${resourcePath.folderPath}/${video.name}`,
          isPublished: false, // 主文件夹的视频标记为未发布
        }));
        
        allVideos.push(...mainVideosWithInfo);
        
        // 2. 获取归档文件夹下的视频(已发布)
        const archivePath = path.join(resourcePath.folderPath, archiveFolderName);
        try {
          const archiveResources = await this.resourceService.browseLibrary(
            resourcePath.libraryId,
            archivePath,
            {
              type: 'video',
            }
          );
          
          const archiveVideos = archiveResources.filter(r => r.type === 'video');
          const archiveVideosWithInfo = archiveVideos.map(video => ({
            ...video,
            libraryId: resourcePath.libraryId,
            libraryPath: archivePath,
            fullPath: `${archivePath}/${video.name}`,
            isPublished: true, // 归档文件夹的视频标记为已发布
          }));
          
          allVideos.push(...archiveVideosWithInfo);
        } catch (error) {
          // 归档文件夹可能不存在,忽略错误
          console.log(`归档文件夹不存在或为空: ${archivePath}`);
        }
      } catch (error) {
        console.error(`获取资源路径视频失败: ${resourcePath.folderPath}`, error);
      }
    }
    
    return allVideos;
  }
  
  /**
   * 添加账号到主题库
   */
  async addAccountToTheme(themeId: number, accountId: number) {
    return await ThemeModel.addAccount(themeId, accountId);
  }
  
  /**
   * 从主题库移除账号
   */
  async removeAccountFromTheme(themeId: number, accountId: number) {
    return await ThemeModel.removeAccount(themeId, accountId);
  }
  
  /**
   * 添加资源路径到主题库
   */
  async addResourcePathToTheme(
    themeId: number,
    libraryId: number,
    folderPath: string
  ) {
    // 验证文件夹是否存在
    try {
      const info = await this.resourceService.getResourceInfo(libraryId, folderPath);
      if (info.type !== 'folder') {
        throw new Error('指定的路径不是文件夹');
      }
    } catch (error) {
      throw new Error('文件夹不存在或无法访问');
    }
    
    return await ThemeModel.addResourcePath(themeId, libraryId, folderPath);
  }
  
  /**
   * 从主题库移除资源路径
   */
  async removeResourcePathFromTheme(pathId: number) {
    return await ThemeModel.removeResourcePath(pathId);
  }
  
  /**
   * 获取主题库统计信息
   */
  async getThemeStatistics(themeId: number) {
    const videos = await this.getThemeVideos(themeId);
    
    // 按发布状态分组
    const publishedVideos = videos.filter(v => v.isPublished);
    const unpublishedVideos = videos.filter(v => !v.isPublished);
    
    return {
      published: publishedVideos.length,    // 已发布数量
      unpublished: unpublishedVideos.length, // 未发布数量
    };
  }
  
  /**
   * 批量发布主题库下的视频
   */
  async batchPublishThemeVideos(
    themeId: number,
    options: {
      accountIds: number[];       // 要发布到的账号ID列表
      videoPaths: string[];       // 要发布的视频路径列表
      autoArchive?: boolean;      // 是否自动归档（默认 true）
      title?: string;             // 视频标题模板
      tags?: string[];            // 标签
      scheduledAt?: Date;         // 定时发布时间
    }
  ) {
    const theme = await ThemeModel.findById(themeId);
    if (!theme) {
      throw new Error('主题库不存在');
    }
    
    if (!options.accountIds || options.accountIds.length === 0) {
      throw new Error('没有指定账号');
    }
    
    if (!options.videoPaths || options.videoPaths.length === 0) {
      throw new Error('没有指定视频');
    }
    
    // 获取主题库下的所有视频
    const allVideos = await this.getThemeVideos(themeId);
    
    // 根据路径过滤视频
    const videosToPublish = allVideos.filter(video => 
      options.videoPaths.includes(video.fullPath)
    );
    
    if (videosToPublish.length === 0) {
      throw new Error('没有找到匹配的视频');
    }
    
    // 创建上传任务
    const tasks = [];
    const autoArchive = options.autoArchive !== false; // 默认 true
    
    for (const accountId of options.accountIds) {
      for (const video of videosToPublish) {
        // 生成标题（如果没有模板则使用文件名）
        const title = options.title || path.parse(video.name).name;
        
        // 创建上传任务
        const task = await this.uploadService.createTask({
          platformId: accountId,
          libraryId: video.libraryId,
          resourcePath: video.fullPath,
          title,
          tags: options.tags?.join(',') || '',
          scheduledAt: options.scheduledAt,
        });
        
        tasks.push({
          taskId: task.id,
          accountId,
          videoName: video.name,
          videoPath: video.fullPath,
          libraryId: video.libraryId,
          autoArchive,
        });
      }
    }
    
    return {
      tasks,
      totalTasks: tasks.length,
      accountCount: options.accountIds.length,
      videoCount: videosToPublish.length,
    };
  }
  
  /**
   * 执行批量发布任务并归档
   */
  async executeBatchPublish(
    themeId: number,
    taskIds: number[],
    autoArchive: boolean = true
  ) {
    const theme = await ThemeModel.findById(themeId);
    if (!theme) {
      throw new Error('主题库不存在');
    }
    
    const results = [];
    
    for (const taskId of taskIds) {
      try {
        // 执行上传
        const result = await this.uploadService.executeTask(taskId);
        
        // 如果成功且需要归档
        if (result.success && autoArchive) {
          const task = await this.uploadService.getTask(taskId);
          if (task) {
            await this.archiveVideo(
              themeId,
              task.libraryId,
              task.resourcePath
            );
          }
        }
        
        results.push({
          taskId,
          success: result.success,
          message: result.message,
        });
      } catch (error: any) {
        results.push({
          taskId,
          success: false,
          message: error.message,
        });
      }
    }
    
    return results;
  }
  
  /**
   * 归档视频（移动到归档文件夹）
   */
  async archiveVideo(
    themeId: number,
    libraryId: number,
    videoPath: string
  ) {
    const theme = await ThemeModel.findById(themeId);
    if (!theme) {
      throw new Error('主题库不存在');
    }
    
    // 获取资源库实例
    const library = await ResourceService.getLibraryInstance(libraryId);
    
    // 解析路径
    const directory = path.dirname(videoPath);
    const filename = path.basename(videoPath);
    const archiveFolderName = theme.archiveFolderName || 'published';
    const archivePath = path.join(directory, archiveFolderName);
    const targetPath = path.join(archivePath, filename);
    
    // 确保归档文件夹存在
    try {
      await library.getInfo(archivePath);
    } catch {
      // 文件夹不存在，创建它
      await library.createFolder(archivePath);
    }
    
    // 移动视频到归档文件夹
    await library.move(videoPath, targetPath);
    
    console.log(`✅ 视频已归档: ${videoPath} -> ${targetPath}`);
  }
  
  /**
   * 取消归档（从归档文件夹移回主文件夹）
   */
  async unarchiveVideo(
    themeId: number,
    libraryId: number,
    videoPath: string
  ) {
    const theme = await ThemeModel.findById(themeId);
    if (!theme) {
      throw new Error('主题库不存在');
    }
    
    // 获取资源库实例
    const library = await ResourceService.getLibraryInstance(libraryId);
    
    // 解析路径
    const directory = path.dirname(videoPath);
    const filename = path.basename(videoPath);
    const archiveFolderName = theme.archiveFolderName || 'published';
    
    // 检查视频是否在归档文件夹中
    if (!directory.endsWith(archiveFolderName)) {
      throw new Error('视频不在归档文件夹中');
    }
    
    // 计算目标路径（上一级目录）
    const parentDir = path.dirname(directory);
    const targetPath = path.join(parentDir, filename);
    
    // 移动视频回主文件夹
    await library.move(videoPath, targetPath);
    
    console.log(`✅ 视频已取消归档: ${videoPath} -> ${targetPath}`);
  }
  
  /**
   * 批量归档视频
   */
  async batchArchiveVideos(
    themeId: number,
    videoPaths: string[]
  ) {
    const theme = await ThemeModel.findById(themeId);
    if (!theme) {
      throw new Error('主题库不存在');
    }
    
    // 获取主题库下的所有视频
    const allVideos = await this.getThemeVideos(themeId);
    
    // 根据路径过滤视频
    const videosToArchive = allVideos.filter(video => 
      videoPaths.includes(video.fullPath) && !video.isPublished
    );
    
    const results = [];
    
    for (const video of videosToArchive) {
      try {
        await this.archiveVideo(themeId, video.libraryId, video.fullPath);
        results.push({
          path: video.fullPath,
          success: true,
        });
      } catch (error: any) {
        results.push({
          path: video.fullPath,
          success: false,
          message: error.message,
        });
      }
    }
    
    return {
      total: videoPaths.length,
      archived: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }
  
  /**
   * 批量取消归档视频
   */
  async batchUnarchiveVideos(
    themeId: number,
    videoPaths: string[]
  ) {
    const theme = await ThemeModel.findById(themeId);
    if (!theme) {
      throw new Error('主题库不存在');
    }
    
    // 获取主题库下的所有视频
    const allVideos = await this.getThemeVideos(themeId);
    
    // 根据路径过滤视频
    const videosToUnarchive = allVideos.filter(video => 
      videoPaths.includes(video.fullPath) && video.isPublished
    );
    
    const results = [];
    
    for (const video of videosToUnarchive) {
      try {
        await this.unarchiveVideo(themeId, video.libraryId, video.fullPath);
        results.push({
          path: video.fullPath,
          success: true,
        });
      } catch (error: any) {
        results.push({
          path: video.fullPath,
          success: false,
          message: error.message,
        });
      }
    }
    
    return {
      total: videoPaths.length,
      unarchived: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }
  
  /**
   * 格式化文件大小
   */
  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let index = 0;
    let size = bytes;
    
    while (size >= 1024 && index < units.length - 1) {
      size /= 1024;
      index++;
    }
    
    return `${size.toFixed(2)} ${units[index]}`;
  }
}
