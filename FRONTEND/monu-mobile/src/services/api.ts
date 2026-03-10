import axios from 'axios';

import { env } from '../config/env';

// BE wrap tất cả response trong { code, message, result: T }
interface ApiResponse<T> {
  code?: number;
  message?: string;
  result: T;
}

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Interceptor tự động unwrap result từ ApiResponse wrapper của BE
apiClient.interceptors.response.use(
  (response) => {
    if (response.data && 'result' in response.data) {
      response.data = (response.data as ApiResponse<unknown>).result;
    }
    return response;
  },
  (error) => {
    // Log chi tiết lỗi để debug
    if (error.response) {
      console.error('[API Error]', error.response.status, JSON.stringify(error.response.data));
      // Gắn message từ BE vào error để dùng ở UI
      const beMessage = error.response.data?.message;
      if (beMessage) error.message = beMessage;
    } else if (error.request) {
      console.error('[API Error] No response - có thể BE chưa chạy hoặc sai địa chỉ:', error.config?.baseURL);
      error.message = 'Không kết nối được tới server. Kiểm tra BE đang chạy và địa chỉ IP.';
    } else {
      console.error('[API Error]', error.message);
    }
    return Promise.reject(error);
  }
);

export const attachAccessToken = (token: string | null) => {
  if (!token) {
    delete apiClient.defaults.headers.common.Authorization;
    return;
  }

  apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
};
