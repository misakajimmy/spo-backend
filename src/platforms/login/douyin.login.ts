import { BrowserContext, Cookie } from 'playwright';
import { IPlatformLogin, OriginData, Platform, PlatformAccountInfo } from '../../types';
import { getAllLocalStorageDeep } from './utils';

const DOUYIN_CREATOR_URL = 'https://creator.douyin.com/';

// 抖音登录器
export class DouyinLogin implements IPlatformLogin {
  platform: Platform = 'douyin';

  async openLoginPage(context: BrowserContext): Promise<void> {
    const page = await context.newPage();
    await page.goto(DOUYIN_CREATOR_URL);
    console.log('✅ 抖音登录页面已打开');
  }

  async checkLoginStatus(context: BrowserContext): Promise<boolean> {
    const page = context.pages()[0];
    if (!page) return false;

    try {
      const loginButton = await page.locator('text=扫码登录').count();
      return loginButton === 0;
    } catch (error) {
      return false;
    }
  }

  async getAccountInfo(context: BrowserContext): Promise<PlatformAccountInfo> {
    const page = context.pages()[0];
    if (!page) {
      return {};
    }

    try {
      // 确保在正确的页面以获取正确的 cookie 上下文
      if (!page.url().includes('creator.douyin.com')) {
        await page.goto(DOUYIN_CREATOR_URL);
        await page.waitForLoadState('networkidle', { timeout: 5000 });
      }

      // 使用 API 接口获取用户信息
      const response = await page.request.get('https://creator.douyin.com/aweme/v1/creator/user/info/');
      const data = await response.json();

      // 解析响应数据
      if (data?.douyin_user_verify_info) {
        const userInfo = data.douyin_user_verify_info;
        const accountInfo: PlatformAccountInfo = {
          userId: userInfo.douyin_unique_id,
          username: userInfo.nick_name,
          avatar: userInfo.avatar_url,
          followersCount: userInfo.following_count,
          totalFavorited: userInfo.total_favorited,
          description: data?.user_profile?.signature,
        };

        console.log(`✅ 获取账号信息: ${accountInfo.username} (${accountInfo.userId})`);
        console.log(`   粉丝: ${accountInfo.followersCount}, 获赞: ${accountInfo.totalFavorited}, 关注: ${accountInfo.followersCount}`);
        return accountInfo;
      }

      throw new Error('获取用户信息失败: 接口返回数据格式异常');
    } catch (error) {
      console.warn('⚠️ 获取账号信息失败:', error);
      return {};
    }
  }

  async getCookies(context: BrowserContext): Promise<Cookie[]> {
    // 从浏览器上下文获取所有 cookies
    const cookies = await context.cookies();

    // 与抖音/字节相关的域关键字
    const douyinDomainKeywords = ['douyin', 'iesdouyin', 'byte', 'bytedance', 'byteoversea', 'snssdk'];

    // 只保留与抖音相关域名的 cookies
    const filtered = cookies.filter((c) => {
      const domain = (c.domain || '').toLowerCase();
      return douyinDomainKeywords.some((kw) => domain.includes(kw));
    });

    // 如果没有匹配到任何 cookie，则回退返回全部 cookies
    const result = filtered.length > 0 ? filtered : cookies;

    console.log(`✅ 获取到 ${result.length} 个抖音相关 cookie（原始 ${cookies.length} 个）`);
    return result;
  }

  async getLocalStorage(context: BrowserContext): Promise<OriginData[]> {
    console.log('🔍 开始获取抖音 localStorage...');
    const origins = await getAllLocalStorageDeep(context);

    // 只保留抖音相关的 origin
    const douyinOrigins = origins.filter(o =>
      o.origin.includes('douyin') ||
      o.origin.includes('bytedance')
    );

    if (douyinOrigins.length === 0) {
      console.log('⚠️ 未找到抖音相关的 localStorage，返回所有数据');
      return origins;
    }

    console.log(`✅ 获取到 ${douyinOrigins.length} 个抖音相关 origin 的 localStorage`);
    return douyinOrigins;
  }

  /**
   * 解析粉丝数文本为数字
   * 支持格式：1000, 1.2w, 10.5万, 1.5k 等
   */
  private parseFollowersCount(text: string): number | undefined {
    if (!text) return undefined;

    // 移除空格
    text = text.trim();

    // 如果是纯数字
    if (/^\d+$/.test(text)) {
      return parseInt(text, 10);
    }

    // 处理带单位的情况
    const match = text.match(/^([\d.]+)([wWkK万千百]?)$/);
    if (!match) return undefined;

    const num = parseFloat(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'w':
      case '万':
        return Math.floor(num * 10000);
      case 'k':
      case '千':
        return Math.floor(num * 1000);
      case '百':
        return Math.floor(num * 100);
      default:
        return Math.floor(num);
    }
  }
}
