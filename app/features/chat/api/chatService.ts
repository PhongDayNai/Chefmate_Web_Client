import axios from "~/lib/apiClient";
import type {
  CompleteMealSessionPayload,
  CreateMealSessionPayload,
  ReplaceMealRecipesPayload,
  SendMessagePayload,
  SetPrimaryRecipePayload,
  UnifiedTimelineParams,
  UpdateMealRecipeStatusPayload,
} from "~/features/chat/types";

const BASE_URL_V1 = "/api/ai-chat";
const BASE_URL_V2 = "/api/ai-chat/v2";

export const chatService = {
  listSessions: (userId: number, page = 1, limit = 50) =>
    axios.get(`${BASE_URL_V1}/sessions`, { params: { userId, page, limit } }).then((res: any) => res.data),

  getSessionHistory: (sessionId: number, userId: number) =>
    axios.get(`${BASE_URL_V1}/sessions/${sessionId}`, { params: { userId } }).then((res: any) => res.data),

  deleteSession: (sessionId: number, userId: number) =>
    axios.delete(`${BASE_URL_V1}/sessions/${sessionId}`, { params: { userId } }).then((res: any) => res.data),

  updateTitle: (data: { userId: number; chatSessionId: number; title: string }) =>
    axios.patch(`${BASE_URL_V1}/sessions/title`, data).then((res: any) => res.data),

  getRecommendations: (userId: number, limit = 10) =>
    axios.post(`${BASE_URL_V1}/recommendations-from-pantry`, { userId, limit }).then((res: any) => res.data),

  getUnifiedTimeline: ({ userId, limit = 32, beforeMessageId }: UnifiedTimelineParams) =>
    axios.get(`${BASE_URL_V1}/messages`, { params: { userId, limit, beforeMessageId } }).then((res: any) => res.data),

  createMealSession: (data: CreateMealSessionPayload) =>
    axios.post(`${BASE_URL_V2}/sessions/meal`, data).then((res: any) => res.data),

  replaceMealRecipes: (data: ReplaceMealRecipesPayload) =>
    axios.patch(`${BASE_URL_V2}/sessions/meal/recipes`, data).then((res: any) => res.data),

  setPrimaryRecipe: (data: SetPrimaryRecipePayload) =>
    axios.patch(`${BASE_URL_V2}/sessions/meal/primary-recipe`, data).then((res: any) => res.data),

  updateMealRecipeStatus: (data: UpdateMealRecipeStatusPayload) =>
    axios.patch(`${BASE_URL_V2}/sessions/meal/recipes/status`, data).then((res: any) => res.data),

  sendV2Message: (data: SendMessagePayload) =>
    axios
      .post(`${BASE_URL_V2}/messages`, {
        ...data,
        stream: false,
      })
      .then((res: any) => res.data),

  completeMealSession: (data: CompleteMealSessionPayload) =>
    axios.patch(`${BASE_URL_V2}/sessions/meal/complete`, data).then((res: any) => res.data),
};
