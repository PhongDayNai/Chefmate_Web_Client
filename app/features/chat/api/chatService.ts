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

const BASE_URL_V1 = "/v2/ai-chat-v1";
const BASE_URL_V2 = "/v2/ai-chat";

export const chatService = {
  listSessions: (page = 1, limit = 50) =>
    axios.get(`${BASE_URL_V1}/sessions`, { params: { page, limit } }).then((res: any) => res.data),

  getSessionHistory: (sessionId: number) =>
    axios.get(`${BASE_URL_V1}/sessions/${sessionId}`).then((res: any) => res.data),

  deleteSession: (sessionId: number) => axios.delete(`${BASE_URL_V1}/sessions/${sessionId}`).then((res: any) => res.data),

  updateTitle: (data: { chatSessionId: number; title: string }) =>
    axios.patch(`${BASE_URL_V1}/sessions/title`, data).then((res: any) => res.data),

  getRecommendations: (limit = 10) =>
    axios.post(`${BASE_URL_V1}/recommendations-from-pantry`, { limit }).then((res: any) => res.data),

  getUnifiedTimeline: ({ limit = 32, beforeMessageId }: UnifiedTimelineParams) =>
    axios.get(`${BASE_URL_V1}/messages`, { params: { limit, beforeMessageId } }).then((res: any) => res.data),

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
