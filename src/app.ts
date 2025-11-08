import express from 'express';
import cors from 'cors';
import { config } from './config';
import accountRoutes from './routes/account.routes';
import configRoutes from './routes/config.routes';

// 创建 Express 应用
const app = express();

// 中间件
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.use('/api', accountRoutes);
app.use('/api', configRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'SPO Backend is running' });
});

// 错误处理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    code: 500,
    message: 'Internal Server Error',
  });
});

// 启动服务器
app.listen(config.port, () => {
  console.log(`\n🚀 Server is running on http://localhost:${config.port}`);
  console.log(`🍪 Cookies: ${config.cookiesDir}\n`);
});

export default app;
