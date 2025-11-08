# SPO Backend

Social Platform Operations 后端服务

## 技术栈

- Node.js + Express + TypeScript
- Prisma ORM + SQLite
- Playwright (浏览器自动化)

## 功能特性

- ✅ 多平台账号管理
- ✅ Cookie 自动获取和验证
- ✅ 浏览器自动化登录
- 🚧 视频上传（开发中）
- 🚧 定时发布（开发中）

## 支持的平台

- 抖音 (douyin)
- B站 (bilibili)
- 小红书 (xiaohongshu)
- 快手 (kuaishou)
- 视频号 (tencent)
- TikTok (tiktok)

## 安装

```bash
# 1. 安装依赖
npm install

# 2. 生成 Prisma Client
npm run prisma:generate

# 3. 运行数据库迁移
npm run prisma:migrate

# 4. 安装 Playwright 浏览器
npx playwright install chromium
```

## 开发

```bash
# 开发模式（热重载）
npm run dev

# 构建
npm run build

# 生产模式
npm start

# 打开 Prisma Studio（数据库可视化管理）
npm run prisma:studio
```

## 数据库管理

```bash
# 生成 Prisma Client（修改 schema 后必须执行）
npm run prisma:generate

# 创建新迁移
npm run prisma:migrate

# 重置数据库
npx prisma migrate reset

# 查看数据库（可视化界面）
npm run prisma:studio
```

## API 接口

### 账号管理

#### 获取所有账号
```
GET /api/accounts
```

#### 获取单个账号
```
GET /api/accounts/:id
```

#### 根据平台获取账号
```
GET /api/accounts/platform/:platform
```

#### 开始登录（打开浏览器）
```
POST /api/accounts/login/start
Body: {
  "platform": "douyin",
  "accountName": "我的抖音账号"
}
Response: {
  "code": 200,
  "data": {
    "sessionId": "douyin_1234567890"
  }
}
```

#### 完成登录（保存 Cookie）
```
POST /api/accounts/login/finish
Body: {
  "sessionId": "douyin_1234567890",
  "platform": "douyin",
  "accountName": "我的抖音账号"
}
```

#### 取消登录
```
POST /api/accounts/login/cancel
Body: {
  "sessionId": "douyin_1234567890"
}
```

#### 更新账号
```
PUT /api/accounts/:id
Body: {
  "accountName": "新的账号名",
  "isActive": true
}
```

#### 删除账号
```
DELETE /api/accounts/:id
```

#### 验证 Cookie
```
POST /api/accounts/:id/validate
```

#### 刷新 Cookie
```
POST /api/accounts/:id/refresh
```

## 目录结构

```
spo-backend/
├── prisma/
│   └── schema.prisma        # Prisma 数据库模型
├── src/
│   ├── config/              # 配置文件
│   ├── models/              # 数据模型
│   ├── services/            # 业务逻辑
│   ├── routes/              # API 路由
│   ├── types/               # TypeScript 类型
│   ├── utils/               # 工具函数
│   └── app.ts               # 应用入口
├── data/
│   ├── database.db          # SQLite 数据库
│   └── cookies/             # Cookie 文件
├── .env                     # 环境变量
└── package.json
```

## 环境变量

```
PORT=5409
DATABASE_URL="file:./data/database.db"
COOKIES_DIR=./data/cookies
CORS_ORIGIN=http://localhost:5173
```

## Prisma 常用命令

```bash
# 修改 schema 后重新生成 Client
npx prisma generate

# 创建迁移
npx prisma migrate dev --name init

# 查看数据库
npx prisma studio

# 格式化 schema 文件
npx prisma format
```

## License

MIT
