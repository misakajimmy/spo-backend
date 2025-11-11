// 资源类型
export type ResourceType = 'video' | 'image' | 'audio' | 'folder';

// 资源库类型
export type LibraryType = 'local' | 'webdav' | 'smb' | 'ftp';

// 资源信息
export interface ResourceInfo {
  name: string;
  path: string;           // 完整路径
  type: ResourceType;
  size?: number;          // 文件大小
  modifiedTime?: Date;    // 修改时间
  extension?: string;     // 文件扩展名
  
  // 媒体信息（如果可用）
  duration?: number;      // 视频/音频时长（秒）
  resolution?: {
    width: number;
    height: number;
  };
  thumbnail?: string;     // 缩略图URL/路径
}

// 资源库接口（只读）
export interface IResourceLibrary {
  // 连接测试
  test(): Promise<boolean>;
  
  // 浏览资源
  list(path: string): Promise<ResourceInfo[]>;
  
  // 搜索资源
  search(keyword: string, type?: ResourceType): Promise<ResourceInfo[]>;
  
  // 获取资源信息
  getInfo(path: string): Promise<ResourceInfo>;
  
  // 获取资源访问路径/URL
  getAccessPath(path: string): Promise<string>;
  
  // 获取文件读取流（用于预览和下载）
  getReadStream(filePath: string, options?: { start?: number; end?: number }): Promise<NodeJS.ReadableStream>;
  
  // 获取文件的 MIME 类型
  getMimeType(filePath: string): Promise<string>;
  
  // 获取缩略图（如果支持）
  getThumbnail?(path: string): Promise<string | Buffer>;
}

// 资源库配置
export interface ResourceLibraryConfig {
  type: LibraryType;
  name: string;
  config: any;  // 根据类型不同有不同的配置
}

// 本地资源库配置
export interface LocalResourceConfig {
  basePath: string;        // 根目录路径
  allowedExtensions?: string[];  // 允许的文件扩展名
  thumbnailCache?: string; // 缩略图缓存目录
}

// WebDAV资源库配置
export interface WebDAVResourceConfig {
  url: string;
  username: string;
  password: string;
  basePath?: string;
}

// 资源浏览选项
export interface BrowseOptions {
  path: string;
  type?: ResourceType;
  sortBy?: 'name' | 'size' | 'date';
  sortOrder?: 'asc' | 'desc';
}

// 资源搜索选项
export interface SearchOptions {
  keyword: string;
  type?: ResourceType;
  searchIn?: 'name' | 'path' | 'both';
  recursive?: boolean;
  limit?: number;
}
