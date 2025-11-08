import { success, error, generateFileName } from '../../src/utils/response';

describe('Response Utils', () => {
  describe('success', () => {
    it('应该返回成功响应格式', () => {
      const data = { id: 1, name: 'test' };
      const result = success(data);

      expect(result).toEqual({
        code: 200,
        message: 'Success',
        data,
      });
    });

    it('应该支持自定义消息', () => {
      const result = success(null, '操作成功');

      expect(result).toEqual({
        code: 200,
        message: '操作成功',
        data: null,
      });
    });
  });

  describe('error', () => {
    it('应该返回错误响应格式', () => {
      const result = error('出错了');

      expect(result).toEqual({
        code: 400,
        message: '出错了',
      });
    });

    it('应该支持自定义错误码', () => {
      const result = error('服务器错误', 500);

      expect(result).toEqual({
        code: 500,
        message: '服务器错误',
      });
    });
  });

  describe('generateFileName', () => {
    it('应该生成正确格式的文件名', () => {
      const fileName = generateFileName('douyin', '测试账号');

      expect(fileName).toMatch(/^douyin_.*_\d+\.json$/);
    });

    it('应该清理特殊字符', () => {
      const fileName = generateFileName('bilibili', '账号@#$%');

      expect(fileName).toMatch(/^bilibili_.*_\d+\.json$/);
      expect(fileName).not.toContain('@');
      expect(fileName).not.toContain('#');
    });
  });
});
