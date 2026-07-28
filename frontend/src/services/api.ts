import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** Token management helpers */
export function getAccessToken(): string | null {
  return localStorage.getItem('mailflow-token');
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('mailflow-refresh-token');
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem('mailflow-token', accessToken);
  localStorage.setItem('mailflow-refresh-token', refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem('mailflow-token');
  localStorage.removeItem('mailflow-refresh-token');
  localStorage.removeItem('mailflow-auth');
}

// ── Request Interceptor: Attach Access Token ──────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

// ── Response Interceptor: Automatic Refresh Token Handling ────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/register')
      ) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;
      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        clearTokens();
        window.dispatchEvent(new Event('mailflow-unauthorized'));
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken }
        );

        setTokens(data.accessToken, data.refreshToken);
        processQueue(null, data.accessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        window.dispatchEvent(new Event('mailflow-unauthorized'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
