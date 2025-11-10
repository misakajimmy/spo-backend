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
  
  constructor(config: WebDAVResourceConfig) {
    super(config);
    this.url = config.url;
    this.username = config.username;
    this.password = config.password;
    this.basePath = config.basePath || '/';
  }
  
  async test(): Promise<boolean> {
    // TODO: 实现 WebDAV 连接测试
    console.warn('WebDAV 支持尚未实现');
    return false;
  }
  
  async list(dirPath: string = ''): Promise<ResourceInfo[]> {
    // TODO: 实现 WebDAV 目录列表
    console.warn('WebDAV list 方法尚未实现');
    return [];
  }
  
  async search(keyword: string, type?: ResourceType): Promise<ResourceInfo[]> {
    // TODO: 实现 WebDAV 搜索
    console.warn('WebDAV search 方法尚未实现');
    return [];
  }
  
  async getInfo(filePath: string): Promise<ResourceInfo> {
    // TODO: 实现获取 WebDAV 文件信息
    throw new Error('WebDAV getInfo 方法尚未实现');
  }
  
  async getAccessPath(filePath: string): Promise<string> {
    // 返回 WebDAV URL
    const fullPath = this.basePath + '/' + filePath;
    return this.url + fullPath.replace(/\/+/g, '/');
  }
  
  async getThumbnail(filePath: string): Promise<string | Buffer> {
    // TODO: 实现 WebDAV 缩略图获取
    return '';
  }
}
