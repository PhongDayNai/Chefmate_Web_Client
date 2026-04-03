import axios from "~/lib/apiClient";
import { checkAuth } from "~/utils/authUtils";
import { buildApiUrl } from "~/lib/apiConfig";

const BASE_URL = buildApiUrl("/v2/interactions");

export const interactionService = {
  likeRecipe: async (recipeId: number) => {
    if (!checkAuth()) {
      throw new Error("AUTH_REQUIRED");
    }

    const res = await axios.post(`${BASE_URL}/like`, { recipeId });
    return res.data;
  },

  createComment: async (recipeId: number, content: string) => {
    if (!checkAuth()) {
      throw new Error("AUTH_REQUIRED");
    }

    const res = await axios.post(`${BASE_URL}/comment`, { recipeId, content });
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
