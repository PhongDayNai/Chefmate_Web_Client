// app/features/chat/api/chatService.ts
import axios from "~/lib/apiClient"; 

const BASE_URL = "/api/ai-chat";

export const chatService = {
  // 1. Tạo session mới (POST /sessions)
  createSession: (data: { userId: number; firstMessage?: string; title?: string; model?: string }) =>
    axios.post(`${BASE_URL}/sessions`, { model: "gemma3:4b", ...data }).then((res: any) => res.data),

  // 2. Danh sách sessions (GET /sessions)
  listSessions: (userId: number, page = 1, limit = 50) =>
    axios.get(`${BASE_URL}/sessions`, { params: { userId, page, limit } }).then((res: any) => res.data),

  // 3. Lấy lịch sử session (GET /sessions/{sessionId})
  getSessionHistory: (sessionId: number, userId: number) =>
    axios.get(`${BASE_URL}/sessions/${sessionId}`, { params: { userId } }).then((res: any) => res.data),

  // 4. Xóa session (DELETE /sessions/{id})
  deleteSession: (sessionId: number, userId: number) =>
    axios.delete(`${BASE_URL}/sessions/${sessionId}`, { params: { userId } }).then((res: any) => res.data),

  // 5. Cập nhật tiêu đề (PATCH /sessions/title)
  updateTitle: (data: { userId: number; chatSessionId: number; title: string }) =>
    axios.patch(`${BASE_URL}/sessions/title`, data).then((res: any) => res.data),

  // 6. Cập nhật món ăn đang nấu trong session (PATCH /sessions/active-recipe)
  updateActiveRecipe: (data: { userId: number; chatSessionId: number; recipeId: number | null }) =>
    axios.patch(`${BASE_URL}/sessions/active-recipe`, data).then((res: any) => res.data),

  // 7. Gợi ý món từ tủ lạnh (POST /pantry-recommendations)
  getRecommendations: (userId: number, limit = 10) =>
    axios.post(`${BASE_URL}/pantry-recommendations`, { userId, limit }).then((res: any) => res.data),

  // 8. CHAT CHÍNH (POST /messages)
  sendMessage: (data: { userId: number; chatSessionId?: number; message: string }) =>
    axios.post(`${BASE_URL}/messages`, { 
      ...data, 
      model: "gemma3:4b", 
      stream: false, 
      useUnifiedSession: true 
    }).then((res: any) => res.data),

  // 9. Lấy Timeline hợp nhất (GET /timeline)
  getUnifiedTimeline: (userId: number, limit = 30, beforeMessageId?: number) =>
    axios.get(`${BASE_URL}/timeline`, { params: { userId, limit, beforeMessageId } }).then((res: any) => res.data),

  // 10. Xử lý session cũ và tạo mới (POST /resolve-previous-session)
  resolveAndCreate: (data: { userId: number; previousSessionId: number; action: 'complete_and_deduct' | 'skip_deduction'; pendingUserMessage?: string }) =>
    axios.post(`${BASE_URL}/resolve-previous-session`, data).then((res: any) => res.data),
};