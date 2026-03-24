// app/features/pantry/api/pantryService.ts
import axios from "axios";
const BASE_URL = "https://your-api-url.com/api";

export const pantryService = {
  // Lấy danh sách
  getByUser: async (userId: number) => {
    const res = await axios.get(`${BASE_URL}/pantry?userId=${userId}`);
    return res.data;
  },
  // Thêm hoặc sửa
  upsert: async (payload: { userId: number; ingredientName: string; quantity: number; unit: string; expiresAt: string }) => {
    const res = await axios.post(`${BASE_URL}/pantry/upsert`, payload);
    return res.data;
  },
  // Xóa
  delete: async (userId: number, pantryItemId: number) => {
    const res = await axios.delete(`${BASE_URL}/pantry/delete`, {
      data: { userId, pantryItemId }
    });
    return res.data;
  },
  // Lấy danh sách tất cả tên nguyên liệu để gợi ý
  getAllIngredients: async () => {
    const res = await axios.get(`${BASE_URL}/recipes/ingredients`);
    return res.data;
  }
};