import { ApiResponse } from '../types';

// 成功响应
export function success<T>(data: T, message = 'Success'): ApiResponse<T> {
  return {
    code: 200,
    message,
    data,
  };
}

// 错误响应
export function error(message: string, code = 400): ApiResponse {
  return {
    code,
    message,
  };
}
