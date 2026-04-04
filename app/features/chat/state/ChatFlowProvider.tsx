"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import toast from "react-hot-toast";
import { chatService } from "~/features/chat/api/chatService";
import type {
  ChatMessage,
  ChatPaging,
  ChatRecommendation,
  ChatSession,
  ChatUiState,
  CompleteMealSessionPayload,
  DietNote,
  MealCompletionType,
  MealItem,
  MealRecipeStatus,
  MealRemainingStatus,
  MealSessionState,
  MealSnapshot,
  PantryItem,
  PendingPrimarySwitch,
} from "~/features/chat/types";
import { dietNoteService } from "~/features/users/api/dietNoteService";
import { pantryService } from "~/features/pantry/api/pantryService";
import { recipeService } from "~/features/recipes/api/recipeService";
import { getAuthUserId } from "~/utils/authUtils";

const DEFAULT_LIMIT = 32;
const SESSION_CREATE_TIMELINE_LIMIT = 30;
const MAX_NO_PROGRESS_ATTEMPTS = 2;
const LAST_CHAT_SESSION_ID_KEY = "lastChatSessionId";
const LAST_CHAT_USER_ID_KEY = "lastChatUserId";
const MEAL_SNAPSHOT_KEY_PREFIX = "chatMealSnapshot";
const LATEST_MEAL_SNAPSHOT_KEY_PREFIX = "chatMealLatestSession";

type ChatAction =
  | { type: "MERGE"; payload: Partial<ChatUiState> }
  | { type: "RESET" };

const initialMealSession: MealSessionState = {
  chatSessionId: null,
  activeRecipeId: null,
  needsSelection: false,
  uiClosed: false,
};

const initialState: ChatUiState = {
  currentSessionId: null,
  currentSession: null,
  sessions: [],
  timeline: [],
  hasMore: true,
  nextBeforeMessageId: null,
  lastRequestedBeforeMessageId: null,
  noProgressLoadCount: 0,
  limit: DEFAULT_LIMIT,
  sending: false,
  loadingTimeline: false,
  loadingSessions: false,
  errorMessage: null,
  dietNotes: [],
  recommendations: [],
  readyToCook: [],
  almostReady: [],
  unavailable: [],
  pantryItems: [],
  mealSession: initialMealSession,
  mealItems: [],
  pendingPrimarySwitch: null,
  mealSyncing: false,
};

interface UpsertDietNotePayload {
  noteId?: number;
  noteType: string;
  label: string;
  keywords?: string[];
  isActive?: boolean;
}

interface SendMessageOptions {
  reuseTempId?: string;
}

interface CompleteMealOptions {
  completionType?: MealCompletionType;
  note?: string | null;
  markRemainingStatus?: MealRemainingStatus;
}

interface UpdateMealStatusOptions {
  recipeId: number;
  status: MealRecipeStatus;
  note?: string | null;
}

interface ChatFlowContextValue {
  state: ChatUiState;
  isLoggedIn: boolean;
  getUserId: () => number | null;
  clearChatError: () => void;
  clearPendingPrimarySwitch: () => void;
  refreshRecommendations: () => Promise<void>;
  refreshDietNotes: () => Promise<void>;
  upsertDietNote: (payload: UpsertDietNotePayload) => Promise<boolean>;
  deleteDietNote: (noteId: number) => Promise<boolean>;
  bootstrapUnifiedTimeline: () => Promise<void>;
  loadOlderMessages: () => Promise<void>;
  sendMessage: (message: string, options?: SendMessageOptions) => Promise<void>;
  retryMessage: (tempId: string) => Promise<void>;
  syncMealSelection: (items: MealItem[]) => Promise<boolean>;
  setPrimaryRecipe: (recipeId: number | null) => Promise<boolean>;
  updateMealRecipeStatus: (payload: UpdateMealStatusOptions) => Promise<boolean>;
  confirmPendingPrimarySwitch: (nextPrimaryRecipeId: number) => Promise<boolean>;
  completeCurrentSession: (options?: CompleteMealOptions) => Promise<boolean>;
}

const ChatFlowContext = createContext<ChatFlowContextValue | undefined>(undefined);

function chatReducer(state: ChatUiState, action: ChatAction): ChatUiState {
  switch (action.type) {
    case "MERGE":
      return { ...state, ...action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

function getUserIdFromStorage(): number | null {
  return getAuthUserId();
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getPositiveNumberFromStorage(key: string): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function clearStoredLastChatSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LAST_CHAT_SESSION_ID_KEY);
  localStorage.removeItem(LAST_CHAT_USER_ID_KEY);
}

function persistStoredLastChatSession(userId: number, sessionId: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_CHAT_USER_ID_KEY, String(userId));
  localStorage.setItem(LAST_CHAT_SESSION_ID_KEY, String(sessionId));
}

function getStoredLastChatSessionForUser(userId: number): number | null {
  const storedUserId = getPositiveNumberFromStorage(LAST_CHAT_USER_ID_KEY);
  const storedSessionId = getPositiveNumberFromStorage(LAST_CHAT_SESSION_ID_KEY);

  if (!storedUserId || storedUserId !== userId || !storedSessionId) {
    clearStoredLastChatSession();
    return null;
  }

  return storedSessionId;
}

function extractData(input: any): any {
  if (input && typeof input === "object" && "data" in input && (input.success !== undefined || input.message !== undefined)) {
    return input.data;
  }
  return input?.data ?? input;
}

function normalizeSession(raw: any): ChatSession | null {
  if (!raw || typeof raw !== "object") return null;
  const chatSessionId = Number(raw.chatSessionId);
  if (!Number.isFinite(chatSessionId) || chatSessionId <= 0) return null;

  return {
    chatSessionId,
    userId: raw.userId ? Number(raw.userId) : undefined,
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : "Bepes",
    activeRecipeId: toNullableNumber(raw.activeRecipeId),
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : undefined,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
  };
}

function normalizeMessage(raw: any): ChatMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const role = raw.role;
  if (role !== "user" && role !== "assistant" && role !== "system") return null;

  const content = typeof raw.content === "string" ? raw.content : typeof raw.message === "string" ? raw.message : "";
  if (!content.trim()) return null;

  return {
    chatMessageId: raw.chatMessageId ? Number(raw.chatMessageId) : raw.messageId ? Number(raw.messageId) : undefined,
    tempId: typeof raw.tempId === "string" ? raw.tempId : undefined,
    userId: raw.userId ? Number(raw.userId) : undefined,
    chatSessionId: raw.chatSessionId ? Number(raw.chatSessionId) : undefined,
    sessionTitle: typeof raw.sessionTitle === "string" ? raw.sessionTitle : undefined,
    activeRecipeId: toNullableNumber(raw.activeRecipeId),
    isSessionStart: Boolean(raw.isSessionStart),
    role,
    content,
    meta: raw.meta ?? null,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
    isPending: Boolean(raw.isPending),
    isFailed: Boolean(raw.isFailed),
    retryable: raw.retryable === undefined ? undefined : Boolean(raw.retryable),
    retryAfterMs: raw.retryAfterMs !== undefined && raw.retryAfterMs !== null ? Number(raw.retryAfterMs) : undefined,
    retryAvailableAt: typeof raw.retryAvailableAt === "string" ? raw.retryAvailableAt : null,
    failedReason: typeof raw.failedReason === "string" ? raw.failedReason : null,
  };
}

function normalizeMessages(raw: any): ChatMessage[] {
  const source = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.items)
      ? raw.items
      : Array.isArray(raw?.messages)
        ? raw.messages
        : Array.isArray(raw?.history)
          ? raw.history
          : [];

  return source
    .map((item: any) => normalizeMessage(item))
    .filter((item: ChatMessage | null): item is ChatMessage => Boolean(item));
}

function normalizePaging(raw: any, fallbackLimit: number): ChatPaging {
  return {
    limit: Number(raw?.limit ?? fallbackLimit),
    hasMore: Boolean(raw?.hasMore),
    nextBeforeMessageId:
      raw?.nextBeforeMessageId !== undefined && raw?.nextBeforeMessageId !== null
        ? Number(raw.nextBeforeMessageId)
        : null,
  };
}

function normalizeRecommendation(raw: any): ChatRecommendation | null {
  if (!raw || typeof raw !== "object") return null;

  const recipeId = Number(raw.recipeId ?? raw.id);
  const recipeName = typeof raw.recipeName === "string" ? raw.recipeName : typeof raw.title === "string" ? raw.title : "";
  if (!Number.isFinite(recipeId) || recipeId <= 0 || !recipeName.trim()) return null;

  return {
    ...raw,
    recipeId,
    recipeName: recipeName.trim(),
    imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : undefined,
    ration: raw.ration !== undefined && raw.ration !== null ? Number(raw.ration) : undefined,
    cookingTime: typeof raw.cookingTime === "string" ? raw.cookingTime : undefined,
    missingIngredientsCount:
      raw.missingIngredientsCount !== undefined && raw.missingIngredientsCount !== null
        ? Number(raw.missingIngredientsCount)
        : undefined,
    missingIngredients: Array.isArray(raw.missingIngredients)
      ? raw.missingIngredients.filter((value: unknown): value is string => typeof value === "string")
      : undefined,
  };
}

function normalizeRecommendations(raw: unknown): ChatRecommendation[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => normalizeRecommendation(item))
    .filter((item): item is ChatRecommendation => Boolean(item));
}

function normalizeTrendingRecipes(raw: unknown): ChatRecommendation[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item: any) =>
      normalizeRecommendation({
        ...item,
        recipeId: item?.recipeId,
        recipeName: item?.recipeName,
        imageUrl: item?.image,
        ration: item?.ration,
        cookingTime: item?.cookingTime,
        missingIngredientsCount: undefined,
        missingIngredients: undefined,
      }),
    )
    .filter((item): item is ChatRecommendation => Boolean(item));
}

function normalizeDietNote(raw: any): DietNote | null {
  if (!raw || typeof raw !== "object") return null;
  const noteId = Number(raw.noteId ?? raw.id);
  const label = typeof raw.label === "string" ? raw.label : "";
  const noteType = typeof raw.noteType === "string" ? raw.noteType : "preference";
  if (!Number.isFinite(noteId) || noteId <= 0 || !label.trim()) return null;

  return {
    noteId,
    userId: raw.userId ? Number(raw.userId) : undefined,
    noteType,
    label: label.trim(),
    keywords: Array.isArray(raw.keywords) ? raw.keywords.filter((item: unknown): item is string => typeof item === "string") : undefined,
    isActive: raw.isActive !== undefined ? Boolean(raw.isActive) : true,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : undefined,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
  };
}

function normalizeDietNotes(raw: unknown): DietNote[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => normalizeDietNote(item)).filter((item): item is DietNote => Boolean(item));
}

function normalizePantryItems(raw: unknown): PantryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is PantryItem => Boolean(item) && typeof item === "object");
}

function normalizeMealStatus(value: unknown): MealRecipeStatus {
  return value === "cooking" || value === "done" || value === "skipped" ? value : "pending";
}

function sortMealItems(items: MealItem[]): MealItem[] {
  return [...items]
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.recipeId - b.recipeId;
    })
    .map((item, index) => ({
      ...item,
      sortOrder: index + 1,
    }));
}

function normalizeMealItem(raw: any): MealItem | null {
  if (!raw || typeof raw !== "object") return null;
  const recipeId = Number(raw.recipeId);
  const recipeName =
    typeof raw.recipeName === "string"
      ? raw.recipeName
      : typeof raw.recipe?.recipeName === "string"
        ? raw.recipe.recipeName
      : typeof raw.title === "string"
        ? raw.title
        : "";

  if (!Number.isFinite(recipeId) || recipeId <= 0 || !recipeName.trim()) return null;

  return {
    recipeId,
    recipeName: recipeName.trim(),
    sortOrder: Number(raw.sortOrder ?? raw.order ?? 0) || 0,
    status: normalizeMealStatus(raw.status),
    servingsOverride:
      raw.servingsOverride !== undefined && raw.servingsOverride !== null ? Number(raw.servingsOverride) : undefined,
    note: typeof raw.note === "string" ? raw.note : null,
  };
}

function normalizeMealItems(raw: unknown): MealItem[] {
  if (!Array.isArray(raw)) return [];
  return sortMealItems(
    raw
      .map((item) => normalizeMealItem(item))
      .filter((item): item is MealItem => Boolean(item)),
  );
}

function deriveNeedsSelection(items: MealItem[], activeRecipeId: number | null): boolean {
  return items.length > 1 && !activeRecipeId;
}

function buildFocusedMessage(message: string, mealSession: MealSessionState, mealItems: MealItem[]): string {
  if (!mealSession.activeRecipeId) return message;

  const activeItem = mealItems.find((item) => item.recipeId === mealSession.activeRecipeId);
  if (!activeItem?.recipeName?.trim()) return message;

  return [
    `Ngữ cảnh phiên nấu hiện tại: món đang được ưu tiên hiện tại là "${activeItem.recipeName}" (recipeId: ${activeItem.recipeId}).`,
    "Nếu người dùng không chỉ rõ món khác hoặc không yêu cầu so sánh toàn bộ bữa, hãy mặc định trả lời theo món đang ưu tiên này trước.",
    `Yêu cầu của người dùng: ${message}`,
  ].join("\n");
}

function normalizePendingPrimarySwitch(raw: any, payload: UpdateMealStatusOptions): PendingPrimarySwitch | null {
  if (!raw || typeof raw !== "object") return null;

  const closedRecipeId = Number(raw.closedRecipeId ?? payload.recipeId);
  if (!Number.isFinite(closedRecipeId) || closedRecipeId <= 0) return null;

  const candidateNextPrimaryRecipeIds = Array.isArray(raw.candidateNextPrimaryRecipeIds)
    ? raw.candidateNextPrimaryRecipeIds
        .map((value: unknown) => Number(value))
        .filter((value: number) => Number.isFinite(value) && value > 0)
    : [];

  return {
    reason: typeof raw.reason === "string" ? raw.reason : undefined,
    closedRecipeId,
    closedRecipeStatus: normalizeMealStatus(raw.closedRecipeStatus ?? payload.status),
    currentPrimaryRecipeId: toNullableNumber(raw.currentPrimaryRecipeId),
    candidateNextPrimaryRecipeIds,
    suggestedNextPrimaryRecipeId: toNullableNumber(raw.suggestedNextPrimaryRecipeId),
    confirmField: typeof raw.confirmField === "string" && raw.confirmField.trim() ? raw.confirmField : "confirmSwitchPrimary",
    chooseField: typeof raw.chooseField === "string" && raw.chooseField.trim() ? raw.chooseField : "nextPrimaryRecipeId",
    pendingStatusPayload: {
      recipeId: payload.recipeId,
      status: payload.status,
      note: payload.note ?? null,
    },
  };
}

function messageKey(message: ChatMessage): string {
  if (message.chatMessageId) return `id:${message.chatSessionId ?? "none"}:${message.chatMessageId}`;
  if (message.tempId) return `temp:${message.tempId}`;
  return `sig:${message.chatSessionId ?? "none"}:${message.role}:${message.content}:${message.createdAt}`;
}

function mergeAndSortTimeline(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const map = new Map<string, ChatMessage>();
  [...current, ...incoming].forEach((message) => {
    const key = messageKey(message);
    const previous = map.get(key);
    map.set(key, previous ? { ...previous, ...message } : message);
  });

  return Array.from(map.values()).sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    if (timeA !== timeB) return timeA - timeB;

    const idA = a.chatMessageId ?? Number.MAX_SAFE_INTEGER;
    const idB = b.chatMessageId ?? Number.MAX_SAFE_INTEGER;
    if (idA !== idB) return idA - idB;

    const sessionA = a.chatSessionId ?? Number.MAX_SAFE_INTEGER;
    const sessionB = b.chatSessionId ?? Number.MAX_SAFE_INTEGER;
    return sessionA - sessionB;
  });
}

function findPrimarySession(payload: any): ChatSession | null {
  const data = extractData(payload);
  return normalizeSession(data?.session) ?? normalizeSession(data?.latestSession) ?? normalizeSession(data);
}

function findPaging(payload: any, fallbackLimit: number): ChatPaging {
  const data = extractData(payload);
  return normalizePaging(data?.paging, fallbackLimit);
}

function hasAiBusyCode(error: any): boolean {
  return error?.response?.status === 503 && error?.response?.data?.code === "AI_SERVER_BUSY";
}

function hasPendingSwitchCode(payload: any): boolean {
  return payload?.code === "PENDING_PRIMARY_RECIPE_SWITCH_CONFIRMATION" || payload?.data?.code === "PENDING_PRIMARY_RECIPE_SWITCH_CONFIRMATION";
}

function mealSnapshotKey(userId: number, sessionId: number): string {
  return `${MEAL_SNAPSHOT_KEY_PREFIX}:${userId}:${sessionId}`;
}

function latestMealSnapshotKey(userId: number): string {
  return `${LATEST_MEAL_SNAPSHOT_KEY_PREFIX}:${userId}`;
}

function persistMealSnapshot(userId: number, snapshot: MealSnapshot) {
  if (typeof window === "undefined") return;
  const sessionId = snapshot.mealSession.chatSessionId;
  if (!sessionId || sessionId <= 0) return;
  localStorage.setItem(mealSnapshotKey(userId, sessionId), JSON.stringify(snapshot));
  localStorage.setItem(latestMealSnapshotKey(userId), String(sessionId));
}

function readMealSnapshot(userId: number, sessionId: number): MealSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(mealSnapshotKey(userId, sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const mealItems = normalizeMealItems(parsed?.mealItems);
    const mealSessionRaw = parsed?.mealSession ?? {};
    const mealSession: MealSessionState = {
      chatSessionId: Number(mealSessionRaw.chatSessionId) || sessionId,
      activeRecipeId: toNullableNumber(mealSessionRaw.activeRecipeId),
      needsSelection:
        mealSessionRaw.needsSelection !== undefined
          ? Boolean(mealSessionRaw.needsSelection)
          : deriveNeedsSelection(mealItems, toNullableNumber(mealSessionRaw.activeRecipeId)),
      uiClosed: Boolean(mealSessionRaw.uiClosed),
    };
    return { mealSession, mealItems };
  } catch {
    return null;
  }
}

function readLatestMealSnapshotForUser(userId: number): MealSnapshot | null {
  if (typeof window === "undefined") return null;
  const sessionId = getPositiveNumberFromStorage(latestMealSnapshotKey(userId));
  if (!sessionId) return null;
  return readMealSnapshot(userId, sessionId);
}

function clearMealSnapshot(userId: number, sessionId: number) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(mealSnapshotKey(userId, sessionId));
  const latestSessionId = getPositiveNumberFromStorage(latestMealSnapshotKey(userId));
  if (latestSessionId === sessionId) {
    localStorage.removeItem(latestMealSnapshotKey(userId));
  }
}

function buildMealContext(options: {
  payload?: any;
  userId: number | null;
  state: ChatUiState;
  fallbackSession?: ChatSession | null;
  fallbackMealItems?: MealItem[];
  fallbackActiveRecipeId?: number | null;
  uiClosedOverride?: boolean;
}) {
  const data = extractData(options.payload);
  const session = findPrimarySession(options.payload) ?? options.fallbackSession ?? null;
  const storedSnapshot =
    options.userId && session?.chatSessionId
      ? readMealSnapshot(options.userId, session.chatSessionId)
      : null;
  const isCurrentSession = Boolean(
    session?.chatSessionId && options.state.mealSession.chatSessionId === session.chatSessionId,
  );
  const payloadMealItems = Array.isArray(data?.meal?.items) ? normalizeMealItems(data.meal.items) : null;
  const mealItems =
    payloadMealItems ??
    options.fallbackMealItems ??
    (isCurrentSession ? options.state.mealItems : storedSnapshot?.mealItems ?? []);
  const focus = data?.focus;
  const payloadActiveRecipeId = focus?.activeRecipeId !== undefined ? toNullableNumber(focus.activeRecipeId) : undefined;
  const activeRecipeId =
    payloadActiveRecipeId !== undefined
      ? payloadActiveRecipeId
      : options.fallbackActiveRecipeId !== undefined
        ? options.fallbackActiveRecipeId
      : session?.activeRecipeId ?? (isCurrentSession ? options.state.mealSession.activeRecipeId : storedSnapshot?.mealSession.activeRecipeId ?? null);
  const needsSelection =
    focus?.needsSelection !== undefined ? Boolean(focus.needsSelection) : deriveNeedsSelection(mealItems, activeRecipeId);
  const mealSession: MealSessionState = {
    chatSessionId: session?.chatSessionId ?? (isCurrentSession ? options.state.mealSession.chatSessionId : storedSnapshot?.mealSession.chatSessionId ?? null),
    activeRecipeId,
    needsSelection,
    uiClosed: options.uiClosedOverride ?? (isCurrentSession ? options.state.mealSession.uiClosed : storedSnapshot?.mealSession.uiClosed ?? false),
  };

  return {
    session: session ? { ...session, activeRecipeId: mealSession.activeRecipeId } : null,
    mealSession,
    mealItems,
  };
}

function buildLocalCompletionMessage(completionType: MealCompletionType, chatSessionId?: number | null): ChatMessage {
  return {
    tempId: `local-complete-${Date.now()}`,
    role: "assistant",
    content:
      completionType === "abandoned"
        ? "Đã đóng phiên nấu hiện tại. Khi cần, mình có thể giúp bạn bắt đầu một bữa mới."
        : "Đã hoàn thành phiên nấu cho bữa này. Khi cần, mình có thể giúp bạn bắt đầu kế hoạch bữa mới ngay.",
    createdAt: new Date().toISOString(),
    chatSessionId: chatSessionId ?? undefined,
  };
}

export function ChatFlowProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const stateRef = useRef(state);
  const committedMealRef = useRef<MealSnapshot>({
    mealSession: initialMealSession,
    mealItems: [],
  });
  const mealMutationQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const mergeState = useCallback((payload: Partial<ChatUiState>) => {
    dispatch({ type: "MERGE", payload });
  }, []);

  const getUserId = useCallback(() => getUserIdFromStorage(), []);

  const persistLastSession = useCallback(
    (sessionId: number | null, userIdParam?: number | null) => {
      const userId = userIdParam ?? getUserId();
      if (!userId || !sessionId || sessionId <= 0) {
        clearStoredLastChatSession();
        return;
      }
      persistStoredLastChatSession(userId, sessionId);
    },
    [getUserId],
  );

  const commitMealSnapshot = useCallback(
    (mealSession: MealSessionState, mealItems: MealItem[], userIdParam?: number | null) => {
      committedMealRef.current = {
        mealSession,
        mealItems,
      };

      const userId = userIdParam ?? getUserId();
      if (!userId || !mealSession.chatSessionId) return;
      persistMealSnapshot(userId, {
        mealSession,
        mealItems,
      });
    },
    [getUserId],
  );

  const setError = useCallback(
    (message: string) => {
      mergeState({ errorMessage: message });
      toast.error(message);
    },
    [mergeState],
  );

  const clearChatError = useCallback(() => {
    mergeState({ errorMessage: null });
  }, [mergeState]);

  const clearPendingPrimarySwitch = useCallback(() => {
    mergeState({ pendingPrimarySwitch: null });
  }, [mergeState]);

  const refreshRecommendations = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;

    try {
      const [res, trendingRes] = await Promise.all([
        chatService.getRecommendations(12),
        recipeService.getTrendingV2({
          page: 1,
          limit: 12,
          period: "all",
        }),
      ]);
      const data = extractData(res) || {};
      const trendingItems = Array.isArray(trendingRes?.data?.items) ? trendingRes.data.items : [];
      mergeState({
        recommendations: normalizeRecommendations(data.recommendations),
        readyToCook: normalizeRecommendations(data.readyToCook),
        almostReady: normalizeRecommendations(data.almostReady),
        unavailable: normalizeTrendingRecipes(trendingItems),
      });
    } catch {
      setError("Không thể tải danh sách món gợi ý");
    }
  }, [getUserId, mergeState, setError]);

  const refreshDietNotes = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;

    try {
      const res = await dietNoteService.getNotes();
      mergeState({ dietNotes: normalizeDietNotes(res?.data) });
    } catch {
      setError("Không thể tải ghi chú ăn uống");
    }
  }, [getUserId, mergeState, setError]);

  const refreshHomeContext = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;

    try {
      const [dietRes, pantryRes, recommendationRes, trendingRes] = await Promise.all([
        dietNoteService.getNotes(),
        pantryService.getMine(),
        chatService.getRecommendations(12),
        recipeService.getTrendingV2({
          page: 1,
          limit: 12,
          period: "all",
        }),
      ]);

      const recommendationData = extractData(recommendationRes) || {};
      const trendingItems = Array.isArray(trendingRes?.data?.items) ? trendingRes.data.items : [];
      mergeState({
        dietNotes: normalizeDietNotes(dietRes?.data),
        pantryItems: normalizePantryItems(pantryRes?.data),
        recommendations: normalizeRecommendations(recommendationData.recommendations),
        readyToCook: normalizeRecommendations(recommendationData.readyToCook),
        almostReady: normalizeRecommendations(recommendationData.almostReady),
        unavailable: normalizeTrendingRecipes(trendingItems),
      });
    } catch {
      setError("Không thể đồng bộ dữ liệu nền cho chat");
    }
  }, [getUserId, mergeState, setError]);

  const loadSessions = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;

    mergeState({ loadingSessions: true });

    try {
      const res = await chatService.listSessions(1, 50);
      const data = extractData(res);
      const rawItems = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      const sessions = rawItems
        .map((item: any) => normalizeSession(item))
        .filter((item: ChatSession | null): item is ChatSession => Boolean(item));

      mergeState({ sessions });
    } catch {
      setError("Không thể tải danh sách hội thoại");
    } finally {
      mergeState({ loadingSessions: false });
    }
  }, [getUserId, mergeState, setError]);

  const hydrateMealFromSession = useCallback(
    (session: ChatSession | null, userIdParam?: number | null) => {
      const userId = userIdParam ?? getUserId();
      const nextContext = buildMealContext({
        userId,
        state: stateRef.current,
        fallbackSession: session,
      });

      mergeState({
        mealSession: nextContext.mealSession,
        mealItems: nextContext.mealItems,
        currentSession: nextContext.session ?? stateRef.current.currentSession,
      });
      commitMealSnapshot(nextContext.mealSession, nextContext.mealItems, userId);
    },
    [commitMealSnapshot, getUserId, mergeState],
  );

  const tryRestoreLastSession = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return false;

    const storedSessionId = getStoredLastChatSessionForUser(userId);
    if (!storedSessionId) return false;

    mergeState({
      loadingTimeline: true,
      errorMessage: null,
      lastRequestedBeforeMessageId: null,
    });

    try {
      const res = await chatService.getSessionHistory(storedSessionId);
      const data = extractData(res);
      const timeline = mergeAndSortTimeline([], normalizeMessages(data?.messages));
      const oldestLoadedMessageId =
        timeline.find((message) => Number.isFinite(message.chatMessageId) && Number(message.chatMessageId) > 0)?.chatMessageId ?? null;

      if (!timeline.length) {
        persistLastSession(null, userId);
        return false;
      }

      const restoredSession =
        normalizeSession(data?.session) ??
        stateRef.current.sessions.find((item) => item.chatSessionId === storedSessionId) ??
        null;

      mergeState({
        currentSessionId: restoredSession?.chatSessionId ?? storedSessionId,
        currentSession: restoredSession,
        timeline,
        hasMore: Boolean(oldestLoadedMessageId),
        nextBeforeMessageId: oldestLoadedMessageId,
        noProgressLoadCount: 0,
      });
      hydrateMealFromSession(restoredSession, userId);
      persistLastSession(restoredSession?.chatSessionId ?? storedSessionId, userId);
      return true;
    } catch {
      persistLastSession(null, userId);
      return false;
    } finally {
      mergeState({ loadingTimeline: false });
    }
  }, [getUserId, hydrateMealFromSession, mergeState, persistLastSession]);

  const fetchUnifiedTimeline = useCallback(
    async (beforeMessageId?: number) => {
      const userId = getUserId();
      if (!userId) return;

      const current = stateRef.current;
      const limit = current.limit || DEFAULT_LIMIT;

      mergeState({
        loadingTimeline: true,
        errorMessage: null,
        lastRequestedBeforeMessageId: beforeMessageId ?? null,
      });

      try {
        const res = await chatService.getUnifiedTimeline({
          limit,
          beforeMessageId,
        });

        const data = extractData(res);
        const incomingMessages = normalizeMessages(data);
        const session = findPrimarySession(res);
        const paging = findPaging(res, limit);
        const baseTimeline = beforeMessageId ? current.timeline : [];
        const mergedTimeline = mergeAndSortTimeline(baseTimeline, incomingMessages);
        const hasProgress = mergedTimeline.length > baseTimeline.length;
        const nextNoProgress = beforeMessageId ? (hasProgress ? 0 : current.noProgressLoadCount + 1) : 0;
        const shouldStopPaging = nextNoProgress >= MAX_NO_PROGRESS_ATTEMPTS;

        const inferredSession = normalizeSession(
          data?.items?.length
            ? {
                chatSessionId: data.items[data.items.length - 1].chatSessionId,
                title: data.items[data.items.length - 1].sessionTitle,
                activeRecipeId: data.items[data.items.length - 1].activeRecipeId,
              }
            : null,
        );

        const nextCurrentSession = beforeMessageId
          ? session ?? current.currentSession ?? inferredSession
          : session ?? inferredSession ?? null;

        mergeState({
          timeline: mergedTimeline,
          currentSessionId: nextCurrentSession?.chatSessionId ?? (beforeMessageId ? current.currentSessionId : null),
          currentSession: nextCurrentSession,
          hasMore: shouldStopPaging ? false : paging.hasMore,
          nextBeforeMessageId: shouldStopPaging ? null : paging.nextBeforeMessageId,
          noProgressLoadCount: nextNoProgress,
        });

        if (!beforeMessageId) {
          persistLastSession(nextCurrentSession?.chatSessionId ?? null, userId);
          hydrateMealFromSession(nextCurrentSession, userId);
        }
      } catch {
        setError("Không thể tải timeline hội thoại");
      } finally {
        mergeState({ loadingTimeline: false });
      }
    },
    [getUserId, hydrateMealFromSession, mergeState, persistLastSession, setError],
  );

  const bootstrapUnifiedTimeline = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;

    await refreshHomeContext();
    await loadSessions();

    const restored = await tryRestoreLastSession();
    const restoredSessionId = restored ? stateRef.current.currentSessionId : null;
    const restoredSession = restored ? stateRef.current.currentSession : null;
    await fetchUnifiedTimeline();

    if (restored && restoredSessionId) {
      const preservedSession =
        stateRef.current.sessions.find((item) => item.chatSessionId === restoredSessionId) ?? restoredSession ?? null;

      mergeState({
        currentSessionId: restoredSessionId,
        currentSession: preservedSession,
      });
      hydrateMealFromSession(preservedSession, userId);
      persistLastSession(restoredSessionId, userId);
    }
  }, [fetchUnifiedTimeline, getUserId, loadSessions, refreshHomeContext, tryRestoreLastSession]);

  const enqueueMealMutation = useCallback(async <T,>(runner: () => Promise<T>): Promise<T> => {
    const task = mealMutationQueueRef.current.then(runner);
    mealMutationQueueRef.current = task.then(() => undefined, () => undefined);
    return task;
  }, []);

  const syncMealSelection = useCallback(
    async (items: MealItem[]) => {
      const userId = getUserId();
      if (!userId) {
        setError("Vui lòng đăng nhập để cập nhật món cho phiên chat");
        return false;
      }

      const current = stateRef.current;
      const shouldStartFreshSession = current.mealSession.uiClosed;

      const normalizedItems = sortMealItems(items);
      const optimisticActiveRecipeId =
        current.mealSession.activeRecipeId && normalizedItems.some((item) => item.recipeId === current.mealSession.activeRecipeId)
          ? current.mealSession.activeRecipeId
          : normalizedItems.length === 1
            ? normalizedItems[0].recipeId
            : null;
      const optimisticMealSession: MealSessionState = {
        chatSessionId: shouldStartFreshSession ? null : current.mealSession.chatSessionId,
        activeRecipeId: optimisticActiveRecipeId,
        needsSelection: deriveNeedsSelection(normalizedItems, optimisticActiveRecipeId),
        uiClosed: false,
      };
      const fallbackSession = !shouldStartFreshSession && current.currentSession
        ? {
            ...current.currentSession,
            activeRecipeId: optimisticMealSession.activeRecipeId,
          }
        : null;

      mergeState({
        mealItems: normalizedItems,
        mealSession: optimisticMealSession,
        currentSession: fallbackSession,
        pendingPrimarySwitch: null,
      });

      const rollback = committedMealRef.current;

      try {
        mergeState({ mealSyncing: true });

        await enqueueMealMutation(async () => {
          const latest = stateRef.current;
          const latestSessionId = latest.mealSession.chatSessionId;
          const latestActiveRecipeId =
            latest.mealSession.activeRecipeId && normalizedItems.some((item) => item.recipeId === latest.mealSession.activeRecipeId)
              ? latest.mealSession.activeRecipeId
              : normalizedItems.length === 1
                ? normalizedItems[0].recipeId
                : null;
          const latestFallbackSession = latest.currentSession
            ? {
                ...latest.currentSession,
                activeRecipeId: latestActiveRecipeId,
              }
            : null;
          let response: any;
          let nextTimeline = stateRef.current.timeline;
          if (!latestSessionId && normalizedItems.length > 0) {
            response = await chatService.createMealSession({
              title: current.currentSession?.title || latest.currentSession?.title || "Bepes",
              recipeIds: normalizedItems.map((item) => item.recipeId),
            });
          } else if (latestSessionId) {
            response = await chatService.replaceMealRecipes({
              chatSessionId: latestSessionId,
              recipes: normalizedItems.map((item) => ({
                recipeId: item.recipeId,
                sortOrder: item.sortOrder,
                status: item.status,
                note: item.note ?? null,
                servingsOverride: item.servingsOverride ?? null,
              })),
            });
          } else {
            commitMealSnapshot(initialMealSession, [], userId);
            return;
          }

          const nextContext = buildMealContext({
            payload: response,
            userId,
            state: stateRef.current,
            fallbackSession: latestFallbackSession ?? fallbackSession,
            fallbackMealItems: normalizedItems,
            fallbackActiveRecipeId: latestActiveRecipeId,
          });

          const responseData = extractData(response);
          const responseMessages = normalizeMessages(responseData);
          const assistantMessage =
            typeof responseData?.assistantMessage === "string" && responseData.assistantMessage.trim()
              ? normalizeMessage({
                  role: "assistant",
                  content: responseData.assistantMessage.trim(),
                  createdAt: new Date().toISOString(),
                  chatSessionId: nextContext.session?.chatSessionId ?? stateRef.current.currentSessionId,
                })
              : null;
          const mergedResponseMessages = assistantMessage ? [...responseMessages, assistantMessage] : responseMessages;

          const targetSessionId = nextContext.session?.chatSessionId ?? null;
          if (!latestSessionId && targetSessionId) {
            try {
              const timelineResponse = await chatService.getUnifiedTimeline({
                limit: SESSION_CREATE_TIMELINE_LIMIT,
              });
              const timelineData = extractData(timelineResponse);
              const createdSessionMessages = normalizeMessages(timelineData).filter(
                (message) => message.chatSessionId === targetSessionId,
              );
              const introMessages = createdSessionMessages.filter(
                (message) => message.role === "assistant" && Boolean(message.meta && "intro" in message.meta && message.meta.intro),
              );
              const preferredSessionMessages = introMessages.length ? introMessages : createdSessionMessages;

              if (preferredSessionMessages.length) {
                nextTimeline = mergeAndSortTimeline(stateRef.current.timeline, preferredSessionMessages);
              }
            } catch {
              // Do not fail the create flow if the welcome timeline fetch is unavailable.
            }
          }

          if (mergedResponseMessages.length) {
            nextTimeline = mergeAndSortTimeline(nextTimeline, mergedResponseMessages);
          }

          if (targetSessionId) {
            try {
              const refreshedTimelineResponse = await chatService.getUnifiedTimeline({
                limit: SESSION_CREATE_TIMELINE_LIMIT,
              });
              const refreshedTimelineData = extractData(refreshedTimelineResponse);
              const refreshedSessionMessages = normalizeMessages(refreshedTimelineData).filter(
                (message) => message.chatSessionId === targetSessionId,
              );

              if (refreshedSessionMessages.length) {
                nextTimeline = mergeAndSortTimeline(nextTimeline, refreshedSessionMessages);
              }
            } catch {
              // Ignore timeline refresh failures after meal updates.
            }
          }

          mergeState({
            timeline: nextTimeline,
            currentSessionId: nextContext.session?.chatSessionId ?? stateRef.current.currentSessionId,
            currentSession: nextContext.session ?? stateRef.current.currentSession,
            mealSession: nextContext.mealSession,
            mealItems: nextContext.mealItems,
            pendingPrimarySwitch: null,
          });

          commitMealSnapshot(nextContext.mealSession, nextContext.mealItems, userId);

          if (nextContext.session?.chatSessionId) {
            persistLastSession(nextContext.session.chatSessionId, userId);
          }
        });

        return true;
      } catch {
        mergeState({
          mealSession: rollback.mealSession,
          mealItems: rollback.mealItems,
          currentSession: stateRef.current.currentSession
            ? {
                ...stateRef.current.currentSession,
                activeRecipeId: rollback.mealSession.activeRecipeId,
              }
            : stateRef.current.currentSession,
        });
        setError("Không thể cập nhật danh sách món trong phiên chat");
        return false;
      } finally {
        mergeState({ mealSyncing: false });
      }
    },
    [commitMealSnapshot, enqueueMealMutation, getUserId, mergeState, persistLastSession, setError],
  );

  const setPrimaryRecipe = useCallback(
    async (recipeId: number | null) => {
      const userId = getUserId();
      if (!userId) {
        setError("Vui lòng đăng nhập để chọn món ưu tiên");
        return false;
      }

      const current = stateRef.current;
      if (current.mealSession.uiClosed) {
        setError("Phiên nấu hiện tại đã hoàn tất và không thể chỉnh sửa");
        return false;
      }

      if (!current.mealItems.length) {
        setError("Chưa có món nào trong phiên chat");
        return false;
      }

      let sessionId = current.mealSession.chatSessionId;
      let fallbackSession = current.currentSession;

      const optimisticMealSession: MealSessionState = {
        chatSessionId: sessionId,
        activeRecipeId: recipeId,
        needsSelection: deriveNeedsSelection(current.mealItems, recipeId),
        uiClosed: false,
      };
      const rollback = committedMealRef.current;

      mergeState({
        mealSession: optimisticMealSession,
        currentSession: fallbackSession
          ? {
              ...fallbackSession,
              activeRecipeId: recipeId,
            }
          : fallbackSession,
        pendingPrimarySwitch: null,
      });

      try {
        mergeState({ mealSyncing: true });

        await enqueueMealMutation(async () => {
          if (!sessionId) {
            const createRes = await chatService.createMealSession({
              title: fallbackSession?.title || "Bepes",
              recipeIds: current.mealItems.map((item) => item.recipeId),
            });
            const createdContext = buildMealContext({
              payload: createRes,
              userId,
              state: stateRef.current,
              fallbackSession,
              fallbackMealItems: current.mealItems,
              fallbackActiveRecipeId: stateRef.current.mealSession.activeRecipeId,
            });
            sessionId = createdContext.mealSession.chatSessionId;
            fallbackSession = createdContext.session;
            mergeState({
              currentSessionId: createdContext.session?.chatSessionId ?? stateRef.current.currentSessionId,
              currentSession: createdContext.session ?? stateRef.current.currentSession,
              mealSession: createdContext.mealSession,
              mealItems: createdContext.mealItems,
            });
            commitMealSnapshot(createdContext.mealSession, createdContext.mealItems, userId);
          }

          if (!sessionId) {
            throw new Error("NO_MEAL_SESSION");
          }

          const response = await chatService.setPrimaryRecipe({
            chatSessionId: sessionId,
            recipeId,
          });

          const nextContext = buildMealContext({
            payload: response,
            userId,
            state: stateRef.current,
            fallbackSession,
            fallbackMealItems: current.mealItems,
            fallbackActiveRecipeId: recipeId,
          });

          mergeState({
            currentSessionId: nextContext.session?.chatSessionId ?? stateRef.current.currentSessionId,
            currentSession: nextContext.session ?? stateRef.current.currentSession,
            mealSession: nextContext.mealSession,
            mealItems: nextContext.mealItems,
            pendingPrimarySwitch: null,
          });

          commitMealSnapshot(nextContext.mealSession, nextContext.mealItems, userId);

          if (nextContext.session?.chatSessionId) {
            persistLastSession(nextContext.session.chatSessionId, userId);
          }
        });

        return true;
      } catch {
        mergeState({
          mealSession: rollback.mealSession,
          mealItems: rollback.mealItems,
          currentSession: stateRef.current.currentSession
            ? {
                ...stateRef.current.currentSession,
                activeRecipeId: rollback.mealSession.activeRecipeId,
              }
            : stateRef.current.currentSession,
        });
        setError("Không thể cập nhật món ưu tiên cho phiên chat");
        return false;
      } finally {
        mergeState({ mealSyncing: false });
      }
    },
    [commitMealSnapshot, enqueueMealMutation, getUserId, mergeState, persistLastSession, setError],
  );

  const updateMealRecipeStatus = useCallback(
    async (payload: UpdateMealStatusOptions) => {
      const userId = getUserId();
      const current = stateRef.current;
      const sessionId = current.mealSession.chatSessionId;

      if (!userId || !sessionId) {
        setError("Chưa có phiên nấu để cập nhật trạng thái món");
        return false;
      }

      if (current.mealSession.uiClosed) {
        setError("Phiên nấu hiện tại đã hoàn tất và không thể chỉnh sửa");
        return false;
      }

      const rollback = committedMealRef.current;
      const optimisticMealItems = sortMealItems(
        current.mealItems.map((item) =>
          item.recipeId === payload.recipeId
            ? {
                ...item,
                status: payload.status,
                note: payload.note ?? item.note ?? null,
              }
            : item,
        ),
      );

      mergeState({
        mealItems: optimisticMealItems,
        pendingPrimarySwitch: null,
      });

      try {
        mergeState({ mealSyncing: true });

        const response = await enqueueMealMutation(async () =>
          chatService.updateMealRecipeStatus({
            chatSessionId: sessionId,
            recipeId: payload.recipeId,
            status: payload.status,
            note: payload.note ?? null,
          }),
        );

        if (hasPendingSwitchCode(response)) {
          const data = extractData(response);
          const pendingPrimarySwitch = normalizePendingPrimarySwitch(data?.pendingSwitch, payload);
          mergeState({
            mealSession: rollback.mealSession,
            mealItems: rollback.mealItems,
            currentSession: stateRef.current.currentSession
              ? {
                  ...stateRef.current.currentSession,
                  activeRecipeId: rollback.mealSession.activeRecipeId,
                }
              : stateRef.current.currentSession,
            pendingPrimarySwitch,
          });
          return Boolean(pendingPrimarySwitch);
        }

        const nextContext = buildMealContext({
          payload: response,
          userId,
          state: stateRef.current,
          fallbackSession: stateRef.current.currentSession,
          fallbackMealItems: optimisticMealItems,
          fallbackActiveRecipeId: stateRef.current.mealSession.activeRecipeId,
        });

        mergeState({
          currentSessionId: nextContext.session?.chatSessionId ?? stateRef.current.currentSessionId,
          currentSession: nextContext.session ?? stateRef.current.currentSession,
          mealSession: nextContext.mealSession,
          mealItems: nextContext.mealItems,
          pendingPrimarySwitch: null,
        });
        commitMealSnapshot(nextContext.mealSession, nextContext.mealItems, userId);
        return true;
      } catch {
        mergeState({
          mealSession: rollback.mealSession,
          mealItems: rollback.mealItems,
          currentSession: stateRef.current.currentSession
            ? {
                ...stateRef.current.currentSession,
                activeRecipeId: rollback.mealSession.activeRecipeId,
              }
            : stateRef.current.currentSession,
        });
        setError("Không thể cập nhật trạng thái món ăn");
        return false;
      } finally {
        mergeState({ mealSyncing: false });
      }
    },
    [commitMealSnapshot, enqueueMealMutation, getUserId, mergeState, setError],
  );

  const confirmPendingPrimarySwitch = useCallback(
    async (nextPrimaryRecipeId: number) => {
      const userId = getUserId();
      const current = stateRef.current;
      const sessionId = current.mealSession.chatSessionId;
      const pending = current.pendingPrimarySwitch;

      if (!userId || !sessionId || !pending) return false;

      try {
        mergeState({ mealSyncing: true });
        const dynamicPayload: Record<string, unknown> = {
          [pending.confirmField]: true,
          [pending.chooseField]: nextPrimaryRecipeId,
        };

        const response = await enqueueMealMutation(async () =>
          chatService.updateMealRecipeStatus({
            chatSessionId: sessionId,
            recipeId: pending.pendingStatusPayload.recipeId,
            status: pending.pendingStatusPayload.status,
            note: pending.pendingStatusPayload.note ?? null,
            ...dynamicPayload,
          }),
        );

        const nextContext = buildMealContext({
          payload: response,
          userId,
          state: stateRef.current,
          fallbackSession: stateRef.current.currentSession,
          fallbackMealItems: stateRef.current.mealItems,
          fallbackActiveRecipeId: nextPrimaryRecipeId,
        });

        mergeState({
          currentSessionId: nextContext.session?.chatSessionId ?? stateRef.current.currentSessionId,
          currentSession: nextContext.session ?? stateRef.current.currentSession,
          mealSession: nextContext.mealSession,
          mealItems: nextContext.mealItems,
          pendingPrimarySwitch: null,
        });
        commitMealSnapshot(nextContext.mealSession, nextContext.mealItems, userId);
        return true;
      } catch {
        setError("Không thể xác nhận món ưu tiên tiếp theo");
        return false;
      } finally {
        mergeState({ mealSyncing: false });
      }
    },
    [commitMealSnapshot, enqueueMealMutation, getUserId, mergeState, setError],
  );

  const sendMessage = useCallback(
    async (message: string, options: SendMessageOptions = {}) => {
      const userId = getUserId();
      if (!userId) {
        setError("Vui lòng đăng nhập để chat với Bepes");
        return;
      }

      const current = stateRef.current;
      const cleanedMessage = message.trim();
      if (!cleanedMessage || current.sending) return;
      const outboundMessage = buildFocusedMessage(cleanedMessage, current.mealSession, current.mealItems);

      if (current.mealSession.uiClosed) {
        setError("Phiên nấu hiện tại đã hoàn tất. Hãy chọn món mới để bắt đầu tiếp.");
        return;
      }

      const optimisticTempId = options.reuseTempId ?? `temp-${Date.now()}`;
      const optimisticMessage: ChatMessage = {
        tempId: optimisticTempId,
        role: "user",
        content: cleanedMessage,
        createdAt: new Date().toISOString(),
        chatSessionId: current.mealSession.chatSessionId ?? current.currentSessionId ?? undefined,
        isPending: true,
        isFailed: false,
        retryable: false,
        retryAvailableAt: null,
        failedReason: null,
      };

      const nextTimeline = options.reuseTempId
        ? current.timeline.map((item) => (item.tempId === optimisticTempId ? { ...item, ...optimisticMessage } : item))
        : mergeAndSortTimeline(current.timeline, [optimisticMessage]);

      mergeState({
        timeline: nextTimeline,
        sending: true,
        errorMessage: null,
      });

      try {
        const responsePayload = await chatService.sendV2Message({
          chatSessionId: current.mealSession.chatSessionId ?? undefined,
          message: outboundMessage,
          useUnifiedSession: current.mealSession.chatSessionId ? undefined : true,
        });

        const responseData = extractData(responsePayload);
        const responseMessages = normalizeMessages(responseData);
        const responseSession = findPrimarySession(responsePayload) ?? stateRef.current.currentSession;
        const assistantMessage =
          typeof responseData?.assistantMessage === "string" && responseData.assistantMessage.trim()
            ? normalizeMessage({
                role: "assistant",
                content: responseData.assistantMessage.trim(),
                createdAt: new Date().toISOString(),
                chatSessionId: responseSession?.chatSessionId ?? stateRef.current.currentSessionId,
              })
            : null;

        const mergedResponseMessages = assistantMessage ? [...responseMessages, assistantMessage] : responseMessages;

        let timeline = stateRef.current.timeline.map((item) =>
          item.tempId === optimisticTempId
            ? {
                ...item,
                isPending: false,
                isFailed: false,
                retryable: false,
                retryAvailableAt: null,
                failedReason: null,
              }
            : item,
        );
        timeline = mergeAndSortTimeline(timeline, mergedResponseMessages);

        if (
          mergedResponseMessages.some(
            (item) =>
              item.role === "user" &&
              (item.content.trim() === cleanedMessage || item.content.trim() === outboundMessage),
          )
        ) {
          timeline = timeline.filter((item) => item.tempId !== optimisticTempId);
        }

        const nextContext = buildMealContext({
          payload: responsePayload,
          userId,
          state: stateRef.current,
          fallbackSession: responseSession,
          fallbackMealItems: stateRef.current.mealItems,
          fallbackActiveRecipeId: responseSession?.activeRecipeId ?? stateRef.current.mealSession.activeRecipeId,
        });
        const previousActiveRecipeId = stateRef.current.mealSession.activeRecipeId;
        const shouldPreserveActiveRecipe =
          previousActiveRecipeId &&
          !nextContext.mealSession.activeRecipeId &&
          nextContext.mealItems.some((item) => item.recipeId === previousActiveRecipeId);
        const resolvedMealSession = shouldPreserveActiveRecipe
          ? {
              ...nextContext.mealSession,
              activeRecipeId: previousActiveRecipeId,
              needsSelection: deriveNeedsSelection(nextContext.mealItems, previousActiveRecipeId),
            }
          : nextContext.mealSession;
        const resolvedSession = shouldPreserveActiveRecipe
          ? nextContext.session
            ? {
                ...nextContext.session,
                activeRecipeId: previousActiveRecipeId,
              }
            : nextContext.session
          : nextContext.session;

        mergeState({
          timeline,
          currentSessionId: resolvedSession?.chatSessionId ?? stateRef.current.currentSessionId,
          currentSession: resolvedSession ?? stateRef.current.currentSession,
          mealSession: resolvedMealSession,
          mealItems: nextContext.mealItems,
          pendingPrimarySwitch: null,
        });
        commitMealSnapshot(resolvedMealSession, nextContext.mealItems, userId);

        if (resolvedSession?.chatSessionId) {
          persistLastSession(resolvedSession.chatSessionId, userId);
        }
      } catch (error: any) {
        if (hasAiBusyCode(error)) {
          const body = error?.response?.data;
          const data = extractData(body);
          const retryAfterMs = Math.max(Number(data?.retryAfterMs ?? 5000), 0);
          const retryable = data?.retryable === true;
          const failureMessage =
            data?.error?.message || body?.message || "AI đang bận, vui lòng thử lại sau ít phút";
          const failedContent = cleanedMessage;

          mergeState({
            timeline: stateRef.current.timeline.map((item) =>
              item.tempId === optimisticTempId
                ? {
                    ...item,
                    content: failedContent,
                    isPending: false,
                    isFailed: true,
                    retryable,
                    retryAfterMs,
                    retryAvailableAt: new Date(Date.now() + retryAfterMs).toISOString(),
                    failedReason: failureMessage,
                  }
                : item,
            ),
          });
          toast.error(failureMessage);
        } else {
          const failureMessage = error?.response?.data?.message || "Không thể gửi tin nhắn cho Bepes";
          mergeState({
            timeline: stateRef.current.timeline.map((item) =>
              item.tempId === optimisticTempId
                ? {
                    ...item,
                    isPending: false,
                    isFailed: true,
                    retryable: false,
                    retryAvailableAt: null,
                    failedReason: failureMessage,
                  }
                : item,
            ),
          });
          setError(failureMessage);
        }
      } finally {
        mergeState({ sending: false });
      }
    },
    [commitMealSnapshot, getUserId, mergeState, persistLastSession, setError],
  );

  const retryMessage = useCallback(
    async (tempId: string) => {
      const message = stateRef.current.timeline.find((item) => item.tempId === tempId);
      if (!message || !message.isFailed || !message.retryable) return;

      const retryAvailableAt = message.retryAvailableAt ? new Date(message.retryAvailableAt).getTime() : 0;
      const waitMs = retryAvailableAt - Date.now();
      if (waitMs > 0) {
        toast.error(`Vui lòng chờ ${Math.ceil(waitMs / 1000)} giây để gửi lại`);
        return;
      }

      await sendMessage(message.content, { reuseTempId: tempId });
    },
    [sendMessage],
  );

  const completeCurrentSession = useCallback(
    async (options: CompleteMealOptions = {}) => {
      const userId = getUserId();
      const current = stateRef.current;
      const chatSessionId = current.mealSession.chatSessionId;

      if (!userId || !chatSessionId) {
        setError("Chưa có phiên nấu để hoàn thành");
        return false;
      }

      if (current.mealSession.uiClosed) {
        return true;
      }

      try {
        mergeState({ mealSyncing: true });

        const payload: CompleteMealSessionPayload = {
          chatSessionId,
          completionType: options.completionType ?? "completed",
          note: options.note ?? null,
          markRemainingStatus: options.markRemainingStatus ?? (options.completionType === "abandoned" ? "skipped" : "done"),
        };

        const response = await enqueueMealMutation(async () => chatService.completeMealSession(payload));
        const responseData = extractData(response);
        const responseMessages = normalizeMessages(responseData);
        const responseSession = findPrimarySession(response) ?? stateRef.current.currentSession;
        const assistantMessage =
          typeof responseData?.assistantMessage === "string" && responseData.assistantMessage.trim()
            ? normalizeMessage({
                role: "assistant",
                content: responseData.assistantMessage.trim(),
                createdAt: new Date().toISOString(),
                chatSessionId: responseSession?.chatSessionId ?? stateRef.current.currentSessionId,
              })
            : null;
        const mergedCompletionMessages = assistantMessage ? [...responseMessages, assistantMessage] : responseMessages;
        const nextContext = buildMealContext({
          payload: response,
          userId,
          state: stateRef.current,
          fallbackSession: stateRef.current.currentSession,
          fallbackMealItems: stateRef.current.mealItems,
          fallbackActiveRecipeId: null,
          uiClosedOverride: true,
        });

        const hasAssistantResponse =
          mergedCompletionMessages.some((item) => item.role === "assistant") ||
          (typeof responseData?.assistantMessage === "string" && responseData.assistantMessage.trim());
        const timeline = hasAssistantResponse
          ? mergeAndSortTimeline(stateRef.current.timeline, mergedCompletionMessages)
          : mergeAndSortTimeline(stateRef.current.timeline, [
              buildLocalCompletionMessage(payload.completionType || "completed", chatSessionId),
            ]);

        mergeState({
          timeline,
          currentSessionId: nextContext.session?.chatSessionId ?? stateRef.current.currentSessionId,
          currentSession: nextContext.session
            ? {
                ...nextContext.session,
                activeRecipeId: null,
              }
            : stateRef.current.currentSession,
          mealSession: {
            ...nextContext.mealSession,
            activeRecipeId: null,
            needsSelection: false,
            uiClosed: true,
          },
          mealItems: [],
          pendingPrimarySwitch: null,
        });
        commitMealSnapshot(
          {
            ...nextContext.mealSession,
            activeRecipeId: null,
            needsSelection: false,
            uiClosed: true,
          },
          [],
          userId,
        );
        toast.success("Đã hoàn tất phiên nấu ăn");
        return true;
      } catch {
        setError("Không thể hoàn thành phiên hiện tại");
        return false;
      } finally {
        mergeState({ mealSyncing: false });
      }
    },
    [commitMealSnapshot, enqueueMealMutation, getUserId, mergeState, setError],
  );

  const loadOlderMessages = useCallback(async () => {
    const current = stateRef.current;

    if (
      current.loadingTimeline ||
      !current.hasMore ||
      !current.nextBeforeMessageId ||
      current.lastRequestedBeforeMessageId === current.nextBeforeMessageId
    ) {
      return;
    }

    await fetchUnifiedTimeline(current.nextBeforeMessageId);
  }, [fetchUnifiedTimeline]);

  const upsertDietNote = useCallback(
    async (payload: UpsertDietNotePayload) => {
      const userId = getUserId();
      if (!userId) return false;

      try {
        const res = await dietNoteService.upsertNote(payload);
        if (res?.success === false) return false;

        await refreshDietNotes();
        await refreshRecommendations();
        return true;
      } catch {
        setError("Không thể cập nhật ghi chú ăn uống");
        return false;
      }
    },
    [getUserId, refreshDietNotes, refreshRecommendations, setError],
  );

  const deleteDietNote = useCallback(
    async (noteId: number) => {
      const userId = getUserId();
      if (!userId) return false;

      try {
        const res = await dietNoteService.deleteNote(noteId);
        if (res?.success === false) return false;

        await refreshDietNotes();
        await refreshRecommendations();
        return true;
      } catch {
        setError("Không thể xóa ghi chú ăn uống");
        return false;
      }
    },
    [getUserId, refreshDietNotes, refreshRecommendations, setError],
  );

  useEffect(() => {
    const userId = getUserId();
    if (!userId) return;

    const currentSessionId = state.currentSession?.chatSessionId;
    if (!currentSessionId || state.mealSession.chatSessionId === currentSessionId) return;

    const snapshot = readMealSnapshot(userId, currentSessionId);
    if (!snapshot) return;

    mergeState({
      mealSession: snapshot.mealSession,
      mealItems: snapshot.mealItems,
      currentSession: state.currentSession
        ? {
            ...state.currentSession,
            activeRecipeId: snapshot.mealSession.activeRecipeId,
          }
        : state.currentSession,
    });
    commitMealSnapshot(snapshot.mealSession, snapshot.mealItems, userId);
  }, [commitMealSnapshot, getUserId, mergeState, state.currentSession, state.mealSession.chatSessionId]);

  const value: ChatFlowContextValue = useMemo(
    () => ({
      state,
      isLoggedIn: Boolean(getUserIdFromStorage()),
      getUserId,
      clearChatError,
      clearPendingPrimarySwitch,
      refreshRecommendations,
      refreshDietNotes,
      upsertDietNote,
      deleteDietNote,
      bootstrapUnifiedTimeline,
      loadOlderMessages,
      sendMessage,
      retryMessage,
      syncMealSelection,
      setPrimaryRecipe,
      updateMealRecipeStatus,
      confirmPendingPrimarySwitch,
      completeCurrentSession,
    }),
    [
      state,
      getUserId,
      clearChatError,
      clearPendingPrimarySwitch,
      refreshRecommendations,
      refreshDietNotes,
      upsertDietNote,
      deleteDietNote,
      bootstrapUnifiedTimeline,
      loadOlderMessages,
      sendMessage,
      retryMessage,
      syncMealSelection,
      setPrimaryRecipe,
      updateMealRecipeStatus,
      confirmPendingPrimarySwitch,
      completeCurrentSession,
    ],
  );

  return <ChatFlowContext.Provider value={value}>{children}</ChatFlowContext.Provider>;
}

export function useChatFlow() {
  const context = useContext(ChatFlowContext);
  if (!context) {
    throw new Error("useChatFlow must be used within ChatFlowProvider");
  }
  return context;
}
