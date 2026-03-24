import axios from "axios";
const BASE_URL = "https://your-api-url.com/api/user-diet-notes";

export const dietNoteService = {
  // Lấy danh sách ghi chú
  getNotes: async (userId: number) => {
    const res = await axios.get(`${BASE_URL}?userId=${userId}`);
    return res.data;
  },
  // Thêm hoặc cập nhật ghi chú
  upsertNote: async (data: any) => {
    const res = await axios.post(`${BASE_URL}/upsert`, data);
    return res.data;
  },
  // Xóa ghi chú
  deleteNote: async (userId: number, noteId: number) => {
    const res = await axios.delete(`${BASE_URL}/delete`, { data: { userId, noteId } });
    return res.data;
  }
};