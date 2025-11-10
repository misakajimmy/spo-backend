import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseResourceLibrary } from '../base.resource';
import { 
  ResourceInfo, 
  ResourceType, 
  LocalResourceConfig 
} from '../types';

export class LocalResourceLibrary extends BaseResourceLibrary {
  private basePath: string;
  private allowedExtensions?: string[];
  
  constructor(config: LocalResourceConfig) {
    super(config);
    this.basePath = config.basePath;
    this.allowedExtensions = config.allowedExtensions;
  }
  
  async test(): Promise<boolean> {
    try {
      await fs.access(this.basePath);
      const stats = await fs.stat(this.basePath);
      return stats.isDirectory();
    } catch (error) {
      console.error(`无法访问路径: ${this.basePath}`, error);
      return false;
    }
  }
  
  async list(dirPath: string = ''): Promise<ResourceInfo[]> {
    try {
      const fullPath = path.join(this.basePath, dirPath);
      const items = await fs.readdir(fullPath, { withFileTypes: true });
      
      const resources: ResourceInfo[] = [];
      
      for (const item of items) {
        // 跳过隐藏文件
        if (item.name.startsWith('.')) continue;
        
        const itemPath = path.join(dirPath, item.name);
        const fullItemPath = path.join(this.basePath, itemPath);
        
        try {
          if (item.isDirectory()) {
            resources.push({
              name: item.name,
              path: itemPath,
              type: 'folder',
            });
          } else {
            const stats = await fs.stat(fullItemPath);
            const ext = path.extname(item.name);
            
            // 过滤允许的扩展名
            if (this.allowedExtensions && 
                this.allowedExtensions.length > 0 &&
                !this.allowedExtensions.includes(ext.toLowerCase())) {
              continue;
            }
            
            // 只添加支持的媒体文件
            const resourceType = this.getResourceType(item.name);
            if (resourceType !== 'folder') {
              resources.push({
                name: item.name,
                path: itemPath,
                type: resourceType,
                size: stats.size,
                modifiedTime: stats.mtime,
                extension: ext,
              });
            }
          }
        } catch (error) {
          console.warn(`无法读取文件信息: ${fullItemPath}`, error);
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
    const fullPath = path.join(this.basePath, filePath);
    const stats = await fs.stat(fullPath);
    const name = path.basename(filePath);
    const ext = path.extname(name);
    
    const info: ResourceInfo = {
      name,
      path: filePath,
      type: stats.isDirectory() ? 'folder' : this.getResourceType(name),
      size: stats.size,
      modifiedTime: stats.mtime,
      extension: ext || undefined,
    };
    
    // 如果是视频文件，尝试获取额外信息
    if (info.type === 'video') {
      // 这里可以集成 ffprobe 或其他工具获取视频信息
      // 暂时留空，后续可扩展
    }
    
    return info;
  }
  
  async getAccessPath(filePath: string): Promise<string> {
    // 返回完整的文件系统路径
    return path.join(this.basePath, filePath);
  }
  
  async getThumbnail(filePath: string): Promise<string | Buffer> {
    // 如果配置了缩略图缓存目录
    if (this.config.thumbnailCache) {
      const thumbnailPath = path.join(
        this.config.thumbnailCache,
        filePath.replace(/[\/\\]/g, '_') + '.jpg'
      );
      
      try {
        await fs.access(thumbnailPath);
        return thumbnailPath;
      } catch {
        // 缩略图不存在
      }
    }
    
    // 返回默认缩略图或生成缩略图（后续实现）
    return '';
  }
}
