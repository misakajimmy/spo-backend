# 资源库文件操作功能

## 📝 新增功能说明

为 `IResourceLibrary` 接口添加了完整的文件和文件夹操作功能,支持本地文件系统和 WebDAV。

### 新增的接口方法

```typescript
interface IResourceLibrary {
  // ... 原有方法 ...
  
  // 创建文件夹
  createFolder(folderPath: string): Promise<void>;
  
  // 删除文件或文件夹
  delete(path: string, recursive?: boolean): Promise<void>;
  
  // 重命名文件或文件夹
  rename(oldPath: string, newName: string): Promise<void>;
  
  // 移动文件或文件夹
  move(sourcePath: string, targetPath: string): Promise<void>;
}
```

## 🔧 功能详解

### 1. createFolder - 创建文件夹

**功能:** 创建新的文件夹,支持递归创建多层目录

**参数:**
- `folderPath`: 文件夹路径(相对于资源库根目录)

**示例:**
```typescript
// 创建单层目录
await library.createFolder('videos');

// 创建多层目录
await library.createFolder('videos/2025/01');
```

**实现细节:**
- **Local**: 使用 `fs.mkdir(path, { recursive: true })`
- **WebDAV**: 使用 `client.createDirectory(path)`

---

### 2. delete - 删除文件或文件夹

**功能:** 删除指定的文件或文件夹

**参数:**
- `path`: 文件或文件夹路径
- `recursive`: 是否递归删除(默认 false)
  - `false`: 只能删除空文件夹或文件
  - `true`: 递归删除文件夹及其所有内容

**示例:**
```typescript
// 删除文件
await library.delete('videos/demo.mp4');

// 删除空文件夹
await library.delete('empty-folder');

// 递归删除文件夹及内容
await library.delete('old-videos', true);
```

**安全检查:**
- 删除文件夹时,如果 `recursive=false`,会检查文件夹是否为空
- 如果文件夹不为空,会抛出错误,防止误删

**实现细节:**
- **Local**: 
  - 文件: `fs.unlink(path)`
  - 空文件夹: `fs.rmdir(path)`
  - 递归删除: `fs.rm(path, { recursive: true, force: true })`
- **WebDAV**: 
  - `client.deleteFile(path)` (默认递归)

---

### 3. rename - 重命名文件或文件夹

**功能:** 在同一目录下重命名文件或文件夹

**参数:**
- `oldPath`: 原路径
- `newName`: 新名称(不是完整路径,只是新名称)

**示例:**
```typescript
// 重命名文件
await library.rename('videos/old-name.mp4', 'new-name.mp4');

// 重命名文件夹
await library.rename('videos/old-folder', 'new-folder');
```

**安全检查:**
- 检查新名称是否已存在
- 如果存在同名文件/文件夹,抛出错误

**实现细节:**
- **Local**: `fs.rename(oldPath, newPath)`
- **WebDAV**: `client.moveFile(oldPath, newPath)`

---

### 4. move - 移动文件或文件夹

**功能:** 移动文件或文件夹到不同的目录

**参数:**
- `sourcePath`: 源路径
- `targetPath`: 目标路径(完整路径,包括文件名)

**示例:**
```typescript
// 移动文件到其他目录
await library.move(
  'videos/demo.mp4',
  'videos/2025/demo.mp4'
);

// 移动文件夹
await library.move(
  'old-videos',
  'archive/old-videos'
);

// 移动并重命名
await library.move(
  'videos/old-name.mp4',
  'videos/2025/new-name.mp4'
);
```

**安全检查:**
- 检查源文件/文件夹是否存在
- 检查目标路径是否已存在
- 自动创建目标目录(如果不存在)

**实现细节:**
- **Local**: 
  1. 确保目标目录存在: `fs.mkdir(targetDir, { recursive: true })`
  2. 移动: `fs.rename(sourcePath, targetPath)`
- **WebDAV**: 
  1. 确保目标目录存在: `client.createDirectory(targetDir)`
  2. 移动: `client.moveFile(sourcePath, targetPath)`

---

## 💡 使用场景

### 场景1: 整理资源库
```typescript
const library = await resourceService.getLibraryInstance(libraryId);

// 创建年份文件夹
await library.createFolder('videos/2025');

// 移动旧视频到归档
await library.move(
  'videos/old-video.mp4',
  'videos/archive/old-video.mp4'
);

// 删除临时文件
await library.delete('temp/cache.tmp');
```

### 场景2: 批量重命名
```typescript
// 获取文件列表
const files = await library.list('videos');

// 重命名所有文件
for (const file of files) {
  if (file.type === 'video') {
    const newName = `processed_${file.name}`;
    await library.rename(file.path, newName);
  }
}
```

### 场景3: 清理空文件夹
```typescript
const folders = await library.list('');

for (const folder of folders) {
  if (folder.type === 'folder') {
    try {
      // 尝试删除空文件夹
      await library.delete(folder.path, false);
      console.log(`已删除空文件夹: ${folder.name}`);
    } catch (error) {
      // 文件夹不为空,跳过
      console.log(`文件夹不为空,跳过: ${folder.name}`);
    }
  }
}
```

---

## ⚠️ 注意事项

### 1. 路径规范
- 所有路径都是相对于资源库根目录
- 使用正斜杠 `/` 作为路径分隔符
- 不要以 `/` 开头

**正确示例:**
```typescript
'videos/2025/demo.mp4'
'images/covers'
```

**错误示例:**
```typescript
'/videos/demo.mp4'  // 不要以 / 开头
'videos\\demo.mp4'  // 不要使用反斜杠
```

### 2. 并发操作
- 避免同时对同一文件/文件夹进行多个操作
- 建议使用队列或锁机制

### 3. 错误处理
所有操作都会抛出错误,需要妥善处理:

```typescript
try {
  await library.delete('videos/demo.mp4');
  console.log('删除成功');
} catch (error) {
  console.error('删除失败:', error.message);
  // 处理错误...
}
```

### 4. WebDAV 特殊说明
- WebDAV 的 `delete` 操作默认是递归的
- 某些 WebDAV 服务器可能有权限限制
- 网络延迟可能导致操作较慢

---

## 🔐 权限和安全

### 路径安全
- 所有实现都会确保操作在资源库根目录内
- 防止路径穿越攻击
- 自动规范化路径

### 操作日志
- 所有操作都会记录日志
- 成功: `✅` 标记
- 失败: `❌` 标记

---

## 📊 API 集成状态

**当前状态:** ✅ 已实现但未暴露 API

这些功能目前**仅在内部使用**,未暴露为 REST API 端点。

### 未来可能的 API 设计 (仅供参考)

```typescript
// 创建文件夹
POST /api/resources/folders/:libraryId
Body: { path: "videos/2025" }

// 删除
DELETE /api/resources/:libraryId
Query: path=videos/demo.mp4&recursive=true

// 重命名
PATCH /api/resources/rename/:libraryId
Body: { oldPath: "videos/old.mp4", newName: "new.mp4" }

// 移动
POST /api/resources/move/:libraryId
Body: { sourcePath: "...", targetPath: "..." }
```

---

## 🧪 测试建议

### 单元测试场景
1. ✅ 创建单层文件夹
2. ✅ 创建多层文件夹
3. ✅ 删除文件
4. ✅ 删除空文件夹
5. ✅ 递归删除文件夹
6. ✅ 重命名文件
7. ✅ 重命名文件夹
8. ✅ 移动文件
9. ✅ 移动文件夹
10. ❌ 尝试重命名到已存在的名称(应失败)
11. ❌ 尝试删除非空文件夹(recursive=false,应失败)
12. ❌ 尝试移动到已存在的路径(应失败)

---

## 📝 变更日志

**2025-01-11**
- ✅ 在 `IResourceLibrary` 接口中添加4个文件操作方法
- ✅ 在 `LocalResourceLibrary` 中实现所有方法
- ✅ 在 `WebDAVResourceLibrary` 中实现所有方法
- ✅ 添加完善的错误处理和安全检查
- ✅ 添加操作日志输出
- 📝 暂不暴露 REST API

---

**这些功能已经完全实现,可以在服务层内部使用,但不会暴露给前端 API!**
