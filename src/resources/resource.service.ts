import { ResourceLibraryModel } from './resource.model';
import { ResourceLibraryFactory } from './factory';
import { 
  IResourceLibrary,
  ResourceInfo,
  ResourceType,
  LibraryType,
  BrowseOptions,
  SearchOptions
} from './types';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { Readable } from 'stream';

export class ResourceService {
  private static libraryInstances: Map<number, IResourceLibrary> = new Map();
  
  // 获取资源库实例（带缓存）
  static async getLibraryInstance(libraryId: number): Promise<IResourceLibrary> {
    // 检查缓存
    if (this.libraryInstances.has(libraryId)) {
      return this.libraryInstances.get(libraryId)!;
    }
    
    // 从数据库获取配置
    const libraryConfig = await ResourceLibraryModel.findById(libraryId);
    if (!libraryConfig) {
      throw new Error(`资源库 ${libraryId} 不存在`);
    }
    
    if (!libraryConfig.isActive) {
      throw new Error(`资源库 ${libraryConfig.name} 未激活`);
    }
    
    // 创建实例
    const instance = ResourceLibraryFactory.create(
      libraryConfig.type as LibraryType,
      libraryConfig.config
    );
    
    // 缓存实例
    this.libraryInstances.set(libraryId, instance);
    
    return instance;
  }
  
  // 清除实例缓存
  static clearCache(libraryId?: number) {
    if (libraryId) {
      this.libraryInstances.delete(libraryId);
    } else {
      this.libraryInstances.clear();
    }
  }
  
  // 创建资源库配置
  async createLibrary(data: {
    name: string;
    type: LibraryType;
    config: any;
    isDefault?: boolean;
  }) {
    // 验证配置
    const testInstance = ResourceLibraryFactory.create(data.type, data.config);
    const isValid = await testInstance.test();
    
    if (!isValid) {
      throw new Error('资源库配置无效或无法连接');
    }
    
    // 保存到数据库
    return await ResourceLibraryModel.create(data);
  }
  
  // 测试资源库连接
  async testLibrary(libraryId: number): Promise<boolean> {
    try {
      const instance = await ResourceService.getLibraryInstance(libraryId);
      return await instance.test();
    } catch (error) {
      console.error('测试资源库连接失败:', error);
      return false;
    }
  }
  
  // 获取所有资源库配置
  async getAllLibraries() {
    return await ResourceLibraryModel.findAll();
  }
  
  // 获取激活的资源库
  async getActiveLibraries() {
    return await ResourceLibraryModel.findActive();
  }
  
  // 更新资源库配置
  async updateLibrary(id: number, data: any) {
    // 如果更新了配置，清除缓存
    if (data.config) {
      ResourceService.clearCache(id);
    }
    
    return await ResourceLibraryModel.update(id, data);
  }
  
  // 删除资源库
  async deleteLibrary(id: number) {
    ResourceService.clearCache(id);
    return await ResourceLibraryModel.delete(id);
  }
  
  // 浏览资源库
  async browseLibrary(
    libraryId: number,
    path: string = '',
    options?: {
      type?: ResourceType;
      sortBy?: 'name' | 'size' | 'date';
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<ResourceInfo[]> {
    const instance = await ResourceService.getLibraryInstance(libraryId);
    let resources = await instance.list(path);
    
    // 过滤类型
    if (options?.type) {
      resources = resources.filter(r => r.type === options.type);
    }
    
    // 排序（如果实例没有排序的话）
    if (options?.sortBy) {
      resources.sort((a, b) => {
        let compareValue = 0;
        
        switch (options.sortBy) {
          case 'name':
            compareValue = a.name.localeCompare(b.name);
            break;
          case 'size':
            compareValue = (a.size || 0) - (b.size || 0);
            break;
          case 'date':
            const aTime = a.modifiedTime?.getTime() || 0;
            const bTime = b.modifiedTime?.getTime() || 0;
            compareValue = aTime - bTime;
            break;
        }
        
        return options.sortOrder === 'desc' ? -compareValue : compareValue;
      });
    }
    
    return resources;
  }
  
  // 搜索资源库
  async searchLibrary(
    libraryId: number,
    keyword: string,
    type?: ResourceType
  ): Promise<ResourceInfo[]> {
    const instance = await ResourceService.getLibraryInstance(libraryId);
    return await instance.search(keyword, type);
  }
  
  // 获取资源信息
  async getResourceInfo(
    libraryId: number,
    path: string
  ): Promise<ResourceInfo> {
    const instance = await ResourceService.getLibraryInstance(libraryId);
    return await instance.getInfo(path);
  }
  
  // 获取资源访问路径
  async getResourceAccessPath(
    libraryId: number,
    path: string
  ): Promise<string> {
    const instance = await ResourceService.getLibraryInstance(libraryId);
    return await instance.getAccessPath(path);
  }
  
  // 获取默认资源库的资源列表
  async browseDefaultLibrary(path: string = ''): Promise<ResourceInfo[]> {
    const defaultLib = await ResourceLibraryModel.findDefault();
    if (!defaultLib) {
      throw new Error('未设置默认资源库');
    }
    
    return await this.browseLibrary(defaultLib.id, path);
  }
  
  // 批量获取资源信息
  async getMultipleResourceInfo(
    libraryId: number,
    paths: string[]
  ): Promise<ResourceInfo[]> {
    const instance = await ResourceService.getLibraryInstance(libraryId);
    const results: ResourceInfo[] = [];
    
    for (const path of paths) {
      try {
        const info = await instance.getInfo(path);
        results.push(info);
      } catch (error) {
        console.warn(`获取资源信息失败: ${path}`, error);
      }
    }
    
    return results;
  }
  
  // 获取资源读取流（用于预览和下载）
  async getResourceStream(
    libraryId: number,
    path: string,
    options?: { start?: number; end?: number }
  ): Promise<NodeJS.ReadableStream> {
    const instance = await ResourceService.getLibraryInstance(libraryId);
    return await instance.getReadStream(path, options);
  }
  
  // 获取资源 MIME 类型
  async getResourceMimeType(
    libraryId: number,
    path: string
  ): Promise<string> {
    const instance = await ResourceService.getLibraryInstance(libraryId);
    return await instance.getMimeType(path);
  }

  // 生成视频缩略图（JPEG Buffer）
  async getVideoThumbnail(
    libraryId: number,
    path: string,
    options?: { timeSeconds?: number; width?: number }
  ): Promise<Buffer> {
    const timeSeconds = options?.timeSeconds ?? 1;
    const width = options?.width ?? 320;
    
    const inputStream = await this.getResourceStream(libraryId, path);
    
    if (ffmpegStatic) {
      ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);
    }
    
    return await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      
      // 使用 Readable.from 确保是可消费的 Node Readable
      const readable = (inputStream as any).readable ? (inputStream as NodeJS.ReadableStream) : Readable.from(inputStream as any);
      
      const command = ffmpeg(readable as any)
        .seekInput(Math.max(0, timeSeconds))
        .frames(1)
        .outputOptions([
          '-vf', `scale=${width}:-1`,
          '-f', 'image2',
        ])
        .toFormat('mjpeg')
        .on('error', (err) => reject(err))
        .on('end', () => resolve(Buffer.concat(chunks)));
      
      const out = command.pipe();
      out.on('data', (chunk: Buffer) => chunks.push(chunk));
      out.on('error', (err: any) => reject(err));
    });
  }
}
