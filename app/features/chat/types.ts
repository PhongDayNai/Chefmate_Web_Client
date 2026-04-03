export type ChatRole = "user" | "assistant" | "system";

export type MealRecipeStatus = "pending" | "cooking" | "done" | "skipped";
export type MealCompletionType = "completed" | "abandoned";
export type MealRemainingStatus = "done" | "skipped" | null;

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
  isFailed?: boolean;
  retryable?: boolean;
  retryAfterMs?: number | null;
  retryAvailableAt?: string | null;
  failedReason?: string | null;
}

export interface ChatPaging {
  limit: number;
  hasMore: boolean;
  nextBeforeMessageId: number | null;
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

export interface MealItem {
  recipeId: number;
  recipeName: string;
  sortOrder: number;
  status: MealRecipeStatus;
  servingsOverride?: number | null;
  note?: string | null;
}

export interface MealSessionState {
  chatSessionId: number | null;
  activeRecipeId: number | null;
  needsSelection: boolean;
  uiClosed: boolean;
}

export interface PendingPrimarySwitch {
  reason?: string;
  closedRecipeId: number;
  closedRecipeStatus: MealRecipeStatus;
  currentPrimaryRecipeId?: number | null;
  candidateNextPrimaryRecipeIds: number[];
  suggestedNextPrimaryRecipeId?: number | null;
  confirmField: string;
  chooseField: string;
  pendingStatusPayload: {
    recipeId: number;
    status: MealRecipeStatus;
    note?: string | null;
  };
}

export interface MealSnapshot {
  mealSession: MealSessionState;
  mealItems: MealItem[];
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
  errorMessage: string | null;
  dietNotes: DietNote[];
  recommendations: ChatRecommendation[];
  readyToCook: ChatRecommendation[];
  almostReady: ChatRecommendation[];
  unavailable: ChatRecommendation[];
  pantryItems: PantryItem[];
  mealSession: MealSessionState;
  mealItems: MealItem[];
  pendingPrimarySwitch: PendingPrimarySwitch | null;
  mealSyncing: boolean;
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
  stream?: boolean;
  useUnifiedSession?: boolean;
}

export interface CreateMealSessionPayload {
  userId: number;
  title?: string;
  recipeIds: number[];
}

export interface ReplaceMealRecipesPayload {
  userId: number;
  chatSessionId: number;
  recipes: Array<{
    recipeId: number;
    sortOrder: number;
    status: MealRecipeStatus;
    servingsOverride?: number | null;
    note?: string | null;
  }>;
}

export interface SetPrimaryRecipePayload {
  userId: number;
  chatSessionId: number;
  recipeId: number | null;
}

export interface UpdateMealRecipeStatusPayload {
  userId: number;
  chatSessionId: number;
  recipeId: number;
  status: MealRecipeStatus;
  note?: string | null;
  [key: string]: unknown;
}

export interface CompleteMealSessionPayload {
  userId: number;
  chatSessionId: number;
  completionType?: MealCompletionType;
  note?: string | null;
  markRemainingStatus?: MealRemainingStatus;
}
