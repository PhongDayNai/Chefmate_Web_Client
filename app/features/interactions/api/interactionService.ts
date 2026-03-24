import axios from "axios";
const BASE_URL = "https://your-api-url.com/api/interactions";

export const interactionService = {
  // Like hoặc Unlike
  likeRecipe: async (userId: number, recipeId: number) => {
    const res = await axios.post(`${BASE_URL}/like`, { userId, recipeId });
    return res.data;
  },
  // Gửi bình luận
  createComment: async (userId: number, recipeId: number, content: string) => {
    const res = await axios.post(`${BASE_URL}/comment`, { userId, recipeId, content });
    return res.data;
  },
  // Tăng lượt xem (gọi khi vào trang chi tiết)
  increaseView: async (recipeId: number) => {
    const res = await axios.post(`${BASE_URL}/increase-view-count`, { recipeId });
    return res.data;
  },
  // Xóa bình luận
  deleteComment: async (commentId: number) => {
    const res = await axios.delete(`${BASE_URL}/comment`, { data: { commentId } });
    return res.data;
  },
};