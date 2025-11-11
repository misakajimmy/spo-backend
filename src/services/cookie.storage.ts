import { CookieFileData, Platform, OriginData } from '../types';
import { GlobalConfigManager } from '../config';
import { Cookie } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

export class CookieStorageService {
  // 保存 Cookie 数据到文件
  static saveCookieFile(
    platform: Platform,
    accountId: string | undefined,
    cookies: Cookie[],
    origins: OriginData[] = []
  ): string {
    // 生成 UUID 作为文件名
    const uuid = uuidv4();
    const fileName = `${uuid}.json`;
    
    // 获取存储目录
    const cookiesDir = GlobalConfigManager.getCookiesDir();
    const filePath = path.join(cookiesDir, fileName);

    // 构建数据结构
    const data: CookieFileData = {
      platform,
      id: accountId || '',
      cookies,
      origins,
    };

    // 确保目录存在
    if (!fs.existsSync(cookiesDir)) {
      fs.mkdirSync(cookiesDir, { recursive: true });
    }

    // 保存文件
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    
    console.log('✅ Cookie 文件已保存:', filePath);
    
    // 返回文件路径
    return filePath;
  }

  // 读取 Cookie 文件
  static readCookieFile(filePath: string): CookieFileData | null {
    if (!fs.existsSync(filePath)) {
      console.error('❌ Cookie 文件不存在:', filePath);
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const rawData = JSON.parse(content);

      if (!rawData || typeof rawData !== 'object') {
        console.error('❌ Cookie 文件格式错误: 数据不是对象');
        return null;
      }

      if (!Array.isArray(rawData.cookies)) {
        console.error('❌ Cookie 文件格式错误: cookies 字段缺失或类型错误');
        return null;
      }

      const data: CookieFileData = {
        platform: typeof rawData.platform === 'string' && rawData.platform.length > 0 ? rawData.platform : 'unknown',
        id: typeof rawData.id === 'string' ? rawData.id : '',
        cookies: rawData.cookies,
        origins: Array.isArray(rawData.origins) ? rawData.origins : [],
      };

      return data;
    } catch (error) {
      console.error('❌ Cookie 文件读取失败:', error);
      return null;
    }
  }

  // 更新 Cookie 文件
  static updateCookieFile(
    filePath: string,
    cookies: Cookie[],
    origins?: OriginData[]
  ): boolean {
    const existingData = this.readCookieFile(filePath);
    
    if (!existingData) {
      return false;
    }

    // 更新数据
    existingData.cookies = cookies;
    if (origins) {
      existingData.origins = origins;
    }

    try {
      fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), 'utf-8');
      console.log('✅ Cookie 文件已更新:', filePath);
      return true;
    } catch (error) {
      console.error('❌ Cookie 文件更新失败:', error);
      return false;
    }
  }

  // 删除 Cookie 文件
  static deleteCookieFile(filePath: string): boolean {
    if (!fs.existsSync(filePath)) {
      console.warn('⚠️ Cookie 文件不存在:', filePath);
      return false;
    }

    try {
      fs.unlinkSync(filePath);
      console.log('✅ Cookie 文件已删除:', filePath);
      return true;
    } catch (error) {
      console.error('❌ Cookie 文件删除失败:', error);
      return false;
    }
  }

  // 获取 Cookie 数组（用于 Playwright）
  static getCookiesArray(filePath: string): Cookie[] | null {
    const data = this.readCookieFile(filePath);
    return data ? data.cookies : null;
  }

  // 验证 Cookie 文件是否有效
  static isCookieFileValid(filePath: string): boolean {
    const data = this.readCookieFile(filePath);
    return data !== null && Array.isArray(data.cookies) && data.cookies.length > 0;
  }
}
