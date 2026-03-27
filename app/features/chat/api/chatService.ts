import axios from "~/lib/apiClient";
import type { ResolvePreviousPayload, SendMessagePayload, UnifiedTimelineParams } from "~/features/chat/types";

const BASE_URL = "/api/ai-chat";

export const chatService = {
  createSession: (data: { userId: number; firstMessage?: string; title?: string; model?: string; activeRecipeId?: number | null }) =>
    axios.post(`${BASE_URL}/sessions`, { model: "gemma3:4b", ...data }).then((res: any) => res.data),

  listSessions: (userId: number, page = 1, limit = 50) =>
    axios.get(`${BASE_URL}/sessions`, { params: { userId, page, limit } }).then((res: any) => res.data),

  getSessionHistory: (sessionId: number, userId: number) =>
    axios.get(`${BASE_URL}/sessions/${sessionId}`, { params: { userId } }).then((res: any) => res.data),

  deleteSession: (sessionId: number, userId: number) =>
    axios.delete(`${BASE_URL}/sessions/${sessionId}`, { params: { userId } }).then((res: any) => res.data),

  updateTitle: (data: { userId: number; chatSessionId: number; title: string }) =>
    axios.patch(`${BASE_URL}/sessions/title`, data).then((res: any) => res.data),

  updateActiveRecipe: (data: { userId: number; chatSessionId: number; recipeId: number | null }) =>
    axios.patch(`${BASE_URL}/sessions/active-recipe`, data).then((res: any) => res.data),

  getRecommendations: (userId: number, limit = 10) =>
    axios.post(`${BASE_URL}/recommendations-from-pantry`, { userId, limit }).then((res: any) => res.data),

  sendMessage: (data: SendMessagePayload) =>
    axios
      .post(`${BASE_URL}/messages`, {
        ...data,
        model: "gemma3:4b",
        stream: false,
      })
      .then((res: any) => res.data),

  getUnifiedTimeline: ({ userId, limit = 30, beforeMessageId }: UnifiedTimelineParams) =>
    axios.get(`${BASE_URL}/messages`, { params: { userId, limit, beforeMessageId } }).then((res: any) => res.data),

  resolveAndCreate: (data: ResolvePreviousPayload) =>
    axios.post(`${BASE_URL}/sessions/resolve-previous`, data).then((res: any) => res.data),
};
