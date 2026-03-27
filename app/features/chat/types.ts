export interface Message {
  messageId?: number;
  userId: number;
  chatSessionId: number;
  message: string;
  role: "user" | "assistant";
  createdAt: string;
}

export interface ChatSession {
  chatSessionId: number;
  title: string;
  activeRecipeId?: number | null;
  createdAt: string;
}