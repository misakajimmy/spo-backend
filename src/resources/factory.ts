import { 
  IResourceLibrary, 
  LibraryType, 
  ResourceLibraryConfig 
} from './types';
import { 
  LocalResourceLibrary, 
  WebDAVResourceLibrary 
} from './providers';

export class ResourceLibraryFactory {
  private static providers: Map<LibraryType, new(config: any) => IResourceLibrary> = new Map();
  
  // 初始化工厂，注册所有提供者
  static initialize() {
    this.register('local', LocalResourceLibrary);
    this.register('webdav', WebDAVResourceLibrary);
  }
  
  // 注册资源库提供者
  static register(type: LibraryType, provider: new(config: any) => IResourceLibrary) {
    this.providers.set(type, provider);
  }
  
  // 创建资源库实例
  static create(type: LibraryType, config: any): IResourceLibrary {
    const Provider = this.providers.get(type);
    if (!Provider) {
      throw new Error(`资源库类型 ${type} 未注册`);
    }
    return new Provider(config);
  }
  
  // 根据配置创建资源库实例
  static createFromConfig(config: ResourceLibraryConfig): IResourceLibrary {
    return this.create(config.type, config.config);
  }
  
  // 获取支持的资源库类型
  static getSupportedTypes(): LibraryType[] {
    return Array.from(this.providers.keys());
  }
  
  // 检查是否支持某种类型
  static isSupported(type: LibraryType): boolean {
    return this.providers.has(type);
  }
}

// 初始化工厂
ResourceLibraryFactory.initialize();
