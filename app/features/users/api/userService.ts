import axios from "~/lib/apiClient";
import { checkAuth } from "~/utils/authUtils";
import { buildApiUrl } from "~/lib/apiConfig";

const BASE_URL = buildApiUrl("/v2/users");

export const userService = {
  changePassword: async (data: any) => {
    if (!checkAuth()) {
      throw new Error("AUTH_REQUIRED");
    }

    const res = await axios.post(`${BASE_URL}/change-password`, data);
    return res.data;
  },

  updateInfo: async (data: any) => {
    if (!checkAuth()) {
      throw new Error("AUTH_REQUIRED");
    }

    const res = await axios.patch(`${BASE_URL}/me`, data);
    return res.data;
  },

  getViewHistory: async () => {
    const res = await axios.get(`${BASE_URL}/recipes-view-history`);
    return res.data;
  },
};
