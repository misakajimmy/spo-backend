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
      includeMetadata?: boolean; // 是否包含视频元数据
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
    
    // 如果需要包含元数据，为视频文件添加 metadata 字段
    if (options?.includeMetadata) {
      const enrichedResources = await Promise.all(
        resources.map(async (resource) => {
          // 只为视频类型添加元数据
          if (resource.type === 'video') {
            try {
              const metadata = await this.getVideoMetadata(libraryId, resource.path);
              return {
                ...resource,
                metadata,
              };
            } catch (error) {
              console.warn(`获取视频元数据失败: ${resource.path}`, error);
              return resource;
            }
          }
          return resource;
        })
      );
      return enrichedResources;
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

  /**
   * 提取视频元数据
   * @param libraryId 资源库ID
   * @param path 视频路径
   * @returns 视频元数据对象
   */
  async getVideoMetadata(
    libraryId: number,
    path: string
  ): Promise<{
    title?: string;
    description?: string;
    artist?: string;
    comment?: string;
    duration?: number;
    width?: number;
    height?: number;
    bitrate?: number;
    codec?: string;
    fps?: number;
  }> {
    try {
      const accessPath = await this.getResourceAccessPath(libraryId, path);
      
      if (ffmpegStatic) {
        ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);
      }
      
      return await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(accessPath, (err, metadata) => {
          if (err) {
            console.warn(`⚠️ 无法读取视频元数据: ${path}`, err.message);
            resolve({});
            return;
          }
          
          if (!metadata || !metadata.format) {
            resolve({});
            return;
          }
          
          const format = metadata.format;
          const tags = format.tags || {};
          
          // 提取基本信息
          const result: any = {
            duration: format.duration,
            bitrate: format.bit_rate,
          };
          
          // 提取标签信息
          result.title = tags.title || tags.Title || tags.TITLE;
          result.description = tags.description || tags.Description || tags.DESCRIPTION ||
                              tags.comment || tags.Comment || tags.COMMENT;
          result.artist = tags.artist || tags.Artist || tags.ARTIST;
          result.comment = tags.comment || tags.Comment || tags.COMMENT;
          
          // 提取视频流信息
          if (metadata.streams && metadata.streams.length > 0) {
            const videoStream = metadata.streams.find(s => s.codec_type === 'video');
            if (videoStream) {
              result.width = videoStream.width;
              result.height = videoStream.height;
              result.codec = videoStream.codec_name;
              
              // 计算帧率
              if (videoStream.r_frame_rate) {
                const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
                if (den && den !== 0) {
                  result.fps = Math.round((num / den) * 100) / 100;
                }
              }
            }
          }
          
          // 清理 undefined 值
          Object.keys(result).forEach(key => {
            if (result[key] === undefined || result[key] === null) {
              delete result[key];
            }
          });
          
          resolve(result);
        });
      });
    } catch (error: any) {
      console.warn(`⚠️ 提取视频元数据失败: ${path}`, error.message);
      return {};
    }
  }

  /**
   * 重命名资源文件
   * @param libraryId 资源库ID
   * @param oldPath 旧路径
   * @param newName 新文件名(只需文件名,不需路径)
   * @returns 新的完整路径
   */
  async renameResource(
    libraryId: number,
    oldPath: string,
    newName: string
  ): Promise<string> {
    try {
      const libraryConfig = await ResourceLibraryModel.findById(libraryId);
      if (!libraryConfig) {
        throw new Error(`资源库 ${libraryId} 不存在`);
      }
      
      const instance = await ResourceService.getLibraryInstance(libraryId);
      const pathLib = await import('path');
      
      // 获取目录和新路径
      const directory = pathLib.dirname(oldPath);
      const newPath = pathLib.join(directory, newName).replace(/\\/g, '/');
      
      // 检查新文件名是否已存在
      try {
        await instance.getInfo(newPath);
        throw new Error(`文件 ${newName} 已存在`);
      } catch (err: any) {
        // 文件不存在是正常的,继续
        if (err.message && err.message.includes('已存在')) {
          throw err;
        }
      }
      
      // 根据资源库类型执行不同的重命名逻辑
      if (libraryConfig.type === 'local') {
        // 本地文件系统
        const accessPath = await instance.getAccessPath(oldPath);
        const newAccessPath = await instance.getAccessPath(newPath);
        
        const fs = await import('fs/promises');
        await fs.rename(accessPath, newAccessPath);
      } else if (libraryConfig.type === 'webdav') {
        // WebDAV 支持重命名
        if (typeof (instance as any).rename === 'function') {
          await (instance as any).rename(oldPath, newName);
        } else {
          throw new Error('WebDAV 资源库不支持重命名操作');
        }
      } else {
        // 其他类型(SMB, FTP 等)暂不支持
        throw new Error(`${libraryConfig.type} 类型的资源库暂不支持重命名操作`);
      }
      
      console.log(`✅ 文件重命名成功: ${oldPath} -> ${newPath}`);
      return newPath;
    } catch (error: any) {
      console.error('❌ 文件重命名失败:', error.message);
      throw error;
    }
  }

  /**
   * 更新视频元数据
   * @param libraryId 资源库ID
   * @param path 视频路径
   * @param metadata 要更新的元数据
   * @returns 是否成功
   */
  async updateVideoMetadata(
    libraryId: number,
    path: string,
    metadata: {
      title?: string;
      description?: string;
      artist?: string;
      comment?: string;
    }
  ): Promise<boolean> {
    try {
      // 检查资源库类型
      const libraryConfig = await ResourceLibraryModel.findById(libraryId);
      if (!libraryConfig) {
        throw new Error(`资源库 ${libraryId} 不存在`);
      }
      
      // 只支持本地文件系统
      if (libraryConfig.type !== 'local') {
        throw new Error(`只支持本地(local)资源库的元数据更新，当前资源库类型为: ${libraryConfig.type}`);
      }
      
      const accessPath = await this.getResourceAccessPath(libraryId, path);
      
      if (ffmpegStatic) {
        ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);
      }
      
      // 使用系统临时目录生成临时文件,避免路径中特殊字符问题
      const os = await import('os');
      const pathLib = await import('path');
      const fs = await import('fs/promises');
      const crypto = await import('crypto');
      
      // 生成唯一临时文件名
      const ext = pathLib.extname(accessPath);
      const tmpFileName = `spo_meta_${crypto.randomBytes(8).toString('hex')}${ext}`;
      const tmpPath = pathLib.join(os.tmpdir(), tmpFileName);
      
      return await new Promise<boolean>((resolve, reject) => {
        const command = ffmpeg(accessPath);
        
        // 添加元数据
        if (metadata.title) {
          command.outputOptions('-metadata', `title=${metadata.title}`);
        }
        if (metadata.description) {
          command.outputOptions('-metadata', `description=${metadata.description}`);
        }
        if (metadata.artist) {
          command.outputOptions('-metadata', `artist=${metadata.artist}`);
        }
        if (metadata.comment) {
          command.outputOptions('-metadata', `comment=${metadata.comment}`);
        }
        
        // 复制视频和音频流(不重新编码)
        command
          .outputOptions('-c', 'copy')
          .outputOptions('-y') // 覆盖输出文件
          .output(tmpPath)
          .on('end', async () => {
            try {
              // 用临时文件替换原文件
              await fs.copyFile(tmpPath, accessPath);
              await fs.unlink(tmpPath);
              console.log(`✅ 元数据更新成功: ${path}`);
              resolve(true);
            } catch (err) {
              // 清理临时文件
              await fs.unlink(tmpPath).catch(() => {});
              reject(err);
            }
          })
          .on('error', async (err) => {
            // 清理临时文件
            await fs.unlink(tmpPath).catch(() => {});
            reject(err);
          })
          .run();
      });
    } catch (error: any) {
      console.error('❌ 更新视频元数据失败:', error.message);
      throw error;
    }
  }
}
