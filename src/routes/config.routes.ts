import { Router, Request, Response } from 'express';
import { GlobalConfigManager } from '../config';
import { success, error } from '../utils/response';

const router = Router();

// 获取全局配置
router.get('/config', (req: Request, res: Response) => {
  try {
    const config = GlobalConfigManager.getConfig();
    res.json(success(config));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

// 更新全局配置
router.put('/config', (req: Request, res: Response) => {
  try {
    const updates = req.body;
    GlobalConfigManager.updateConfig(updates);
    const config = GlobalConfigManager.getConfig();
    res.json(success(config, '配置已更新'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

// 重置全局配置
router.post('/config/reset', (req: Request, res: Response) => {
  try {
    GlobalConfigManager.reset();
    const config = GlobalConfigManager.getConfig();
    res.json(success(config, '配置已重置为默认值'));
  } catch (err: any) {
    res.status(500).json(error(err.message, 500));
  }
});

export default router;
