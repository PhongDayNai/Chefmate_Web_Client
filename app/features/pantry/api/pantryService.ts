// app/features/pantry/api/pantryService.ts
import axios from "~/lib/apiClient";
import { checkAuth } from "~/utils/authUtils";
import { buildApiUrl } from "~/lib/apiConfig";

const BASE_URL = buildApiUrl("/v2/pantry");

export const pantryService = {
  getMine: async () => {
    const res = await axios.get(BASE_URL);
    return res.data;
  },

  upsert: async (payload: { ingredientName: string; quantity: number; unit: string; expiresAt: string }) => {
    if (!checkAuth()) {
      throw new Error("AUTH_REQUIRED");
    }

    const res = await axios.post(`${BASE_URL}/upsert`, payload);
    return res.data;
  },

  delete: async (pantryItemId: number) => {
    if (!checkAuth()) {
      throw new Error("AUTH_REQUIRED");
    }

    const res = await axios.delete(`${BASE_URL}/delete`, {
      data: { pantryItemId },
    });
    return res.data;
  },

  getAllIngredients: async () => {
    const res = await axios.get(buildApiUrl("/v2/recipes/ingredients"));
    return res.data;
  },
};
