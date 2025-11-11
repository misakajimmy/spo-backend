import * as path from 'path';
import { createClient, WebDAVClient, FileStat, ResponseDataDetailed } from 'webdav';
import { BaseResourceLibrary } from '../base.resource';
import { 
  ResourceInfo, 
  ResourceType, 
  WebDAVResourceConfig 
} from '../types';

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
              resources.push({
                name: item.basename,
                path: itemPath,
                type: resourceType,
                size: item.size,
                modifiedTime: item.lastmod ? new Date(item.lastmod) : undefined,
                extension: ext || undefined,
              });
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
      
      // 如果是视频文件，尝试获取额外信息
      if (info.type === 'video') {
        // 这里可以集成 ffprobe 或其他工具获取视频信息
        // 暂时留空，后续可扩展
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
