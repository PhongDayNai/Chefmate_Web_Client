// app/features/auth/api/authService.ts
import axios from "axios";
import type { AuthResponse } from "../types";
import { buildApiUrl } from "~/lib/apiConfig";

const API_URL = buildApiUrl("/api/users");

export const authService = {
  login: async (identifier: string, password: string): Promise<AuthResponse> => {
    const response = await axios.post(`${API_URL}/login`, { identifier, password });
    if (response.data.success) {
      const data = response.data.data;
      localStorage.setItem("userId", String(data.userId));
      localStorage.setItem("userName", data.fullName);
      localStorage.setItem("userPhone", data.phone);
      localStorage.setItem("userEmail", data.email);
    }
    return response.data;
  },

  register: async (fullName: string, phone: string, email: string, password: string): Promise<AuthResponse> => {
    const response = await axios.post(`${API_URL}/register`, { fullName, phone, email, password });
    return response.data;
  },

  forgotPassword: async (phone: string): Promise<AuthResponse> => {
    const response = await axios.post(`${API_URL}/forgot-password`, { phone });
    return response.data;
  },
};
