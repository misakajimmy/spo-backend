import fs from 'fs';
import path from 'path';

/**
 * 配置文件接口
 */
export interface AppConfig {
  server: {
    port: number;
    corsOrigin: string;
  };
  paths: {
    cookiesDir: string;
    tempDir: string;
    outputsDir: string;
  };
  accounts: {
    updateVideoStats: {
      enabled: boolean;
      cron: string;
      comment: string;
    };
    refreshCookies: {
      enabled: boolean;
      cron: string;
      comment: string;
    };
    createSnapshots: {
      enabled: boolean;
      cron: string;
      comment: string;
    };
    calculateSummary: {
      enabled: boolean;
      cron: string;
      comment: string;
    };
  };
  features: {
    enableSwagger: boolean;
    enableCronJobs: boolean;
  };
}

/**
 * 配置加载器
 */
export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: AppConfig;
  private configPath: string;
  
  private constructor(configPath: string) {
    this.configPath = configPath;
    this.config = this.loadConfig();
  }
  
  /**
   * 获取配置加载器实例
   */
  static getInstance(configPath?: string): ConfigLoader {
    if (!ConfigLoader.instance) {
      const defaultPath = path.resolve(process.cwd(), 'data/config.json');
      ConfigLoader.instance = new ConfigLoader(configPath || defaultPath);
    }
    return ConfigLoader.instance;
  }
  
  /**
   * 加载配置文件
   */
  private loadConfig(): AppConfig {
    try {
      const configContent = fs.readFileSync(this.configPath, 'utf-8');
      const config = JSON.parse(configContent) as AppConfig;
      
      console.log(`✅ 配置文件已加载: ${this.configPath}`);
      return config;
    } catch (error) {
      console.error(`❌ 无法加载配置文件: ${this.configPath}`, error);
      throw new Error(`配置文件加载失败: ${this.configPath}`);
    }
  }
  
  /**
   * 重新加载配置文件
   */
  reload(): void {
    this.config = this.loadConfig();
    console.log('🔄 配置文件已重新加载');
  }
  
  /**
   * 获取配置对象
   */
  getConfig(): AppConfig {
    return this.config;
  }
  
  /**
   * 保存配置到文件
   */
  saveConfig(): void {
    try {
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      );
      console.log('✅ 配置文件已保存');
    } catch (error) {
      console.error('❌ 保存配置文件失败:', error);
      throw error;
    }
  }
  
  /**
   * 更新配置
   */
  updateConfig(updates: Partial<AppConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
    };
  }
}

// 导出默认实例
export const configLoader = ConfigLoader.getInstance();
export const appConfig = configLoader.getConfig();
