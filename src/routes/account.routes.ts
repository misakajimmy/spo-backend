import { Router, Request, Response } from 'express';
import { AccountService } from '../services/account.service';
import { AccountStatsService } from '../services/account-stats.service';
import { success, error } from '../utils/response';
import { Platform } from '../types';
import { PlatformRegistry } from '../platforms';

const router = Router();
const accountService = new AccountService();
const accountStatsService = new AccountStatsService();

// ===== 平台管理 =====

/**
 * @swagger
 * /api/platforms:
 *   get:
 *     summary: 获取所有平台列表
 *     tags: [Platform]
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       platform:
 *                         type: string
 *                         example: douyin
 *                       name:
 *                         type: string
 *                         example: 抖音
 *                       enabled:
 *                         type: boolean
 *                         example: true
 */
router.get('/platforms', (req: Request, res: Response) => {
  try {
    const platforms = PlatformRegistry.getAllPlatforms().map(platform => {
      const config = PlatformRegistry.getConfig(platform);
      return {
        platform,
        name: config?.name,
        enabled: config?.enabled,
      };
    });
    res.json(success(platforms));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/platforms/enabled:
 *   get:
 *     summary: 获取启用的平台列表
 *     tags: [Platform]
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/platforms/enabled', (req: Request, res: Response) => {
  try {
    const platforms = PlatformRegistry.getEnabledPlatforms().map(platform => {
      const config = PlatformRegistry.getConfig(platform);
      return {
        platform,
        name: config?.name,
      };
    });
    res.json(success(platforms));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

// ===== 账号管理 =====

/**
 * @swagger
 * /api/accounts:
 *   get:
 *     summary: 获取所有账号
 *     tags: [Account]
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PlatformAccount'
 */
router.get('/accounts', async (req: Request, res: Response) => {
  try {
    const accounts = await accountService.getAllAccounts();
    res.json(success(accounts));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/accounts/{id}:
 *   get:
 *     summary: 根据ID获取账号
 *     tags: [Account]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 账号ID
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: 账号不存在
 */
router.get('/accounts/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const account = await accountService.getAccountById(id);
    
    if (!account) {
      return res.status(404).json(error('账号不存在', 404));
    }
    
    res.json(success(account));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/accounts/platform/{platform}:
 *   get:
 *     summary: 根据平台获取账号
 *     tags: [Account]
 *     parameters:
 *       - in: path
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [douyin, bilibili, xiaohongshu, kuaishou, tencent, tiktok]
 *         description: 平台类型
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/accounts/platform/:platform', async (req: Request, res: Response) => {
  try {
    const platform = req.params.platform as Platform;
    const accounts = await accountService.getAccountsByPlatform(platform);
    res.json(success(accounts));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/accounts/{id}/cookie-details:
 *   get:
 *     summary: 获取账号的Cookie详情
 *     tags: [Account]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 账号ID
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 platform:
 *                   type: string
 *                 accountId:
 *                   type: string
 *                 cookiesCount:
 *                   type: integer
 *                 originsCount:
 *                   type: integer
 *                 filePath:
 *                   type: string
 */
router.get('/accounts/:id/cookie-details', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const details = await accountService.getAccountCookieDetails(id);
    res.json(success(details));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/accounts/login/start:
 *   post:
 *     summary: 开始登录（打开浏览器）
 *     tags: [Account]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - platform
 *               - accountName
 *             properties:
 *               platform:
 *                 type: string
 *                 enum: [douyin, bilibili, xiaohongshu, kuaishou, tencent, tiktok]
 *                 description: 平台类型
 *               accountName:
 *                 type: string
 *                 description: 账号名称
 *     responses:
 *       200:
 *         description: 浏览器已打开
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                   description: 会话ID
 *       400:
 *         description: 缺少必要参数
 */
router.post('/accounts/login/start', async (req: Request, res: Response) => {
  try {
    const { platform, accountName } = req.body;
    
    if (!platform || !accountName) {
      return res.status(400).json(error('缺少必要参数: platform, accountName'));
    }
    
    const sessionId = await accountService.startLogin(platform, accountName);
    res.json(success({ sessionId }, '浏览器已打开，请完成登录'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/accounts/login/finish:
 *   post:
 *     summary: 完成登录（保存Cookie）
 *     tags: [Account]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - platform
 *               - accountName
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: 会话ID
 *               platform:
 *                 type: string
 *                 enum: [douyin, bilibili, xiaohongshu, kuaishou, tencent, tiktok]
 *               accountName:
 *                 type: string
 *     responses:
 *       200:
 *         description: 账号创建成功
 */
router.post('/accounts/login/finish', async (req: Request, res: Response) => {
  try {
    const { sessionId, platform, accountName } = req.body;
    
    if (!sessionId || !platform || !accountName) {
      return res.status(400).json(error('缺少必要参数: sessionId, platform, accountName'));
    }
    
    const accountId = await accountService.finishLogin(sessionId, platform, accountName);
    res.json(success({ id: accountId }, '账号创建成功'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/accounts/login/cancel:
 *   post:
 *     summary: 取消登录
 *     tags: [Account]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: 会话ID
 *     responses:
 *       200:
 *         description: 登录已取消
 */
router.post('/accounts/login/cancel', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json(error('缺少必要参数: sessionId'));
    }
    
    await accountService.cancelLogin(sessionId);
    res.json(success(null, '登录已取消'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/accounts/{id}:
 *   put:
 *     summary: 更新账号
 *     tags: [Account]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 账号ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accountName:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: 账号不存在
 */
router.put('/accounts/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    
    const account = await accountService.updateAccount(id, updates);
    res.json(success(account, '更新成功'));
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json(error('账号不存在', 404));
    }
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/accounts/{id}:
 *   delete:
 *     summary: 删除账号
 *     tags: [Account]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 账号ID
 *     responses:
 *       200:
 *         description: 删除成功
 *       404:
 *         description: 账号不存在
 */
router.delete('/accounts/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const result = await accountService.deleteAccount(id);
    
    if (!result) {
      return res.status(404).json(error('账号不存在或删除失败', 404));
    }
    
    res.json(success(null, '删除成功'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/accounts/{id}/validate:
 *   post:
 *     summary: 验证账号Cookie
 *     tags: [Account]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 账号ID
 *     responses:
 *       200:
 *         description: 验证结果
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isValid:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 accountInfo:
 *                   type: object
 */
router.post('/accounts/:id/validate', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const validation = await accountService.validateAccount(id);
    res.json(success(validation));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/accounts/{id}/refresh:
 *   post:
 *     summary: 刷新账号Cookie（重新登录）
 *     tags: [Account]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 账号ID
 *     responses:
 *       200:
 *         description: 返回新的会话ID
 */
router.post('/accounts/:id/refresh', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const sessionId = await accountService.refreshAccount(id);
    res.json(success({ sessionId }, '请在浏览器中重新登录'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/accounts/{id}/update-info:
 *   post:
 *     summary: 更新单个账号信息
 *     description: 从平台获取最新的账号信息并更新到数据库
 *     tags: [Account]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 账号ID
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.post('/accounts/:id/update-info', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const result = await accountService.updateAccountInfo(id);
    res.json(success(result, '账号信息更新成功'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/accounts/update-all-info:
 *   post:
 *     summary: 更新所有账号信息
 *     description: 批量从平台获取所有账号的最新信息并更新到数据库
 *     tags: [Account]
 *     responses:
 *       200:
 *         description: 更新完成
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: 总账号数
 *                 success:
 *                   type: integer
 *                   description: 成功更新数
 *                 failed:
 *                   type: integer
 *                   description: 失败数
 *                 results:
 *                   type: array
 *                   description: 详细结果
 */
router.post('/accounts/update-all-info', async (req: Request, res: Response) => {
  try {
    const result = await accountService.updateAllAccountsInfo();
    res.json(success(result, `更新完成: 成功 ${result.success} 个，失败 ${result.failed} 个`));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/accounts/{id}/videos:
 *   get:
 *     summary: 获取账号的视频统计数据
 *     tags: [Account]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 账号ID
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/accounts/:id/videos', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const data = await accountStatsService.getAccountVideos(id);
    res.json(success(data));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/accounts/{id}/update-video-stats:
 *   post:
 *     summary: 更新单个账号的视频统计
 *     description: 从平台拉取最新的作品数据并同步至本地数据库
 *     tags: [Account]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 账号ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: integer
 *                 description: 作品状态过滤（抖音默认0表示全部）
 *               limit:
 *                 type: integer
 *                 description: 限制同步作品数量
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.post('/accounts/:id/update-video-stats', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { status, limit } = req.body || {};
    const parsedStatus = status !== undefined ? Number(status) : undefined;
    const parsedLimit = limit !== undefined ? Number(limit) : undefined;
    const result = await accountStatsService.updateAccountVideoStats(id, {
      status: parsedStatus !== undefined && !Number.isNaN(parsedStatus) ? parsedStatus : undefined,
      limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
    });
    res.json(success(result, '视频数据更新成功'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

/**
 * @swagger
 * /api/accounts/update-all-video-stats:
 *   post:
 *     summary: 更新所有账号的视频统计
 *     tags: [Account]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               platform:
 *                 type: string
 *                 enum: [douyin, bilibili, xiaohongshu, kuaishou, tencent, tiktok]
 *                 description: 只同步指定平台
 *               status:
 *                 type: integer
 *                 description: 作品状态过滤（平台自定义）
 *               limitPerAccount:
 *                 type: integer
 *                 description: 每个账号同步的最大作品数
 *     responses:
 *       200:
 *         description: 更新完成
 */
router.post('/accounts/update-all-video-stats', async (req: Request, res: Response) => {
  try {
    const { platform, status, limitPerAccount } = req.body || {};
    const parsedStatus = status !== undefined ? Number(status) : undefined;
    const parsedLimit = limitPerAccount !== undefined ? Number(limitPerAccount) : undefined;
    const result = await accountStatsService.updateAllAccountsVideoStats({
      platform: typeof platform === 'string' ? (platform as Platform) : undefined,
      status: parsedStatus !== undefined && !Number.isNaN(parsedStatus) ? parsedStatus : undefined,
      limitPerAccount: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
    });
    res.json(success(result, `同步完成: 成功 ${result.success} 个，失败 ${result.failed} 个`));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

export default router;
