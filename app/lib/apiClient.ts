// app/lib/apiClient.ts
import axios, { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from "axios";
import toast from "react-hot-toast";
import { API_BASE_URL, CHAT_API_TOKEN, buildApiUrl } from "~/lib/apiConfig";
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  normalizeAuthSessionPayload,
  persistAuthSession,
} from "~/utils/authUtils";

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

type RefreshSubscriber = (accessToken: string | null) => void;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let refreshSubscribers: RefreshSubscriber[] = [];

function isChatRequest(url?: string): boolean {
  return Boolean(url?.includes("/v2/ai-chat") || url?.includes("/v2/ai-chat-v1"));
}

function isAuthRequest(url?: string): boolean {
  return Boolean(
    url?.includes("/v2/users/login") ||
      url?.includes("/v2/users/register") ||
      url?.includes("/v2/users/forgot-password") ||
      url?.includes("/v2/users/refresh-token"),
  );
}

function notifyRefreshSubscribers(accessToken: string | null) {
  refreshSubscribers.forEach((callback) => callback(accessToken));
  refreshSubscribers = [];
}

function subscribeToRefresh(callback: RefreshSubscriber) {
  refreshSubscribers.push(callback);
}

function redirectToAuth(message: string) {
  clearAuthSession();
  if (typeof window === "undefined") return;
  toast.error(message);
  window.location.href = "/auth";
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const response = await axios.post(buildApiUrl("/v2/users/refresh-token"), {
    refreshToken,
  });

  const session = normalizeAuthSessionPayload(response.data?.data);
  if (!session) {
    return null;
  }

  persistAuthSession(session);
  return session.accessToken;
}

apiClient.interceptors.request.use(
  (config) => {
    const headers = AxiosHeaders.from(config.headers);
    const accessToken = getAccessToken();

    if (accessToken && !headers.has("Authorization") && !isAuthRequest(config.url)) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    if (isChatRequest(config.url) && CHAT_API_TOKEN && !headers.has("x-api-key")) {
      headers.set("x-api-key", CHAT_API_TOKEN);
    }

    config.headers = headers;
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;

    if (!originalRequest || status !== 401 || originalRequest._retry || isAuthRequest(originalRequest.url)) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      if (getAccessToken()) {
        redirectToAuth("Phiên đăng nhập hết hạn!");
      }
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeToRefresh((nextAccessToken) => {
          if (!nextAccessToken) {
            reject(error);
            return;
          }

          const headers = AxiosHeaders.from(originalRequest.headers);
          headers.set("Authorization", `Bearer ${nextAccessToken}`);
          if (isChatRequest(originalRequest.url) && CHAT_API_TOKEN) {
            headers.set("x-api-key", CHAT_API_TOKEN);
          }

          originalRequest.headers = headers;
          resolve(apiClient(originalRequest));
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const nextAccessToken = await refreshAccessToken();
      notifyRefreshSubscribers(nextAccessToken);

      if (!nextAccessToken) {
        redirectToAuth("Phiên đăng nhập hết hạn!");
        return Promise.reject(error);
      }

      const headers = AxiosHeaders.from(originalRequest.headers);
      headers.set("Authorization", `Bearer ${nextAccessToken}`);
      if (isChatRequest(originalRequest.url) && CHAT_API_TOKEN) {
        headers.set("x-api-key", CHAT_API_TOKEN);
      }

      originalRequest.headers = headers;
      return apiClient(originalRequest);
    } catch (refreshError) {
      notifyRefreshSubscribers(null);
      redirectToAuth("Phiên đăng nhập hết hạn!");
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default apiClient;
