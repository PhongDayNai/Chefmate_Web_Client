import axios from "axios";
import { checkAuth } from "~/utils/authUtils";
import { buildApiUrl } from "~/lib/apiConfig";

const BASE_URL = buildApiUrl("/api/users");

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

    const res = await axios.post(`${BASE_URL}/update-user-information`, data);
    return res.data;
  },

  getViewHistory: async (userId: number) => {
    const res = await axios.get(`${BASE_URL}/recipes-view-history?userId=${userId}`);
    return res.data;
  },
};
