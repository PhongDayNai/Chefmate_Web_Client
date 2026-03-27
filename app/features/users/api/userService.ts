import axios from "axios";
import { checkAuth } from "~/utils/authUtils";

const BASE_URL = "https://your-api-url.com/api/users";

export const userService = {
  // Đổi mật khẩu
  changePassword: async (data: any) => {
    // Auth guard for mutation
    if (!checkAuth()) {
      throw new Error("AUTH_REQUIRED");
    }

    const res = await axios.post(`${BASE_URL}/change-password`, data);
    return res.data;
  },
  // Cập nhật thông tin
  updateInfo: async (data: any) => {
    // Auth guard for mutation
    if (!checkAuth()) {
      throw new Error("AUTH_REQUIRED");
    }

    const res = await axios.post(`${BASE_URL}/update-user-information`, data);
    return res.data;
  },
  // Lấy lịch sử xem món ăn
  getViewHistory: async (userId: number) => {
    const res = await axios.get(`${BASE_URL}/recipes-view-history?userId=${userId}`);
    return res.data;
  }
};