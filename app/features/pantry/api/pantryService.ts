// app/features/pantry/api/pantryService.ts
import axios from "~/lib/apiClient";
import { checkAuth } from "~/utils/authUtils";
import { buildApiUrl } from "~/lib/apiConfig";

const BASE_URL = buildApiUrl("/v2/pantries");

export const pantryService = {
  // List all pantries for current user
  getPantries: async () => {
    if (!checkAuth()) throw new Error("AUTH_REQUIRED");
    const res = await axios.get(BASE_URL);
    return res.data;
  },

  // Create new pantry
  createPantry: async (name: string) => {
    if (!checkAuth()) throw new Error("AUTH_REQUIRED");
    const res = await axios.post(BASE_URL, { name });
    return res.data;
  },

  // Get pantry metadata
  getPantry: async (pantryId: number) => {
    if (!checkAuth()) throw new Error("AUTH_REQUIRED");
    const res = await axios.get(`${BASE_URL}/${pantryId}`);
    return res.data;
  },

  // Delete pantry (owner only)
  deletePantry: async (pantryId: number) => {
    if (!checkAuth()) throw new Error("AUTH_REQUIRED");
    const res = await axios.delete(`${BASE_URL}/${pantryId}`);
    return res.data;
  },

  // List items in a pantry
  getItems: async (pantryId: number, page = 1, limit = 100) => {
    if (!checkAuth()) throw new Error("AUTH_REQUIRED");
    const res = await axios.get(`${BASE_URL}/${pantryId}/items?page=${page}&limit=${limit}`);
    return res.data;
  },

  // Add/update item in pantry
  upsertItem: async (pantryId: number, payload: { ingredientName: string; quantity: number; unit: string; expiresAt: string | null }) => {
    if (!checkAuth()) throw new Error("AUTH_REQUIRED");
    const res = await axios.post(`${BASE_URL}/${pantryId}/items`, payload);
    return res.data;
  },

  // Delete item from pantry
  deleteItem: async (pantryId: number, itemId: number) => {
    if (!checkAuth()) throw new Error("AUTH_REQUIRED");
    const res = await axios.delete(`${BASE_URL}/${pantryId}/items/${itemId}`);
    return res.data;
  },

  // List shares (owner only)
  getShares: async (pantryId: number) => {
    if (!checkAuth()) throw new Error("AUTH_REQUIRED");
    const res = await axios.get(`${BASE_URL}/${pantryId}/shares`);
    return res.data;
  },

  // Share pantry with user (owner only)
  sharePantry: async (pantryId: number, targetUserId: number, role: "viewer" | "editor") => {
    if (!checkAuth()) throw new Error("AUTH_REQUIRED");
    const res = await axios.post(`${BASE_URL}/${pantryId}/shares`, { targetUserId, role });
    return res.data;
  },

  // Update share role (owner only)
  updateShare: async (pantryId: number, targetUserId: number, role: "viewer" | "editor") => {
    if (!checkAuth()) throw new Error("AUTH_REQUIRED");
    const res = await axios.put(`${BASE_URL}/${pantryId}/shares/${targetUserId}`, { role });
    return res.data;
  },

  // Remove share (owner only)
  removeShare: async (pantryId: number, targetUserId: number) => {
    if (!checkAuth()) throw new Error("AUTH_REQUIRED");
    const res = await axios.delete(`${BASE_URL}/${pantryId}/shares/${targetUserId}`);
    return res.data;
  },

  // Get all ingredients for autocomplete
  getAllIngredients: async () => {
    const res = await axios.get(buildApiUrl("/v2/recipes/ingredients"));
    return res.data;
  },

  // Legacy: get first pantry items (for chat context)
  getMine: async () => {
    const pantriesRes = await pantryService.getPantries();
    if (!pantriesRes.success || pantriesRes.data.length === 0) {
      return { success: false, data: [] };
    }
    return pantryService.getItems(pantriesRes.data[0].pantryId, 1, 100);
  },
};