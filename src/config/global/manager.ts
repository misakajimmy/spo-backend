import { GlobalConfig } from '../../types';
import path from 'path';
import fs from 'fs';

// 配置文件路径
const CONFIG_FILE_PATH = path.resolve('./data/config.json');

// 默认全局配置
const DEFAULT_CONFIG: GlobalConfig = {
  cookiesStoragePath: './data/cookies',
  enableAutoValidation: false,
  validationInterval: 60, // 60分钟
};

export class GlobalConfigManager {
  private static config: GlobalConfig = DEFAULT_CONFIG;
  private static initialized = false;

  // 初始化配置
  static init(): void {
    if (this.initialized) return;

    // 确保数据目录存在
    const dataDir = path.dirname(CONFIG_FILE_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // 尝试加载配置文件
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      try {
        const configData = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(configData) };
        console.log('✅ 全局配置已加载');
      } catch (error) {
        console.warn('⚠️ 配置文件加载失败，使用默认配置');
        this.config = DEFAULT_CONFIG;
      }
    } else {
      // 创建默认配置文件
      this.saveConfig();
      console.log('✅ 已创建默认配置文件');
    }

    // 确保 cookies 目录存在
    const cookiesDir = path.resolve(this.config.cookiesStoragePath);
    if (!fs.existsSync(cookiesDir)) {
      fs.mkdirSync(cookiesDir, { recursive: true });
    }

    this.initialized = true;
  }

  // 获取配置
  static getConfig(): GlobalConfig {
    if (!this.initialized) {
      this.init();
    }
    return { ...this.config };
  }

  // 更新配置
  static updateConfig(updates: Partial<GlobalConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
    console.log('✅ 配置已更新');
  }

  // 保存配置到文件
  private static saveConfig(): void {
    try {
      fs.writeFileSync(
        CONFIG_FILE_PATH,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('❌ 配置保存失败:', error);
    }
  }

  // 获取 Cookies 存储路径
  static getCookiesDir(): string {
    if (!this.initialized) {
      this.init();
    }
    return path.resolve(this.config.cookiesStoragePath);
  }

  // 重置为默认配置
  static reset(): void {
    this.config = DEFAULT_CONFIG;
    this.saveConfig();
    console.log('✅ 配置已重置为默认值');
  }
}

// 自动初始化
GlobalConfigManager.init();
