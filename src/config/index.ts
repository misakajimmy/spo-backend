import dotenv from 'dotenv';
import path from 'path';
import { ConfigLoader } from './loader';

dotenv.config();

// 从命令行参数获取配置文件路径
const args = process.argv.slice(2);
const configIndex = args.findIndex(arg => arg === '-c' || arg === '--config');
const configPath = configIndex !== -1 && args[configIndex + 1]
  ? path.resolve(args[configIndex + 1])
  : undefined;

// 加载配置
const configLoader = ConfigLoader.getInstance(configPath);
const appConfig = configLoader.getConfig();

export const config = {
  port: appConfig.server.port,
  cookiesDir: path.resolve(appConfig.paths.cookiesDir),
  tempDir: path.resolve(appConfig.paths.tempDir),
  outputsDir: path.resolve(appConfig.paths.outputsDir),
  corsOrigin: appConfig.server.corsOrigin,
};

// 导出配置加载器和完整配置
export { configLoader, appConfig };

// 导出全局配置管理器
export { GlobalConfigManager } from './global/manager';
