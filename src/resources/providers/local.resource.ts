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
  
  async getReadStream(
    filePath: string,
    options?: { start?: number; end?: number }
  ): Promise<NodeJS.ReadableStream> {
    const fullPath = path.join(this.basePath, filePath);
    const fsSync = await import('fs');
    
    // 创建文件读取流，支持 Range 请求
    return fsSync.createReadStream(fullPath, options);
  }
  
  async getMimeType(filePath: string): Promise<string> {
    const ext = path.extname(filePath);
    return this.getMimeTypeByExt(ext);
  }
  
  /**
   * 创建文件夹
   */
  async createFolder(folderPath: string): Promise<void> {
    const fullPath = path.join(this.basePath, folderPath);
    
    try {
      await fs.mkdir(fullPath, { recursive: true });
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
    const fullPath = path.join(this.basePath, filePath);
    
    try {
      const stats = await fs.stat(fullPath);
      
      if (stats.isDirectory()) {
        // 删除文件夹
        if (recursive) {
          await fs.rm(fullPath, { recursive: true, force: true });
          console.log(`✅ 文件夹已删除: ${filePath}`);
        } else {
          // 检查是否为空
          const items = await fs.readdir(fullPath);
          if (items.length > 0) {
            throw new Error('文件夹不为空，请使用 recursive 选项');
          }
          await fs.rmdir(fullPath);
          console.log(`✅ 空文件夹已删除: ${filePath}`);
        }
      } else {
        // 删除文件
        await fs.unlink(fullPath);
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
    const fullOldPath = path.join(this.basePath, oldPath);
    const directory = path.dirname(fullOldPath);
    const fullNewPath = path.join(directory, newName);
    
    try {
      // 检查新名称是否已存在
      try {
        await fs.access(fullNewPath);
        throw new Error(`目标名称已存在: ${newName}`);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
      
      await fs.rename(fullOldPath, fullNewPath);
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
    const fullSourcePath = path.join(this.basePath, sourcePath);
    const fullTargetPath = path.join(this.basePath, targetPath);
    
    try {
      // 检查源文件是否存在
      await fs.access(fullSourcePath);
      
      // 检查目标是否已存在
      try {
        await fs.access(fullTargetPath);
        throw new Error(`目标路径已存在: ${targetPath}`);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
      
      // 确保目标目录存在
      const targetDir = path.dirname(fullTargetPath);
      await fs.mkdir(targetDir, { recursive: true });
      
      // 移动文件或文件夹
      await fs.rename(fullSourcePath, fullTargetPath);
      console.log(`✅ 移动成功: ${sourcePath} -> ${targetPath}`);
    } catch (error) {
      console.error(`❌ 移动失败: ${sourcePath}`, error);
      throw error;
    }
  }
}
