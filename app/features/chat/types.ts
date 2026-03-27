export type ChatRole = "user" | "assistant" | "system";

export interface ChatSession {
  chatSessionId: number;
  userId?: number;
  title: string;
  activeRecipeId?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatMessage {
  chatMessageId?: number;
  tempId?: string;
  userId?: number;
  chatSessionId?: number;
  sessionTitle?: string;
  activeRecipeId?: number | null;
  isSessionStart?: boolean;
  role: ChatRole;
  content: string;
  meta?: Record<string, unknown> | null;
  createdAt: string;
  isPending?: boolean;
}

export interface ChatPaging {
  limit: number;
  hasMore: boolean;
  nextBeforeMessageId: number | null;
}

export interface PendingPreviousRecipe {
  previousSessionId: number;
  previousSessionTitle?: string;
  previousRecipeId?: number | null;
  previousRecipeName?: string;
  pendingUserMessage?: string;
}

export type DietNoteType = "allergy" | "restriction" | "preference" | "health_note";

export interface DietNote {
  noteId: number;
  userId?: number;
  noteType: DietNoteType | string;
  label: string;
  keywords?: string[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatRecommendation {
  recipeId: number;
  recipeName: string;
  imageUrl?: string;
  ration?: number;
  cookingTime?: string;
  missingIngredientsCount?: number;
  missingIngredients?: string[];
  [key: string]: unknown;
}

export interface PantryItem {
  pantryId?: number;
  ingredientName?: string;
  quantity?: number | string;
  unit?: string;
  [key: string]: unknown;
}

export interface ChatRecommendationsData {
  recommendationLimit?: number;
  recommendations: ChatRecommendation[];
  readyToCook: ChatRecommendation[];
  almostReady: ChatRecommendation[];
  unavailable: ChatRecommendation[];
}

export interface ChatUiState {
  currentSessionId: number | null;
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  timeline: ChatMessage[];
  hasMore: boolean;
  nextBeforeMessageId: number | null;
  lastRequestedBeforeMessageId: number | null;
  noProgressLoadCount: number;
  limit: number;
  sending: boolean;
  loadingTimeline: boolean;
  loadingSessions: boolean;
  aiBusyRetryCount: number;
  pendingPreviousRecipe: PendingPreviousRecipe | null;
  errorMessage: string | null;
  dietNotes: DietNote[];
  recommendations: ChatRecommendation[];
  readyToCook: ChatRecommendation[];
  almostReady: ChatRecommendation[];
  unavailable: ChatRecommendation[];
  pantryItems: PantryItem[];
}

export interface ResolvePreviousPayload {
  userId: number;
  previousSessionId: number;
  action: "complete_and_deduct" | "skip_deduction" | "continue_current_session";
  pendingUserMessage?: string | null;
}

export interface UnifiedTimelineParams {
  userId: number;
  limit?: number;
  beforeMessageId?: number;
}

export interface SendMessagePayload {
  userId: number;
  chatSessionId?: number;
  message: string;
}
