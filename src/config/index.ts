import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5409', 10),
  cookiesDir: path.resolve(process.env.COOKIES_DIR || './data/cookies'),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};

// 导出全局配置管理器
export { GlobalConfigManager } from './global/manager';
