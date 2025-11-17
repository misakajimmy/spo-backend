# 配置文件说明

## 配置文件位置

默认配置文件: `data/config.json`

## 启动方式

### 使用默认配置
```bash
# 开发模式
yarn dev

# 生产模式
yarn build
yarn start
```

### 使用自定义配置
```bash
# 开发模式
yarn dev:config
# 或
nodemon -- -c data/config.json

# 生产模式
yarn build
yarn start:config
# 或
node dist/app.js -c /path/to/config.json
```

## 配置项说明

### server (服务器配置)
- `port`: 服务器端口，默认 5409
- `corsOrigin`: CORS 允许的源，默认 "http://localhost:5173"

### paths (路径配置)
- `cookiesDir`: Cookie 存储目录
- `tempDir`: 临时文件目录
- `outputsDir`: 输出文件目录

### accounts (账号相关定时任务)

#### updateVideoStats (视频统计更新)
- `enabled`: 是否启用
- `cron`: Cron 表达式 (默认: "0 */6 * * *" - 每6小时)
- `comment`: 说明

#### refreshCookies (Cookie 刷新)
- `enabled`: 是否启用
- `cron`: Cron 表达式 (默认: "0 0 * * *" - 每天凌晨)
- `comment`: 说明

### features (功能开关)
- `enableSwagger`: 是否启用 Swagger 文档
- `enableCronJobs`: 是否启用定时任务

## Cron 表达式说明

格式: `秒 分 时 日 月 周`

常用示例:
- `0 */6 * * *` - 每6小时执行一次
- `0 0 * * *` - 每天凌晨执行
- `0 0 */2 * *` - 每2天凌晨执行
- `0 */30 * * *` - 每30分钟执行一次
- `0 0 0 * * 1` - 每周一凌晨执行

## 定时任务说明

### updateVideoStats
自动更新所有活跃账号的视频统计数据，包括：
- 播放量
- 点赞数
- 评论数
- 分享数
- 收藏数

### refreshCookies
自动刷新所有活跃账号的 Cookie，保持登录状态有效。

## 环境变量

配置文件会覆盖 `.env` 文件中的配置。如果没有配置文件，会使用 `.env` 中的配置。

优先级: 命令行参数 > 配置文件 > .env 文件 > 默认值
