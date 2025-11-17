import { Router, Request, Response } from 'express';
import { ThemeService } from '../services/theme.service';
import { success, error } from '../utils/response';

const router = Router();
const themeService = new ThemeService();

/**
 * @swagger
 * /api/themes:
 *   post:
 *     summary: 创建主题库
 *     tags: [Theme]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: 主题库名称
 *                 example: 美食探店系列
 *               description:
 *                 type: string
 *                 description: 主题库简介
 *                 example: 记录各地美食探店的视频
 *               accountIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: 关联的账号ID列表
 *                 example: [1, 2]
 *               resourcePaths:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     libraryId:
 *                       type: integer
 *                     folderPath:
 *                       type: string
 *                 description: 资源路径列表
 *                 example: [{ "libraryId": 1, "folderPath": "/videos/food" }]
 *     responses:
 *       200:
 *         description: 创建成功
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, accountIds, resourcePaths } = req.body;
    
    if (!name) {
      return res.status(400).json(error('缺少主题库名称'));
    }
    
    const theme = await themeService.createTheme({
      name,
      description,
      accountIds,
      resourcePaths,
    });
    
    res.json(success(theme, '主题库创建成功'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/themes:
 *   get:
 *     summary: 获取所有主题库
 *     tags: [Theme]
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const themes = await themeService.getAllThemes();
    res.json(success(themes));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/themes/{id}:
 *   get:
 *     summary: 获取单个主题库
 *     tags: [Theme]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 主题库ID
 *     responses:
 *       200:
 *         description: 成功
 *       404:
 *         description: 主题库不存在
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const theme = await themeService.getTheme(id);
    
    if (!theme) {
      return res.status(404).json(error('主题库不存在', 404));
    }
    
    res.json(success(theme));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/themes/{id}:
 *   put:
 *     summary: 更新主题库
 *     tags: [Theme]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 主题库ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               accountIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *               resourcePaths:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, archiveFolderName, accountIds, resourcePaths } = req.body;
    
    const theme = await themeService.updateTheme(id, {
      name,
      description,
      archiveFolderName,
      accountIds,
      resourcePaths,
    });
    
    res.json(success(theme, '主题库更新成功'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/themes/{id}:
 *   delete:
 *     summary: 删除主题库
 *     tags: [Theme]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 主题库ID
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await themeService.deleteTheme(id);
    
    res.json(success(null, '主题库已删除'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/themes/{id}/videos:
 *   get:
 *     summary: 获取主题库的视频列表
 *     tags: [Theme]
 *     description: 获取主题库所有资源路径下的第一层视频文件
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 主题库ID
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/:id/videos', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const videos = await themeService.getThemeVideos(id);
    
    res.json(success(videos));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/themes/{id}/accounts:
 *   post:
 *     summary: 添加账号到主题库
 *     tags: [Theme]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 主题库ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountId
 *             properties:
 *               accountId:
 *                 type: integer
 *                 description: 账号ID
 *     responses:
 *       200:
 *         description: 添加成功
 */
router.post('/:id/accounts', async (req: Request, res: Response) => {
  try {
    const themeId = parseInt(req.params.id);
    const { accountId } = req.body;
    
    if (!accountId) {
      return res.status(400).json(error('缺少账号ID'));
    }
    
    await themeService.addAccountToTheme(themeId, accountId);
    
    res.json(success(null, '账号添加成功'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/themes/{id}/accounts/{accountId}:
 *   delete:
 *     summary: 从主题库移除账号
 *     tags: [Theme]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 主题库ID
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 账号ID
 *     responses:
 *       200:
 *         description: 移除成功
 */
router.delete('/:id/accounts/:accountId', async (req: Request, res: Response) => {
  try {
    const themeId = parseInt(req.params.id);
    const accountId = parseInt(req.params.accountId);
    
    await themeService.removeAccountFromTheme(themeId, accountId);
    
    res.json(success(null, '账号已移除'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/themes/{id}/paths:
 *   post:
 *     summary: 添加资源路径到主题库
 *     tags: [Theme]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 主题库ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - libraryId
 *               - folderPath
 *             properties:
 *               libraryId:
 *                 type: integer
 *                 description: 资源库ID
 *               folderPath:
 *                 type: string
 *                 description: 文件夹路径
 *                 example: /videos/food
 *     responses:
 *       200:
 *         description: 添加成功
 */
router.post('/:id/paths', async (req: Request, res: Response) => {
  try {
    const themeId = parseInt(req.params.id);
    const { libraryId, folderPath } = req.body;
    
    if (!libraryId || !folderPath) {
      return res.status(400).json(error('缺少必要参数'));
    }
    
    await themeService.addResourcePathToTheme(themeId, libraryId, folderPath);
    
    res.json(success(null, '资源路径添加成功'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/themes/{id}/paths/{pathId}:
 *   delete:
 *     summary: 从主题库移除资源路径
 *     tags: [Theme]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 主题库ID
 *       - in: path
 *         name: pathId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 资源路径ID
 *     responses:
 *       200:
 *         description: 移除成功
 */
router.delete('/:id/paths/:pathId', async (req: Request, res: Response) => {
  try {
    const pathId = parseInt(req.params.pathId);
    
    await themeService.removeResourcePathFromTheme(pathId);
    
    res.json(success(null, '资源路径已移除'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/themes/{id}/statistics:
 *   get:
 *     summary: 获取主题库统计信息
 *     tags: [Theme]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 主题库ID
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/:id/statistics', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const statistics = await themeService.getThemeStatistics(id);
    
    res.json(success(statistics));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/themes/{id}/batch-publish:
 *   post:
 *     summary: 批量发布主题库视频
 *     tags: [Theme]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 主题库ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountIds
 *               - videoPaths
 *             properties:
 *               accountIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: 要发布到的账号ID列表
 *               videoPaths:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 要发布的视频路径列表
 *               autoArchive:
 *                 type: boolean
 *                 description: 是否自动归档（默认true）
 *               title:
 *                 type: string
 *                 description: 视频标题模板
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 标签
 *     responses:
 *       200:
 *         description: 成功
 */
router.post('/:id/batch-publish', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { accountIds, videoPaths, autoArchive, title, tags } = req.body;
    
    const result = await themeService.batchPublishThemeVideos(id, {
      accountIds,
      videoPaths,
      autoArchive,
      title,
      tags,
    });
    
    res.json(success(result, '批量发布任务已创建'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/themes/{id}/videos/archive:
 *   post:
 *     summary: 批量归档视频
 *     tags: [Theme]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 主题库ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - videoPaths
 *             properties:
 *               videoPaths:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 要归档的视频路径列表
 *     responses:
 *       200:
 *         description: 成功
 */
router.post('/:id/videos/archive', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { videoPaths } = req.body;
    
    if (!videoPaths || videoPaths.length === 0) {
      return res.status(400).json(error('缺少视频路径'));
    }
    
    const result = await themeService.batchArchiveVideos(id, videoPaths);
    
    res.json(success(result, `归档完成: ${result.archived}/${result.total} 成功`));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/themes/{id}/videos/unarchive:
 *   post:
 *     summary: 批量取消归档视频
 *     tags: [Theme]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 主题库ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - videoPaths
 *             properties:
 *               videoPaths:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 要取消归档的视频路径列表
 *     responses:
 *       200:
 *         description: 成功
 */
router.post('/:id/videos/unarchive', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { videoPaths } = req.body;
    
    if (!videoPaths || videoPaths.length === 0) {
      return res.status(400).json(error('缺少视频路径'));
    }
    
    const result = await themeService.batchUnarchiveVideos(id, videoPaths);
    
    res.json(success(result, `取消归档完成: ${result.unarchived}/${result.total} 成功`));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

export default router;
