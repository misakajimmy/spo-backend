import * as path from 'path';
import { 
  IResourceLibrary, 
  ResourceInfo, 
  ResourceType,
  SearchOptions 
} from './types';

export abstract class BaseResourceLibrary implements IResourceLibrary {
  protected config: any;
  
  constructor(config: any) {
    this.config = config;
  }
  
  abstract test(): Promise<boolean>;
  abstract list(dirPath: string): Promise<ResourceInfo[]>;
  abstract search(keyword: string, type?: ResourceType): Promise<ResourceInfo[]>;
  abstract getInfo(filePath: string): Promise<ResourceInfo>;
  abstract getAccessPath(filePath: string): Promise<string>;
  
  // 通用方法：判断文件类型
  protected isVideo(ext: string): boolean {
    const videoExts = ['.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm', '.m4v', '.mpg', '.mpeg'];
    return videoExts.includes(ext.toLowerCase());
  }
  
  protected isImage(ext: string): boolean {
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico'];
    return imageExts.includes(ext.toLowerCase());
  }
  
  protected isAudio(ext: string): boolean {
    const audioExts = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a'];
    return audioExts.includes(ext.toLowerCase());
  }
  
  protected getResourceType(filePath: string): ResourceType {
    const ext = path.extname(filePath);
    if (this.isVideo(ext)) return 'video';
    if (this.isImage(ext)) return 'image';
    if (this.isAudio(ext)) return 'audio';
    return 'folder';
  }
  
  // 格式化文件大小
  protected formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let index = 0;
    let size = bytes;
    
    while (size >= 1024 && index < units.length - 1) {
      size /= 1024;
      index++;
    }
    
    return `${size.toFixed(2)} ${units[index]}`;
  }
  
  // 排序资源列表
  protected sortResources(
    resources: ResourceInfo[],
    sortBy: 'name' | 'size' | 'date' = 'name',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): ResourceInfo[] {
    const sorted = [...resources].sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
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
      
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
    
    // 文件夹始终排在前面
    return [
      ...sorted.filter(r => r.type === 'folder'),
      ...sorted.filter(r => r.type !== 'folder')
    ];
  }
  
  // 过滤资源列表
  protected filterResources(
    resources: ResourceInfo[],
    type?: ResourceType
  ): ResourceInfo[] {
    if (!type) return resources;
    return resources.filter(r => r.type === type);
  }
}
