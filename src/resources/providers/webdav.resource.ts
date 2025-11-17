import * as path from 'path';
import { createClient, WebDAVClient, FileStat, ResponseDataDetailed } from 'webdav';
import { BaseResourceLibrary } from '../base.resource';
import { 
  ResourceInfo, 
  ResourceType, 
  WebDAVResourceConfig 
} from '../types';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

export class WebDAVResourceLibrary extends BaseResourceLibrary {
  private url: string;
  private username: string;
  private password: string;
  private basePath: string;
  private client: WebDAVClient;
  
  constructor(config: WebDAVResourceConfig) {
    super(config);
    this.url = config.url;
    this.username = config.username;
    this.password = config.password;
    this.basePath = config.basePath || '/';
    
    // 初始化 WebDAV 客户端
    this.client = createClient(this.url, {
      username: this.username,
      password: this.password,
    });
  }
  
  async test(): Promise<boolean> {
    try {
      // 尝试访问根目录或 basePath 来测试连接
      const testPath = this.basePath || '/';
      await this.client.stat(testPath);
      return true;
    } catch (error) {
      console.error(`WebDAV 连接测试失败: ${this.url}`, error);
      return false;
    }
  }
  
  async list(dirPath: string = ''): Promise<ResourceInfo[]> {
    try {
      const fullPath = this.normalizePath(path.join(this.basePath, dirPath));
      const result = await this.client.getDirectoryContents(fullPath);
      
      // 处理 ResponseDataDetailed 类型
      const items: FileStat[] = this.isResponseDataDetailed(result) ? result.data : result;
      
      const resources: ResourceInfo[] = [];
      
      for (const item of items) {
        // 跳过隐藏文件
        if (item.basename.startsWith('.')) continue;
        
        // 跳过当前目录和父目录
        if (item.basename === '.' || item.basename === '..') continue;
        
        const itemPath = path.join(dirPath, item.basename).replace(/\\/g, '/');
        
        try {
          if (item.type === 'directory') {
            resources.push({
              name: item.basename,
              path: itemPath,
              type: 'folder',
            });
          } else {
            const ext = path.extname(item.basename);
            
            // 只添加支持的媒体文件
            const resourceType = this.getResourceType(item.basename);
            if (resourceType !== 'folder') {
              const baseInfo: ResourceInfo = {
                name: item.basename,
                path: itemPath,
                type: resourceType,
                size: item.size,
                modifiedTime: item.lastmod ? new Date(item.lastmod) : undefined,
                extension: ext || undefined,
              };
              
              if (resourceType === 'video' || resourceType === 'audio') {
                try {
                  const accessUrl = await this.getAccessPath(itemPath);
                  const meta = await this.probeMedia(accessUrl);
                  if (meta) {
                    if (typeof meta.duration === 'number') baseInfo.duration = meta.duration;
                    if (meta.resolution) baseInfo.resolution = meta.resolution;
                  }
                } catch (e) {
                  // 忽略单个文件的元数据失败
                }
              }
              
              resources.push(baseInfo);
            }
          }
        } catch (error) {
          console.warn(`无法读取文件信息: ${itemPath}`, error);
        }
      }
      
      return this.sortResources(resources, 'name', 'asc');
    } catch (error) {
      console.error(`列出目录失败: ${dirPath}`, error);
      return [];
    }
  }
  
  async search(
    keyword: string, 
    type?: ResourceType,
    maxDepth: number = 5
  ): Promise<ResourceInfo[]> {
    const results: ResourceInfo[] = [];
    const keywordLower = keyword.toLowerCase();
    
    const searchDir = async (dirPath: string, depth: number = 0) => {
      if (depth > maxDepth) return;
      
      try {
        const items = await this.list(dirPath);
        
        for (const item of items) {
          // 匹配文件名
          if (item.name.toLowerCase().includes(keywordLower)) {
            if (!type || item.type === type) {
              results.push(item);
            }
          }
          
          // 递归搜索子目录
          if (item.type === 'folder' && depth < maxDepth) {
            await searchDir(item.path, depth + 1);
          }
        }
      } catch (error) {
        console.warn(`搜索目录失败: ${dirPath}`, error);
      }
    };
    
    await searchDir('');
    return results;
  }
  
  async getInfo(filePath: string): Promise<ResourceInfo> {
    try {
      const fullPath = this.normalizePath(path.join(this.basePath, filePath));
      const result = await this.client.stat(fullPath);
      
      // 处理 ResponseDataDetailed 类型
      const stat: FileStat = this.isResponseDataDetailed(result) ? result.data : result;
      
      const name = path.basename(filePath);
      const ext = path.extname(name);
      
      const info: ResourceInfo = {
        name,
        path: filePath,
        type: stat.type === 'directory' ? 'folder' : this.getResourceType(name),
        size: stat.size,
        modifiedTime: stat.lastmod ? new Date(stat.lastmod) : undefined,
        extension: ext || undefined,
      };
      
      // 如果是视频/音频文件，尝试获取额外信息
      if (info.type === 'video' || info.type === 'audio') {
        try {
          const accessUrl = await this.getAccessPath(filePath);
          const meta = await this.probeMedia(accessUrl);
          if (meta) {
            if (typeof meta.duration === 'number') info.duration = meta.duration;
            if (meta.resolution) info.resolution = meta.resolution;
          }
        } catch {
          // 忽略失败
        }
      }
      
      return info;
    } catch (error) {
      console.error(`获取文件信息失败: ${filePath}`, error);
      throw new Error(`无法获取文件信息: ${filePath}`);
    }
  }
  
  async getAccessPath(filePath: string): Promise<string> {
    // 返回 WebDAV URL
    const fullPath = this.normalizePath(path.join(this.basePath, filePath));
    // 确保 URL 格式正确
    const urlPath = fullPath.replace(/\/+/g, '/');
    return `${this.url}${urlPath}`;
  }
  
  async getThumbnail(filePath: string): Promise<string | Buffer> {
    // WebDAV 通常不直接支持缩略图
    // 可以尝试从文件内容生成缩略图（需要下载文件）
    // 或者返回空字符串，由上层处理
    try {
      const info = await this.getInfo(filePath);
      if (info.type === 'image') {
        // 对于图片，可以返回访问路径作为缩略图
        return await this.getAccessPath(filePath);
      }
    } catch (error) {
      console.warn(`获取缩略图失败: ${filePath}`, error);
    }
    
    return '';
  }
  
  async getReadStream(
    filePath: string,
    options?: { start?: number; end?: number }
  ): Promise<NodeJS.ReadableStream> {
    const fullPath = this.normalizePath(path.join(this.basePath, filePath));
    
    // WebDAV 客户端返回 Stream
    const stream = this.client.createReadStream(fullPath, options as any);
    
    return stream as NodeJS.ReadableStream;
  }
  
  async getMimeType(filePath: string): Promise<string> {
    const ext = path.extname(filePath);
    return this.getMimeTypeByExt(ext);
  }

  // 提取媒体信息（使用 ffprobe），支持 URL
  private async probeMedia(input: string): Promise<{ duration?: number; resolution?: { width: number; height: number } } | null> {
    if (ffmpegStatic) {
      ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);
    }
    return new Promise((resolve) => {
      ffmpeg.ffprobe(input, (err, data) => {
        if (err || !data) return resolve(null);
        const duration = typeof data.format?.duration === 'number' ? data.format.duration : (data.format?.duration ? Number(data.format.duration) : undefined);
        const videoStream = (data.streams || []).find((s: any) => s.codec_type === 'video');
        const width = videoStream?.width;
        const height = videoStream?.height;
        const resolution = (typeof width === 'number' && typeof height === 'number') ? { width, height } : undefined;
        resolve({ duration, resolution });
      });
    });
  }
  
  /**
   * 创建文件夹
   */
  async createFolder(folderPath: string): Promise<void> {
    const fullPath = this.normalizePath(path.join(this.basePath, folderPath));
    
    try {
      await this.client.createDirectory(fullPath);
      console.log(`✅ 文件夹创建成功: ${folderPath}`);
    } catch (error) {
      console.error(`❌ 创建文件夹失败: ${folderPath}`, error);
      throw new Error(`创建文件夹失败: ${folderPath}`);
    }
  }
  
  /**
   * 删除文件或文件夹
   */
  async delete(filePath: string, recursive: boolean = false): Promise<void> {
    const fullPath = this.normalizePath(path.join(this.basePath, filePath));
    
    try {
      const stat = await this.client.stat(fullPath) as FileStat;
      
      if (stat.type === 'directory') {
        // WebDAV deleteFile 对目录默认是递归删除
        if (!recursive) {
          // 检查是否为空目录
          const contents = await this.client.getDirectoryContents(fullPath);
          const items = this.isResponseDataDetailed(contents) ? contents.data : contents;
          if (items.length > 0) {
            throw new Error('文件夹不为空，请使用 recursive 选项');
          }
        }
        await this.client.deleteFile(fullPath);
        console.log(`✅ 文件夹已删除: ${filePath}`);
      } else {
        await this.client.deleteFile(fullPath);
        console.log(`✅ 文件已删除: ${filePath}`);
      }
    } catch (error) {
      console.error(`❌ 删除失败: ${filePath}`, error);
      throw new Error(`删除失败: ${filePath}`);
    }
  }
  
  /**
   * 重命名文件或文件夹
   */
  async rename(oldPath: string, newName: string): Promise<void> {
    const fullOldPath = this.normalizePath(path.join(this.basePath, oldPath));
    const directory = path.dirname(fullOldPath);
    const fullNewPath = this.normalizePath(path.join(directory, newName));
    
    try {
      // 检查新名称是否已存在
      try {
        await this.client.stat(fullNewPath);
        throw new Error(`目标名称已存在: ${newName}`);
      } catch (error: any) {
        // 如果 stat 失败说明不存在，可以继续
        if (error.response && error.response.status !== 404) {
          throw error;
        }
      }
      
      await this.client.moveFile(fullOldPath, fullNewPath);
      console.log(`✅ 重命名成功: ${oldPath} -> ${newName}`);
    } catch (error) {
      console.error(`❌ 重命名失败: ${oldPath}`, error);
      throw error;
    }
  }
  
  /**
   * 移动文件或文件夹
   */
  async move(sourcePath: string, targetPath: string): Promise<void> {
    const fullSourcePath = this.normalizePath(path.join(this.basePath, sourcePath));
    const fullTargetPath = this.normalizePath(path.join(this.basePath, targetPath));
    
    try {
      // 检查源文件是否存在
      await this.client.stat(fullSourcePath);
      
      // 检查目标是否已存在
      try {
        await this.client.stat(fullTargetPath);
        throw new Error(`目标路径已存在: ${targetPath}`);
      } catch (error: any) {
        if (error.response && error.response.status !== 404) {
          throw error;
        }
      }
      
      // 确保目标目录存在
      const targetDir = this.normalizePath(path.dirname(fullTargetPath));
      try {
        await this.client.stat(targetDir);
      } catch {
        await this.client.createDirectory(targetDir, { recursive: true });
      }
      
      // 移动文件或文件夹
      await this.client.moveFile(fullSourcePath, fullTargetPath);
      console.log(`✅ 移动成功: ${sourcePath} -> ${targetPath}`);
    } catch (error) {
      console.error(`❌ 移动失败: ${sourcePath}`, error);
      throw error;
    }
  }
  
  /**
   * 检查是否为 ResponseDataDetailed 类型
   */
  private isResponseDataDetailed<T>(value: T | ResponseDataDetailed<T>): value is ResponseDataDetailed<T> {
    return value !== null && typeof value === 'object' && 'data' in value;
  }
  
  /**
   * 规范化路径，确保路径格式正确
   */
  private normalizePath(filePath: string): string {
    // 将 Windows 路径分隔符转换为 Unix 风格
    let normalized = filePath.replace(/\\/g, '/');
    // 确保以 / 开头
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }
    // 移除重复的斜杠
    normalized = normalized.replace(/\/+/g, '/');
    return normalized;
  }
}
