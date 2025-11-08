import { AccountModel } from '../../src/models/account.model';
import { resetDatabase, closeDatabase } from '../helpers/db';

describe('AccountModel', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('create', () => {
    it('应该成功创建账号', async () => {
      const account = await AccountModel.create({
        platform: 'douyin',
        accountName: '测试抖音账号',
        cookiePath: '/path/to/cookie.json',
      });

      expect(account).toMatchObject({
        platform: 'douyin',
        accountName: '测试抖音账号',
        cookiePath: '/path/to/cookie.json',
        isActive: true,
      });
      expect(account.id).toBeDefined();
    });

    it('应该支持可选的 accountId', async () => {
      const account = await AccountModel.create({
        platform: 'bilibili',
        accountName: 'B站账号',
        accountId: 'uid123456',
        cookiePath: '/path/to/cookie.json',
      });

      expect(account.accountId).toBe('uid123456');
    });
  });

  describe('findAll', () => {
    it('应该返回所有账号', async () => {
      await AccountModel.create({
        platform: 'douyin',
        accountName: '账号1',
        cookiePath: '/path/1.json',
      });

      await AccountModel.create({
        platform: 'bilibili',
        accountName: '账号2',
        cookiePath: '/path/2.json',
      });

      const accounts = await AccountModel.findAll();
      expect(accounts).toHaveLength(2);
    });

    it('空数据库应该返回空数组', async () => {
      const accounts = await AccountModel.findAll();
      expect(accounts).toEqual([]);
    });
  });

  describe('findById', () => {
    it('应该根据 ID 查找账号', async () => {
      const created = await AccountModel.create({
        platform: 'douyin',
        accountName: '测试账号',
        cookiePath: '/path/cookie.json',
      });

      const found = await AccountModel.findById(created.id);
      expect(found).toMatchObject({
        id: created.id,
        accountName: '测试账号',
      });
    });

    it('找不到时应该返回 null', async () => {
      const found = await AccountModel.findById(99999);
      expect(found).toBeNull();
    });
  });

  describe('findByPlatform', () => {
    it('应该根据平台查找账号', async () => {
      await AccountModel.create({
        platform: 'douyin',
        accountName: '抖音1',
        cookiePath: '/path/1.json',
      });

      await AccountModel.create({
        platform: 'douyin',
        accountName: '抖音2',
        cookiePath: '/path/2.json',
      });

      await AccountModel.create({
        platform: 'bilibili',
        accountName: 'B站',
        cookiePath: '/path/3.json',
      });

      const douyinAccounts = await AccountModel.findByPlatform('douyin');
      expect(douyinAccounts).toHaveLength(2);
      expect(douyinAccounts.every(acc => acc.platform === 'douyin')).toBe(true);
    });
  });

  describe('update', () => {
    it('应该更新账号信息', async () => {
      const account = await AccountModel.create({
        platform: 'douyin',
        accountName: '旧名字',
        cookiePath: '/path/cookie.json',
      });

      const updated = await AccountModel.update(account.id, {
        accountName: '新名字',
        isActive: false,
      });

      expect(updated.accountName).toBe('新名字');
      expect(updated.isActive).toBe(false);
    });

    it('更新不存在的账号应该抛出错误', async () => {
      await expect(
        AccountModel.update(99999, { accountName: '新名字' })
      ).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('应该删除账号', async () => {
      const account = await AccountModel.create({
        platform: 'douyin',
        accountName: '待删除',
        cookiePath: '/path/cookie.json',
      });

      await AccountModel.delete(account.id);

      const found = await AccountModel.findById(account.id);
      expect(found).toBeNull();
    });

    it('删除不存在的账号应该抛出错误', async () => {
      await expect(AccountModel.delete(99999)).rejects.toThrow();
    });
  });
});
