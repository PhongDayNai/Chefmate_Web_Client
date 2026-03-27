import axios from "axios";
import { checkAuth } from "~/utils/authUtils";
import { buildApiUrl } from "~/lib/apiConfig";

const BASE_URL = buildApiUrl("/api/interactions");

export const interactionService = {
  likeRecipe: async (userId: number, recipeId: number) => {
    if (!checkAuth()) {
      throw new Error("AUTH_REQUIRED");
    }

    const res = await axios.post(`${BASE_URL}/like`, { userId, recipeId });
    return res.data;
  },

  createComment: async (userId: number, recipeId: number, content: string) => {
    if (!checkAuth()) {
      throw new Error("AUTH_REQUIRED");
    }

    const res = await axios.post(`${BASE_URL}/comment`, { userId, recipeId, content });
    return res.data;
  },

  increaseView: async (recipeId: number) => {
    const res = await axios.post(`${BASE_URL}/increase-view-count`, { recipeId });
    return res.data;
  },

  deleteComment: async (commentId: number) => {
    if (!checkAuth()) {
      throw new Error("AUTH_REQUIRED");
    }

    const res = await axios.delete(`${BASE_URL}/comment`, { data: { commentId } });
    return res.data;
  },
};
