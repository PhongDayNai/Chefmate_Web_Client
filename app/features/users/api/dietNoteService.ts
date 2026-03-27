import axios from "axios";
import { checkAuth } from "~/utils/authUtils";
import { buildApiUrl } from "~/lib/apiConfig";

const BASE_URL = buildApiUrl("/api/user-diet-notes");

export const dietNoteService = {
  getNotes: async (userId: number) => {
    const res = await axios.get(`${BASE_URL}?userId=${userId}`);
    return res.data;
  },

  upsertNote: async (data: any) => {
    if (!checkAuth()) {
      throw new Error("AUTH_REQUIRED");
    }

    const res = await axios.post(`${BASE_URL}/upsert`, data);
    return res.data;
  },

  deleteNote: async (userId: number, noteId: number) => {
    if (!checkAuth()) {
      throw new Error("AUTH_REQUIRED");
    }

    const res = await axios.delete(`${BASE_URL}/delete`, { data: { userId, noteId } });
    return res.data;
  },
};
