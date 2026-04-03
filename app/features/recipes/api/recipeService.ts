import axios from "~/lib/apiClient";
import { checkAuth } from "~/utils/authUtils";
import { buildApiUrl } from "~/lib/apiConfig";
import type { TrendingPeriod, TrendingV2Response } from "~/features/recipes/types";

const BASE_URL = buildApiUrl("/v2/recipes");

interface GetTrendingV2Params {
  page?: number;
  limit?: number;
  period?: TrendingPeriod;
}

export const recipeService = {
  getTrendingV2: async ({ page = 1, limit = 20, period = "all" }: GetTrendingV2Params = {}) => {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const response = await axios.get(`${BASE_URL}/trending-v2`, {
      params: { page, limit: safeLimit, period },
    });
    return response.data as TrendingV2Response;
  },

  getAllRecipes: async () => {
    const response = await axios.get(`${BASE_URL}/all`);
    if (response.data.success) {
      return Array.isArray(response.data.data) ? response.data.data : [];
    }
    return [];
  },

  getRecipeById: async (id: number) => {
    const recipes = await recipeService.getAllRecipes();
    return recipes.find((r: any) => r.recipeId === id) || null;
  },

  getRecipesByIds: async (ids: number[]) => {
    if (!ids.length) return [];
    const uniqueIds = Array.from(new Set(ids));
    const recipes = await recipeService.getAllRecipes();
    const recipeMap = new Map(recipes.map((item: any) => [item.recipeId, item]));
    return uniqueIds.map((id) => recipeMap.get(id)).filter(Boolean);
  },

  searchByTag: async (tagName: string) => {
    const res = await axios.post(`${BASE_URL}/search-by-tag`, { tagName });
    return res.data;
  },

  searchRecipes: async (recipeName: string) => {
    const res = await axios.post(`${BASE_URL}/search`, { recipeName });
    return res.data;
  },

  getUserRecipes: async () => {
    const res = await axios.get(`${BASE_URL}/me`);
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
