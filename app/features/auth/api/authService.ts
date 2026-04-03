// app/features/auth/api/authService.ts
import axios from "axios";
import type { ApiResponse, AuthResponse } from "../types";
import { buildApiUrl } from "~/lib/apiConfig";
import {
  clearAuthSession,
  getRefreshToken,
  normalizeAuthSessionPayload,
  persistAuthSession,
} from "~/utils/authUtils";

const API_URL = buildApiUrl("/v2/users");

export const authService = {
  login: async (identifier: string, password: string): Promise<AuthResponse> => {
    const response = await axios.post(`${API_URL}/login`, { identifier, password });
    if (response.data.success) {
      const session = normalizeAuthSessionPayload(response.data.data);
      if (session) {
        persistAuthSession(session);
      }
    }
    return response.data;
  },

  register: async (fullName: string, phone: string, email: string, password: string): Promise<ApiResponse> => {
    const response = await axios.post(`${API_URL}/register`, { fullName, phone, email, password });
    return response.data;
  },

  forgotPassword: async (phone: string): Promise<ApiResponse> => {
    const response = await axios.post(`${API_URL}/forgot-password`, { phone });
    return response.data;
  },

  refreshToken: async (refreshToken = getRefreshToken()): Promise<AuthResponse> => {
    const response = await axios.post(`${API_URL}/refresh-token`, {
      refreshToken,
    });

    if (response.data.success) {
      const session = normalizeAuthSessionPayload(response.data.data);
      if (session) {
        persistAuthSession(session);
      }
    }

    return response.data;
  },

  logout: () => {
    clearAuthSession();
  },
};
