import axios from "axios";
import { checkAuth } from "~/utils/authUtils";
import { buildApiUrl } from "~/lib/apiConfig";
import type { TrendingPeriod, TrendingV2Response } from "~/features/recipes/types";

const BASE_URL = buildApiUrl("/api/recipes");

interface GetTrendingV2Params {
  userId?: number;
  page?: number;
  limit?: number;
  period?: TrendingPeriod;
}

export const recipeService = {
  getTrendingV2: async ({ userId, page = 1, limit = 20, period = "all" }: GetTrendingV2Params = {}) => {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const response = await axios.get(`${BASE_URL}/trending-v2`, {
      params: { userId, page, limit: safeLimit, period },
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

  searchByTag: async (tagName: string, userId?: number) => {
    const payload: { tagName: string; userId?: number } = { tagName };
    if (typeof userId === "number" && Number.isFinite(userId) && userId > 0) {
      payload.userId = userId;
    }
    const res = await axios.post(`${BASE_URL}/search-by-tag`, payload);
    return res.data;
  },

  searchRecipes: async (recipeName: string, userId?: number) => {
    const payload: { recipeName: string; userId?: number } = { recipeName };
    if (typeof userId === "number" && Number.isFinite(userId) && userId > 0) {
      payload.userId = userId;
    }
    const res = await axios.post(`${BASE_URL}/search`, payload);
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
