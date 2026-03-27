// app/features/pantry/api/pantryService.ts
import axios from "axios";
import { checkAuth } from "~/utils/authUtils";
import { buildApiUrl } from "~/lib/apiConfig";

const BASE_URL = buildApiUrl("/api");

export const pantryService = {
  getByUser: async (userId: number) => {
    const res = await axios.get(`${BASE_URL}/pantry?userId=${userId}`);
    return res.data;
  },

  upsert: async (payload: { userId: number; ingredientName: string; quantity: number; unit: string; expiresAt: string }) => {
    if (!checkAuth()) {
      throw new Error("AUTH_REQUIRED");
    }

    const res = await axios.post(`${BASE_URL}/pantry/upsert`, payload);
    return res.data;
  },

  delete: async (userId: number, pantryItemId: number) => {
    if (!checkAuth()) {
      throw new Error("AUTH_REQUIRED");
    }

    const res = await axios.delete(`${BASE_URL}/pantry/delete`, {
      data: { userId, pantryItemId },
    });
    return res.data;
  },

  getAllIngredients: async () => {
    const res = await axios.get(`${BASE_URL}/recipes/ingredients`);
    return res.data;
  },
};
