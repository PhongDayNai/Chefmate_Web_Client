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
  ChatRecommendation,
  DietNote,
  ChatMessage,
  ChatPaging,
  ChatSession,
  ChatUiState,
  PantryItem,
  PendingPreviousRecipe,
  ResolvePreviousPayload,
} from "~/features/chat/types";
import { dietNoteService } from "~/features/users/api/dietNoteService";
import { pantryService } from "~/features/pantry/api/pantryService";

const AI_BUSY_BACKOFF_MS = [3000, 5000, 8000] as const;
const MAX_NO_PROGRESS_ATTEMPTS = 2;
const DEFAULT_LIMIT = 30;

type ChatAction =
  | { type: "MERGE"; payload: Partial<ChatUiState> }
  | { type: "RESET" };

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
  aiBusyRetryCount: 0,
  pendingPreviousRecipe: null,
  errorMessage: null,
  dietNotes: [],
  recommendations: [],
  readyToCook: [],
  almostReady: [],
  unavailable: [],
  pantryItems: [],
};

interface FetchUnifiedTimelineOptions {
  beforeMessageId?: number;
  createSessionIfEmpty?: boolean;
  activeRecipeId?: number;
  forceClearActiveRecipe?: boolean;
}

interface UpsertDietNotePayload {
  noteId?: number;
  noteType: string;
  label: string;
  keywords?: string[];
  isActive?: boolean;
}

interface ChatFlowContextValue {
  state: ChatUiState;
  isLoggedIn: boolean;
  getUserId: () => number | null;
  clearChatError: () => void;
  clearPendingPreviousRecipe: () => void;
  newSession: () => void;
  refreshHomeContext: () => Promise<void>;
  refreshRecommendations: () => Promise<void>;
  refreshDietNotes: () => Promise<void>;
  upsertDietNote: (payload: UpsertDietNotePayload) => Promise<boolean>;
  deleteDietNote: (noteId: number) => Promise<boolean>;
  loadSessions: () => Promise<void>;
  bootstrapUnifiedTimeline: (activeRecipeId?: number) => Promise<void>;
  openSession: (sessionId: number) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  resolvePendingAction: (action: ResolvePreviousPayload["action"]) => Promise<boolean>;
  completeCurrentSession: () => Promise<void>;
  loadOlderMessages: () => Promise<void>;
  selectRecipeForCurrentSession: (recipeId: number) => Promise<void>;
  renameSession: (sessionId: number, title: string) => Promise<boolean>;
  deleteSession: (sessionId: number) => Promise<boolean>;
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
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("userId");
  if (!raw) return null;
  const userId = Number(raw);
  return Number.isFinite(userId) && userId > 0 ? userId : null;
}

function extractData(input: any): any {
  if (input && typeof input === "object" && "data" in input && (input.success !== undefined || input.message !== undefined)) {
    return input.data;
  }
  return input?.data ?? input;
}

function normalizeSession(raw: any): ChatSession | null {
  if (!raw || typeof raw !== "object") return null;
  if (!raw.chatSessionId) return null;
  return {
    chatSessionId: Number(raw.chatSessionId),
    userId: raw.userId ? Number(raw.userId) : undefined,
    title: raw.title || "Bepes",
    activeRecipeId: raw.activeRecipeId ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
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
    tempId: raw.tempId,
    userId: raw.userId ? Number(raw.userId) : undefined,
    chatSessionId: raw.chatSessionId ? Number(raw.chatSessionId) : undefined,
    sessionTitle: raw.sessionTitle,
    activeRecipeId: raw.activeRecipeId ?? null,
    isSessionStart: raw.isSessionStart,
    role,
    content,
    meta: raw.meta ?? null,
    createdAt: raw.createdAt || new Date().toISOString(),
    isPending: Boolean(raw.isPending),
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

function messageKey(message: ChatMessage): string {
  if (message.chatMessageId) return `id:${message.chatMessageId}`;
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
    return idA - idB;
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

function findPendingPayload(payload: any, pendingUserMessage?: string): PendingPreviousRecipe | null {
  const data = extractData(payload);
  const candidate = data?.pendingPreviousRecipe ?? data?.payload ?? payload?.pendingPreviousRecipe;
  if (!candidate || !candidate.previousSessionId) return null;

  return {
    previousSessionId: Number(candidate.previousSessionId),
    previousSessionTitle: candidate.previousSessionTitle,
    previousRecipeId: candidate.previousRecipeId ?? null,
    previousRecipeName: candidate.previousRecipeName,
    pendingUserMessage: candidate.pendingUserMessage ?? pendingUserMessage,
  };
}

function hasPendingPreviousCode(payload: any): boolean {
  const code = payload?.code ?? payload?.data?.code ?? payload?.errorCode ?? payload?.data?.errorCode;
  return code === "PENDING_PREVIOUS_RECIPE_COMPLETION";
}

function hasAiBusyCode(error: any): boolean {
  return error?.response?.status === 503 && error?.response?.data?.code === "AI_SERVER_BUSY";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function ChatFlowProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const mergeState = useCallback((payload: Partial<ChatUiState>) => {
    dispatch({ type: "MERGE", payload });
  }, []);

  const setError = useCallback(
    (message: string) => {
      mergeState({ errorMessage: message });
      toast.error(message);
    },
    [mergeState],
  );

  const getUserId = useCallback(() => getUserIdFromStorage(), []);

  const clearChatError = useCallback(() => {
    mergeState({ errorMessage: null });
  }, [mergeState]);

  const clearPendingPreviousRecipe = useCallback(() => {
    mergeState({ pendingPreviousRecipe: null });
  }, [mergeState]);

  const refreshRecommendations = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;

    try {
      const res = await chatService.getRecommendations(userId, 10);
      const data = extractData(res) || {};
      mergeState({
        recommendations: normalizeRecommendations(data.recommendations),
        readyToCook: normalizeRecommendations(data.readyToCook),
        almostReady: normalizeRecommendations(data.almostReady),
        unavailable: normalizeRecommendations(data.unavailable),
      });
    } catch (error) {
      setError("Không thể tải gợi ý món ăn từ tủ lạnh");
    }
  }, [getUserId, mergeState, setError]);

  const refreshDietNotes = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;

    try {
      const res = await dietNoteService.getNotes(userId);
      const notes = normalizeDietNotes(res?.data);
      mergeState({ dietNotes: notes });
    } catch (error) {
      setError("Không thể tải ghi chú ăn uống");
    }
  }, [getUserId, mergeState, setError]);

  const refreshHomeContext = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;

    try {
      const [dietRes, pantryRes, recommendationRes] = await Promise.all([
        dietNoteService.getNotes(userId),
        pantryService.getByUser(userId),
        chatService.getRecommendations(userId, 10),
      ]);

      const recommendationData = extractData(recommendationRes) || {};
      mergeState({
        dietNotes: normalizeDietNotes(dietRes?.data),
        pantryItems: normalizePantryItems(pantryRes?.data),
        recommendations: normalizeRecommendations(recommendationData.recommendations),
        readyToCook: normalizeRecommendations(recommendationData.readyToCook),
        almostReady: normalizeRecommendations(recommendationData.almostReady),
        unavailable: normalizeRecommendations(recommendationData.unavailable),
      });
    } catch (error) {
      setError("Không thể đồng bộ dữ liệu nền cho chat");
    }
  }, [getUserId, mergeState, setError]);

  const loadSessions = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;

    mergeState({ loadingSessions: true });

    try {
      const res = await chatService.listSessions(userId, 1, 50);
      const data = extractData(res);
      const rawItems = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      const sessions = rawItems
        .map((item: any) => normalizeSession(item))
        .filter((item: ChatSession | null): item is ChatSession => Boolean(item));

      mergeState({ sessions });
    } catch (error) {
      setError("Không thể tải danh sách hội thoại");
    } finally {
      mergeState({ loadingSessions: false });
    }
  }, [getUserId, mergeState, setError]);

  const fetchUnifiedTimeline = useCallback(
    async (options: FetchUnifiedTimelineOptions = {}) => {
      const userId = getUserId();
      if (!userId) return;

      const current = stateRef.current;
      const limit = current.limit || DEFAULT_LIMIT;

      mergeState({
        loadingTimeline: true,
        errorMessage: null,
        lastRequestedBeforeMessageId: options.beforeMessageId ?? null,
      });

      try {
        const res = await chatService.getUnifiedTimeline({
          userId,
          limit,
          beforeMessageId: options.beforeMessageId,
        });

        const data = extractData(res);
        const incomingMessages = normalizeMessages(data);
        const session = findPrimarySession(res);
        const paging = findPaging(res, limit);

        if (!options.beforeMessageId && incomingMessages.length === 0 && !session && options.createSessionIfEmpty) {
          const createRes = await chatService.createSession({
            userId,
            title: "Bepes",
            activeRecipeId: options.activeRecipeId ?? null,
          });

          const createdSession = findPrimarySession(createRes);
          if (createdSession) {
            mergeState({
              currentSessionId: createdSession.chatSessionId,
              currentSession: createdSession,
            });
            await loadSessions();
            await fetchUnifiedTimeline({ ...options, createSessionIfEmpty: false, beforeMessageId: undefined });
            return;
          }
        }

        const baseTimeline = options.beforeMessageId ? current.timeline : [];
        const mergedTimeline = mergeAndSortTimeline(baseTimeline, incomingMessages);
        const hasProgress = mergedTimeline.length > baseTimeline.length;

        const nextNoProgress = options.beforeMessageId
          ? hasProgress
            ? 0
            : current.noProgressLoadCount + 1
          : 0;

        const shouldStopPaging = nextNoProgress >= MAX_NO_PROGRESS_ATTEMPTS;

        const inferredSession = normalizeSession(
          data?.items?.length
            ? {
                chatSessionId: data.items[data.items.length - 1].chatSessionId,
                title: data.items[data.items.length - 1].sessionTitle,
              }
            : null,
        );

        // Only keep previous currentSession when paginating older messages.
        // For fresh loads, trust backend response and inferred timeline session.
        const currentSession = options.beforeMessageId
          ? session ?? current.currentSession ?? inferredSession
          : session ?? inferredSession ?? null;

        const finalCurrentSession =
          currentSession && options.forceClearActiveRecipe
            ? {
                ...currentSession,
                activeRecipeId: null,
              }
            : currentSession;

        mergeState({
          timeline: mergedTimeline,
          currentSessionId: finalCurrentSession?.chatSessionId ?? (options.beforeMessageId ? current.currentSessionId : null),
          currentSession: finalCurrentSession,
          hasMore: shouldStopPaging ? false : paging.hasMore,
          nextBeforeMessageId: shouldStopPaging ? null : paging.nextBeforeMessageId,
          noProgressLoadCount: nextNoProgress,
        });

        if (
          options.activeRecipeId &&
          options.activeRecipeId > 0 &&
          finalCurrentSession?.chatSessionId &&
          finalCurrentSession.activeRecipeId !== options.activeRecipeId
        ) {
          await chatService.updateActiveRecipe({
            userId,
            chatSessionId: finalCurrentSession.chatSessionId,
            recipeId: options.activeRecipeId,
          });

          mergeState({
            currentSession: {
              ...finalCurrentSession,
              activeRecipeId: options.activeRecipeId,
            },
          });
        }
      } catch (error) {
        setError("Không thể tải timeline hội thoại");
      } finally {
        mergeState({ loadingTimeline: false });
      }
    },
    [getUserId, loadSessions, mergeState, setError],
  );

  const bootstrapUnifiedTimeline = useCallback(
    async (activeRecipeId?: number) => {
      await refreshHomeContext();
      await fetchUnifiedTimeline({ createSessionIfEmpty: true, activeRecipeId });
      await loadSessions();
    },
    [fetchUnifiedTimeline, loadSessions, refreshHomeContext],
  );

  const openSession = useCallback(
    async (sessionId: number) => {
      const userId = getUserId();
      if (!userId) return;

      mergeState({ loadingTimeline: true });

      try {
        const res = await chatService.getSessionHistory(sessionId, userId);
        const data = extractData(res);
        const session = normalizeSession(data?.session) ?? stateRef.current.sessions.find((item) => item.chatSessionId === sessionId) ?? null;
        const timeline = mergeAndSortTimeline([], normalizeMessages(data?.messages));

        mergeState({
          currentSessionId: sessionId,
          currentSession: session,
          timeline,
          hasMore: false,
          nextBeforeMessageId: null,
          noProgressLoadCount: 0,
        });
      } catch (error) {
        setError("Không thể mở hội thoại đã chọn");
      } finally {
        mergeState({ loadingTimeline: false });
      }
    },
    [getUserId, mergeState, setError],
  );

  const sendMessage = useCallback(
    async (message: string) => {
      const userId = getUserId();
      if (!userId) {
        setError("Vui lòng đăng nhập để chat với Bepes");
        return;
      }

      const current = stateRef.current;
      const cleanedMessage = message.trim();
      if (!cleanedMessage || current.sending) return;

      const optimisticTempId = `temp-${Date.now()}`;
      const optimisticMessage: ChatMessage = {
        tempId: optimisticTempId,
        role: "user",
        content: cleanedMessage,
        createdAt: new Date().toISOString(),
        chatSessionId: current.currentSessionId ?? undefined,
        isPending: true,
      };

      mergeState({
        timeline: mergeAndSortTimeline(current.timeline, [optimisticMessage]),
        sending: true,
        aiBusyRetryCount: 0,
        errorMessage: null,
      });

      let responsePayload: any = null;

      try {
        let attempt = 0;
        while (attempt <= AI_BUSY_BACKOFF_MS.length) {
          try {
            responsePayload = await chatService.sendMessage({
              userId,
              chatSessionId: stateRef.current.currentSessionId ?? undefined,
              message: cleanedMessage,
            });
            break;
          } catch (error: any) {
            if (hasAiBusyCode(error) && attempt < AI_BUSY_BACKOFF_MS.length) {
              const retryCount = attempt + 1;
              mergeState({ aiBusyRetryCount: retryCount });
              await sleep(AI_BUSY_BACKOFF_MS[attempt]);
              attempt += 1;
              continue;
            }

            if (hasPendingPreviousCode(error?.response?.data)) {
              responsePayload = error.response.data;
              break;
            }

            throw error;
          }
        }

        if (!responsePayload) {
          throw new Error("EMPTY_CHAT_RESPONSE");
        }

        const pendingPayload = hasPendingPreviousCode(responsePayload)
          ? findPendingPayload(responsePayload, cleanedMessage)
          : null;

        if (pendingPayload) {
          const timeline = stateRef.current.timeline.map((item) =>
            item.tempId === optimisticTempId ? { ...item, isPending: false } : item,
          );

          mergeState({
            timeline,
            pendingPreviousRecipe: pendingPayload,
          });

          return;
        }

        const responseData = extractData(responsePayload);
        const responseSession = findPrimarySession(responsePayload);
        const responseMessages = normalizeMessages(responseData);

        const fallbackAssistant = responseData?.assistantMessage
          ? normalizeMessage({
              role: "assistant",
              content: responseData.assistantMessage,
              createdAt: new Date().toISOString(),
              chatSessionId: responseSession?.chatSessionId ?? stateRef.current.currentSessionId,
            })
          : null;

        const mergedResponseMessages = fallbackAssistant
          ? [...responseMessages, fallbackAssistant]
          : responseMessages;

        let nextTimeline = stateRef.current.timeline.map((item) =>
          item.tempId === optimisticTempId ? { ...item, isPending: false } : item,
        );
        nextTimeline = mergeAndSortTimeline(nextTimeline, mergedResponseMessages);

        if (mergedResponseMessages.some((item) => item.role === "user" && item.content.trim() === cleanedMessage)) {
          nextTimeline = nextTimeline.filter((item) => item.tempId !== optimisticTempId);
        }

        mergeState({
          timeline: nextTimeline,
          currentSessionId: responseSession?.chatSessionId ?? stateRef.current.currentSessionId,
          currentSession: responseSession ?? stateRef.current.currentSession,
          pendingPreviousRecipe: null,
          aiBusyRetryCount: 0,
        });

        const paging = responseData?.paging ? normalizePaging(responseData.paging, stateRef.current.limit) : null;
        if (paging) {
          mergeState({
            hasMore: paging.hasMore,
            nextBeforeMessageId: paging.nextBeforeMessageId,
          });
        }

        await loadSessions();
      } catch (error: any) {
        const timeline = stateRef.current.timeline.map((item) =>
          item.tempId === optimisticTempId ? { ...item, isPending: false } : item,
        );
        mergeState({ timeline });
        setError(error?.response?.data?.message || "AI đang bận, thử lại sau nhé!");
      } finally {
        mergeState({ sending: false });
      }
    },
    [getUserId, loadSessions, mergeState, setError],
  );

  const resolvePendingAction = useCallback(
    async (action: ResolvePreviousPayload["action"]) => {
      const userId = getUserId();
      const pending = stateRef.current.pendingPreviousRecipe;

      if (!userId || !pending) return false;

      mergeState({ sending: true });

      try {
        const payload: ResolvePreviousPayload = {
          userId,
          previousSessionId: pending.previousSessionId,
          action,
          pendingUserMessage: pending.pendingUserMessage ?? null,
        };

        const res = await chatService.resolveAndCreate(payload);
        const data = extractData(res);
        const session = findPrimarySession(res);
        const messages = normalizeMessages(data);

        mergeState({
          timeline: mergeAndSortTimeline([], messages),
          currentSessionId: session?.chatSessionId ?? stateRef.current.currentSessionId,
          currentSession: session ?? stateRef.current.currentSession,
          pendingPreviousRecipe: null,
        });

        await fetchUnifiedTimeline({ createSessionIfEmpty: action !== "continue_current_session" });
        await loadSessions();

        return true;
      } catch (error) {
        setError("Không thể xử lý phiên trước đó");
        return false;
      } finally {
        mergeState({ sending: false });
      }
    },
    [fetchUnifiedTimeline, getUserId, loadSessions, mergeState, setError],
  );

  const completeCurrentSession = useCallback(async () => {
    const userId = getUserId();
    const currentSessionId = stateRef.current.currentSessionId;

    if (!userId || !currentSessionId) return;

    try {
      await chatService.resolveAndCreate({
        userId,
        previousSessionId: currentSessionId,
        action: "complete_and_deduct",
        pendingUserMessage: null,
      });

      // Clear selected recipe right away so UI does not keep stale context
      // while timeline/session are being refreshed.
      mergeState({
        currentSession: stateRef.current.currentSession
          ? {
              ...stateRef.current.currentSession,
              activeRecipeId: null,
            }
          : null,
      });

      await fetchUnifiedTimeline({ createSessionIfEmpty: true, forceClearActiveRecipe: true });
      await loadSessions();

      // Backend may carry active recipe into the next session after resolve.
      // Always clear active recipe on the latest session id server-side,
      // do not rely on local state because forceClearActiveRecipe already nulls it.
      const latestSession = stateRef.current.currentSession;
      if (latestSession?.chatSessionId) {
        try {
          await chatService.updateActiveRecipe({
            userId,
            chatSessionId: latestSession.chatSessionId,
            recipeId: null,
          });
        } catch (error) {
          // Silent fallback: keep UI consistent even if backend patch fails.
        }

        mergeState({
          currentSession: {
            ...latestSession,
            activeRecipeId: null,
          },
        });
      }

      toast.success("Đã hoàn thành phiên nấu ăn");
    } catch (error) {
      setError("Không thể hoàn thành phiên hiện tại");
    }
  }, [fetchUnifiedTimeline, getUserId, loadSessions, mergeState, setError]);

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

    await fetchUnifiedTimeline({ beforeMessageId: current.nextBeforeMessageId });
  }, [fetchUnifiedTimeline]);

  const selectRecipeForCurrentSession = useCallback(
    async (recipeId: number) => {
      const userId = getUserId();
      if (!userId) return;

      try {
        const current = stateRef.current;
        if (!current.currentSessionId) {
          const res = await chatService.createSession({
            userId,
            title: "Bepes",
            activeRecipeId: recipeId,
          });

          const session = findPrimarySession(res);
          if (session) {
            mergeState({
              currentSessionId: session.chatSessionId,
              currentSession: session,
            });
          }

          await fetchUnifiedTimeline({ createSessionIfEmpty: false, activeRecipeId: recipeId });
          await loadSessions();
          return;
        }

        await chatService.updateActiveRecipe({
          userId,
          chatSessionId: current.currentSessionId,
          recipeId,
        });

        if (current.currentSession) {
          mergeState({
            currentSession: {
              ...current.currentSession,
              activeRecipeId: recipeId,
            },
          });
        }

        toast.success("Đã cập nhật món đang nấu cho phiên chat");
      } catch (error) {
        setError("Không thể gắn món ăn vào phiên hiện tại");
      }
    },
    [fetchUnifiedTimeline, getUserId, loadSessions, mergeState, setError],
  );

  const renameSession = useCallback(
    async (sessionId: number, title: string) => {
      const userId = getUserId();
      if (!userId) return false;

      const cleanedTitle = title.trim();
      if (!cleanedTitle) return false;

      try {
        await chatService.updateTitle({ userId, chatSessionId: sessionId, title: cleanedTitle });

        const sessions = stateRef.current.sessions.map((item) =>
          item.chatSessionId === sessionId ? { ...item, title: cleanedTitle } : item,
        );

        const currentSession =
          stateRef.current.currentSession?.chatSessionId === sessionId
            ? { ...stateRef.current.currentSession, title: cleanedTitle }
            : stateRef.current.currentSession;

        mergeState({ sessions, currentSession });
        return true;
      } catch (error) {
        setError("Không thể đổi tên hội thoại");
        return false;
      }
    },
    [getUserId, mergeState, setError],
  );

  const deleteSession = useCallback(
    async (sessionId: number) => {
      const userId = getUserId();
      if (!userId) return false;

      try {
        await chatService.deleteSession(sessionId, userId);

        const sessions = stateRef.current.sessions.filter((item) => item.chatSessionId !== sessionId);
        const isCurrentDeleted = stateRef.current.currentSessionId === sessionId;

        mergeState({
          sessions,
          currentSessionId: isCurrentDeleted ? null : stateRef.current.currentSessionId,
          currentSession: isCurrentDeleted ? null : stateRef.current.currentSession,
          timeline: isCurrentDeleted ? [] : stateRef.current.timeline,
        });

        if (isCurrentDeleted) {
          await fetchUnifiedTimeline({ createSessionIfEmpty: true });
        }

        return true;
      } catch (error) {
        setError("Không thể xóa hội thoại");
        return false;
      }
    },
    [fetchUnifiedTimeline, getUserId, mergeState, setError],
  );

  const upsertDietNote = useCallback(
    async (payload: UpsertDietNotePayload) => {
      const userId = getUserId();
      if (!userId) return false;

      try {
        const finalPayload = { ...payload, userId };
        const res = await dietNoteService.upsertNote(finalPayload);
        if (res?.success === false) return false;

        await refreshDietNotes();
        await refreshRecommendations();
        return true;
      } catch (error) {
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
        const res = await dietNoteService.deleteNote(userId, noteId);
        if (res?.success === false) return false;

        await refreshDietNotes();
        await refreshRecommendations();
        return true;
      } catch (error) {
        setError("Không thể xóa ghi chú ăn uống");
        return false;
      }
    },
    [getUserId, refreshDietNotes, refreshRecommendations, setError],
  );

  const newSession = useCallback(() => {
    mergeState({
      currentSessionId: null,
      currentSession: null,
      timeline: [],
      hasMore: true,
      nextBeforeMessageId: null,
      noProgressLoadCount: 0,
      pendingPreviousRecipe: null,
    });
  }, [mergeState]);

  const value: ChatFlowContextValue = useMemo(
    () => ({
      state,
      isLoggedIn: Boolean(getUserIdFromStorage()),
      getUserId,
      clearChatError,
      clearPendingPreviousRecipe,
      newSession,
      refreshHomeContext,
      refreshRecommendations,
      refreshDietNotes,
      upsertDietNote,
      deleteDietNote,
      loadSessions,
      bootstrapUnifiedTimeline,
      openSession,
      sendMessage,
      resolvePendingAction,
      completeCurrentSession,
      loadOlderMessages,
      selectRecipeForCurrentSession,
      renameSession,
      deleteSession,
    }),
    [
      state,
      getUserId,
      clearChatError,
      clearPendingPreviousRecipe,
      newSession,
      refreshHomeContext,
      refreshRecommendations,
      refreshDietNotes,
      upsertDietNote,
      deleteDietNote,
      loadSessions,
      bootstrapUnifiedTimeline,
      openSession,
      sendMessage,
      resolvePendingAction,
      completeCurrentSession,
      loadOlderMessages,
      selectRecipeForCurrentSession,
      renameSession,
      deleteSession,
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
