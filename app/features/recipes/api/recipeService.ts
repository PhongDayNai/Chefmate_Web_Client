import axios from "axios";
import { checkAuth } from "~/utils/authUtils";
import { buildApiUrl } from "~/lib/apiConfig";

const BASE_URL = buildApiUrl("/api/recipes");

export const recipeService = {
  getTrending: async (page = 1, limit = 20) => {
    const response = await axios.get(`${BASE_URL}/trending-v2`, {
      params: { page, limit, period: "all" },
    });
    return response.data;
  },

  getTopTrendingLegacy: async (userId = 0) => {
    const response = await axios.post(`${BASE_URL}/top-trending`, { userId });
    return response.data;
  },

  getRecipeById: async (id: number) => {
    const response = await axios.get(`${BASE_URL}/all`);
    if (response.data.success) {
      return response.data.data.find((r: any) => r.recipeId === id);
    }
    return null;
  },

  searchByTag: async (tagName: string, userId: number) => {
    const res = await axios.post(`${BASE_URL}/search-by-tag`, { tagName, userId });
    return res.data;
  },

  searchRecipes: async (recipeName: string, userId: number) => {
    const res = await axios.post(`${BASE_URL}/search`, { recipeName, userId });
    return res.data;
  },

  getUserRecipes: async (userId: number) => {
    const res = await axios.post(`${BASE_URL}/user-recipes`, { userId });
    return res.data;
  },

  createRecipe: async (formData: FormData) => {
    if (!checkAuth()) {
      throw new Error("AUTH_REQUIRED");
    }

    const res = await axios.post(`${BASE_URL}/create`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
};
