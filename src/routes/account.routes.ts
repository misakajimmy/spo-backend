import { Router, Request, Response } from 'express';
import { AccountService } from '../services/account.service';
import { success, error } from '../utils/response';
import { Platform } from '../types';
import { PlatformRegistry } from '../platforms';

const router = Router();
const accountService = new AccountService();

// ===== 平台管理 =====

// 获取所有平台列表
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

// 获取启用的平台列表
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

// 获取所有账号
router.get('/accounts', async (req: Request, res: Response) => {
  try {
    const accounts = await accountService.getAllAccounts();
    res.json(success(accounts));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

// 根据 ID 获取账号
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

// 根据平台获取账号
router.get('/accounts/platform/:platform', async (req: Request, res: Response) => {
  try {
    const platform = req.params.platform as Platform;
    const accounts = await accountService.getAccountsByPlatform(platform);
    res.json(success(accounts));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

// 获取账号的 Cookie 详情
router.get('/accounts/:id/cookie-details', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const details = await accountService.getAccountCookieDetails(id);
    res.json(success(details));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

// 开始登录（打开浏览器）
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

// 完成登录（保存 Cookie）
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

// 取消登录
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

// 更新账号
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

// 删除账号
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

// 验证账号 Cookie
router.post('/accounts/:id/validate', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const validation = await accountService.validateAccount(id);
    res.json(success(validation));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

// 刷新账号 Cookie
router.post('/accounts/:id/refresh', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const sessionId = await accountService.refreshAccount(id);
    res.json(success({ sessionId }, '请在浏览器中重新登录'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

export default router;
