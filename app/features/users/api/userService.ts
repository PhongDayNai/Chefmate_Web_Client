import axios from "axios";
const BASE_URL = "https://your-api-url.com/api/users";

export const userService = {
  // Đổi mật khẩu
  changePassword: async (data: any) => {
    const res = await axios.post(`${BASE_URL}/change-password`, data);
    return res.data;
  },
  // Cập nhật thông tin
  updateInfo: async (data: any) => {
    const res = await axios.post(`${BASE_URL}/update-user-information`, data);
    return res.data;
  },
  // Lấy lịch sử xem món ăn
  getViewHistory: async (userId: number) => {
    const res = await axios.get(`${BASE_URL}/recipes-view-history?userId=${userId}`);
    return res.data;
  }
};