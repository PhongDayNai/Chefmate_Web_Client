// app/features/auth/api/authService.ts
import axios from "axios";
import type { AuthResponse } from "../types";

const API_URL = "https://your-api-url.com/api/users";

export const authService = {
  login: async (identifier: string, password: string): Promise<AuthResponse> => {
    const response = await axios.post(`${API_URL}/login`, { identifier, password });
    return response.data;
  },
  
  register: async (fullName: string, phone: string, email: string, password: string): Promise<AuthResponse> => {
    const response = await axios.post(`${API_URL}/register`, { fullName, phone, email, password });
    return response.data;
  },

  forgotPassword: async (phone: string): Promise<AuthResponse> => {
    const response = await axios.post(`${API_URL}/forgot-password`, { phone });
    return response.data;
  }
};