import { Platform, IPlatformLogin } from '../../types';
import { DouyinLogin } from './douyin.login';

// 登录器工厂
export class PlatformLoginFactory {
  private static loginHandlers: Map<Platform, IPlatformLogin> = new Map();

  // 注册登录器
  static register(platform: Platform, handler: IPlatformLogin): void {
    this.loginHandlers.set(platform, handler);
  }

  // 获取登录器
  static getHandler(platform: Platform): IPlatformLogin {
    const handler = this.loginHandlers.get(platform);
    
    if (!handler) {
      throw new Error(`未找到平台 ${platform} 的登录处理器`);
    }
    
    return handler;
  }

  // 检查是否支持该平台
  static isSupported(platform: Platform): boolean {
    return this.loginHandlers.has(platform);
  }

  // 获取所有支持的平台
  static getSupportedPlatforms(): Platform[] {
    return Array.from(this.loginHandlers.keys());
  }
}

// 只注册抖音登录器
PlatformLoginFactory.register('douyin', new DouyinLogin());
