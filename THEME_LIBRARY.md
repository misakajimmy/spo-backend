# 主题库功能文档

## 📝 功能概述

主题库(Theme)是用于组织和管理视频内容的核心功能,可以将多个平台账号和多个资源路径关联到一个主题下,方便统一管理和发布。

## 🏗️ 数据模型

### 1. Theme (主题库)
```typescript
{
  id: number;
  name: string;         // 主题库名称
  description?: string; // 主题库简介
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. ThemeAccount (主题库-账号关联)
多对多关系,一个主题库可以关联多个账号,一个账号也可以属于多个主题库。

```typescript
{
  id: number;
  themeId: number;    // 主题库ID
  accountId: number;  // 账号ID
  createdAt: Date;
}
```

### 3. ThemeResourcePath (主题资源路径)
记录主题库关联的资源存储位置。

```typescript
{
  id: number;
  themeId: number;      // 主题库ID
  libraryId: number;    // 资源库ID
  folderPath: string;   // 文件夹路径
  createdAt: Date;
  updatedAt: Date;
}
```

## 📊 关系图

```
┌─────────────┐       ┌──────────────┐       ┌──────────────┐
│   Theme     │◄─────►│ThemeAccount  │◄─────►│PlatformAccount│
│  (主题库)    │       │  (关联表)     │       │   (账号)      │
└─────────────┘       └──────────────┘       └──────────────┘
      │
      │ 1:N
      ▼
┌──────────────────┐
│ThemeResourcePath │
│  (资源路径)       │
└──────────────────┘
      │
      │ 关联
      ▼
┌──────────────────┐
│ResourceLibrary   │
│  (资源库)         │
└──────────────────┘
```

## 🚀 API 接口

### 1. 创建主题库
```http
POST /api/themes
Content-Type: application/json

{
  "name": "美食探店系列",
  "description": "记录各地美食探店的视频",
  "accountIds": [1, 2],
  "resourcePaths": [
    {
      "libraryId": 1,
      "folderPath": "/videos/food"
    }
  ]
}
```

### 2. 获取所有主题库
```http
GET /api/themes
```

**响应示例:**
```json
{
  "code": 200,
  "message": "Success",
  "data": [
    {
      "id": 1,
      "name": "美食探店系列",
      "description": "记录各地美食探店的视频",
      "themeAccounts": [
        {
          "id": 1,
          "account": {
            "id": 1,
            "platform": "douyin",
            "accountName": "美食号"
          }
        }
      ],
      "resourcePaths": [
        {
          "id": 1,
          "libraryId": 1,
          "folderPath": "/videos/food"
        }
      ],
      "createdAt": "2025-01-11T10:00:00Z",
      "updatedAt": "2025-01-11T10:00:00Z"
    }
  ]
}
```

### 3. 获取单个主题库
```http
GET /api/themes/:id
```

### 4. 更新主题库
```http
PUT /api/themes/:id
Content-Type: application/json

{
  "name": "新的主题库名称",
  "description": "更新后的描述",
  "accountIds": [1, 2, 3],
  "resourcePaths": [
    {
      "libraryId": 1,
      "folderPath": "/videos/new-folder"
    }
  ]
}
```

### 5. 删除主题库
```http
DELETE /api/themes/:id
```

### 6. 获取主题库的视频列表
```http
GET /api/themes/:id/videos
```

**功能说明:**
- 自动获取所有资源路径下的第一层视频文件
- 不包含子文件夹中的视频
- 返回视频信息包含资源库ID和完整路径

**响应示例:**
```json
{
  "code": 200,
  "message": "Success",
  "data": [
    {
      "name": "video1.mp4",
      "path": "video1.mp4",
      "type": "video",
      "size": 10485760,
      "modifiedTime": "2025-01-11T10:00:00Z",
      "extension": ".mp4",
      "libraryId": 1,
      "libraryPath": "/videos/food",
      "fullPath": "/videos/food/video1.mp4"
    }
  ]
}
```

### 7. 添加账号到主题库
```http
POST /api/themes/:id/accounts
Content-Type: application/json

{
  "accountId": 3
}
```

### 8. 从主题库移除账号
```http
DELETE /api/themes/:id/accounts/:accountId
```

### 9. 添加资源路径到主题库
```http
POST /api/themes/:id/paths
Content-Type: application/json

{
  "libraryId": 1,
  "folderPath": "/videos/new-category"
}
```

**验证机制:**
- 自动验证文件夹是否存在
- 确保路径是文件夹而不是文件

### 10. 从主题库移除资源路径
```http
DELETE /api/themes/:id/paths/:pathId
```

## 💡 使用场景

### 场景1: 美食探店系列
```typescript
// 创建主题库
const theme = await fetch('/api/themes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: '美食探店系列',
    description: '记录各地特色美食',
    accountIds: [1, 2], // 抖音账号 + B站账号
    resourcePaths: [
      { libraryId: 1, folderPath: '/videos/food/2025' }
    ]
  })
});

// 获取主题库下所有视频
const videos = await fetch('/api/themes/1/videos');
// 返回 /videos/food/2025 文件夹下第一层的所有视频
```

### 场景2: 跨平台发布
```typescript
// 一个主题库关联多个平台账号
// 可以方便地将同一视频发布到多个平台

const theme = {
  name: '产品测评',
  accountIds: [1, 2, 3], // 抖音、B站、小红书
  resourcePaths: [
    { libraryId: 1, folderPath: '/videos/reviews' }
  ]
};
```

### 场景3: 多文件夹管理
```typescript
// 一个主题库可以关联多个文件夹
const theme = {
  name: '旅游系列',
  resourcePaths: [
    { libraryId: 1, folderPath: '/videos/travel/japan' },
    { libraryId: 1, folderPath: '/videos/travel/korea' },
    { libraryId: 2, folderPath: '/cloud/travel' }  // WebDAV
  ]
};

// 获取视频时会合并所有文件夹的视频
const allVideos = await fetch('/api/themes/1/videos');
```

## ⚙️ 核心特性

### 1. 多对多关系
- 一个主题库 ↔ 多个账号
- 一个账号 ↔ 多个主题库
- 灵活的组合方式

### 2. 视频自动聚合
- 自动从所有资源路径获取视频
- 只取文件夹第一层(不递归)
- 统一的视频列表接口

### 3. 级联删除
- 删除主题库时自动删除所有关联关系
- 删除账号时自动删除相关的主题关联
- 数据一致性保证

### 4. 路径验证
- 添加资源路径时自动验证文件夹存在
- 防止添加无效路径
- 提前发现配置错误

## 📁 文件夹层级说明

### 当前设计
```
/videos/food/         ← 主题资源路径
├── video1.mp4        ← ✅ 会被获取
├── video2.mp4        ← ✅ 会被获取
└── subfolder/        ← ❌ 子文件夹中的视频不会被获取
    └── video3.mp4    ← ❌ 不会被获取
```

### 未来扩展(已发布归档)
```
/videos/food/
├── video1.mp4        ← 待发布
├── video2.mp4        ← 待发布
└── published/        ← 已发布归档文件夹
    ├── video3.mp4    ← 已发布
    └── video4.mp4    ← 已发布
```

可以通过创建 `published` 文件夹来归档已发布的视频,这样主目录只显示待发布视频。

## 🔧 数据库迁移

创建主题库相关表需要运行数据库迁移:

```bash
# 生成 Prisma Client
npm run prisma:generate

# 运行迁移
npm run prisma:migrate

# 或手动创建迁移
npx prisma migrate dev --name add_theme_tables
```

## 📊 完整示例

### 创建完整的主题库工作流

```typescript
// 1. 创建主题库
const createResponse = await fetch('/api/themes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: '美食探店',
    description: '记录各地美食探店视频',
    accountIds: [1, 2],
    resourcePaths: [
      { libraryId: 1, folderPath: '/videos/food/2025' }
    ]
  })
});

const { data: theme } = await createResponse.json();
console.log('主题库已创建:', theme.id);

// 2. 获取主题库下的所有视频
const videosResponse = await fetch(`/api/themes/${theme.id}/videos`);
const { data: videos } = await videosResponse.json();
console.log('找到视频:', videos.length);

// 3. 添加新的资源路径
await fetch(`/api/themes/${theme.id}/paths`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    libraryId: 1,
    folderPath: '/videos/food/2024'
  })
});

// 4. 添加新账号
await fetch(`/api/themes/${theme.id}/accounts`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    accountId: 3
  })
});

// 5. 更新主题库
await fetch(`/api/themes/${theme.id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    description: '更新后的描述'
  })
});
```

## ⚠️ 注意事项

1. **路径唯一性**: 同一个主题库不能添加重复的资源路径(libraryId + folderPath 唯一)
2. **账号唯一性**: 同一个主题库不能重复添加同一个账号
3. **级联删除**: 删除主题库会删除所有关联关系,但不会删除账号和资源文件
4. **性能考虑**: 如果主题库关联的文件夹很多且包含大量视频,获取视频列表可能较慢

## 🔮 未来扩展

- [ ] 支持视频标记(已发布/未发布)
- [ ] 自动移动已发布视频到归档文件夹
- [ ] 主题库统计信息(视频数量、总大小等)
- [ ] 批量发布功能
- [ ] 主题库模板功能

---

**主题库功能已完整实现!** 🎉
