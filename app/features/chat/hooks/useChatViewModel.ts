"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type {
  ChatRecommendation,
  DietNote,
  DietNoteType,
  MealCompletionType,
  MealItem,
  MealRecipeStatus,
  MealRemainingStatus,
} from "~/features/chat/types";
import { useChatFlow } from "~/features/chat/state/ChatFlowProvider";
import { recipeService } from "~/features/recipes/api/recipeService";
import type { MealPickerGroup } from "~/features/chat/components/MealPickerDialog";
import { checkAuth, getAuthUserId } from "~/utils/authUtils";
export const CHAT_SCROLL_TOP_LOAD_THRESHOLD = 80;
export const CHAT_SCROLL_BOTTOM_THRESHOLD = 120;

interface UseChatViewModelOptions {
  ensureAuth: () => boolean;
  recipeIdParam?: number;
  bootstrapWhen?: boolean;
  onRecipeParamConsumed?: () => void;
  syncContextActionsWhen?: boolean;
}

export const DIET_NOTE_TYPE_OPTIONS: { value: DietNoteType; label: string }[] = [
  { value: "allergy", label: "Dị ứng" },
  { value: "restriction", label: "Hạn chế" },
  { value: "preference", label: "Sở thích" },
  { value: "health_note", label: "Lưu ý sức khỏe" },
];

function buildDietSummary(notes: DietNote[]): string {
  const active = notes.filter((note) => note.isActive !== false);
  if (!active.length) return "Không có";
  if (active.length <= 2) return active.map((note) => note.label).join(", ");
  return `${active[0].label}, ${active[1].label} +${active.length - 2}`;
}

function moveMealItem(items: MealItem[], recipeId: number, direction: "up" | "down"): MealItem[] {
  const next = [...items];
  const currentIndex = next.findIndex((item) => item.recipeId === recipeId);
  if (currentIndex < 0) return items;
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= next.length) return items;
  const [removed] = next.splice(currentIndex, 1);
  next.splice(targetIndex, 0, removed);
  return next.map((item, index) => ({
    ...item,
    sortOrder: index + 1,
  }));
}

function buildMealItemFromRecommendation(item: ChatRecommendation, sortOrder: number): MealItem {
  return {
    recipeId: item.recipeId,
    recipeName: item.recipeName,
    sortOrder,
    status: "pending",
    note: null,
    servingsOverride: null,
  };
}

function buildRecipeCacheEntries(recipes: any[]): Record<number, any> {
  return recipes.reduce<Record<number, any>>((acc, item) => {
    acc[item.recipeId] = item;
    return acc;
  }, {});
}

export function useChatViewModel({
  ensureAuth,
  recipeIdParam,
  bootstrapWhen = true,
  onRecipeParamConsumed,
  syncContextActionsWhen = true,
}: UseChatViewModelOptions) {
  const router = useRouter();
  const {
    state,
    getUserId,
    bootstrapUnifiedTimeline,
    sendMessage,
    retryMessage,
    loadOlderMessages,
    refreshRecommendations,
    refreshDietNotes,
    upsertDietNote,
    deleteDietNote,
    syncMealSelection,
    setPrimaryRecipe,
    updateMealRecipeStatus,
    confirmPendingPrimarySwitch,
    clearPendingPrimarySwitch,
    completeCurrentSession,
  } = useChatFlow();

  const [input, setInput] = useState("");
  const [showContextActions, setShowContextActions] = useState(true);
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [showDietModal, setShowDietModal] = useState(false);
  const [showRecipeDialog, setShowRecipeDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [dietNoteLabel, setDietNoteLabel] = useState("");
  const [dietNoteType, setDietNoteType] = useState<DietNoteType>("allergy");
  const [resolvedUserId, setResolvedUserId] = useState<number | null>(null);
  const [highlightedRecipeId, setHighlightedRecipeId] = useState<number | null>(null);
  const [recipeCache, setRecipeCache] = useState<Record<number, any>>({});
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [retryNow, setRetryNow] = useState(Date.now());

  const nearBottomRef = useRef(true);
  const bootstrappingRef = useRef(false);
  const consumedRecipeParamRef = useRef<number | null>(null);
  const autoOpenedNeedSelectionRef = useRef<string | null>(null);

  useEffect(() => {
    setResolvedUserId(getAuthUserId());
    const onStorage = () => setResolvedUserId(getAuthUserId());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const userId = resolvedUserId;
  const isLoggedIn = checkAuth();

  const recommendationGroups = useMemo<MealPickerGroup[]>(
    () => [
      {
        key: "ready",
        title: "Có thể nấu ngay",
        description: "Đủ nguyên liệu để bắt đầu ngay lúc này.",
        items: state.readyToCook || [],
      },
      {
        key: "almost",
        title: "Còn thiếu 1 chút",
        description: "Thiếu ít nguyên liệu, có thể cân nhắc thay thế hoặc mua nhanh.",
        items: state.almostReady || [],
      },
      {
        key: "unavailable",
        title: "Món đề xuất",
        description: "Các món đáng tham khảo thêm cho bữa hiện tại.",
        items: state.unavailable || [],
      },
    ],
    [state.almostReady, state.readyToCook, state.unavailable],
  );

  const activeMealItem = useMemo(() => {
    if (!state.mealSession.activeRecipeId) return null;
    return state.mealItems.find((item) => item.recipeId === state.mealSession.activeRecipeId) || null;
  }, [state.mealItems, state.mealSession.activeRecipeId]);

  const activeRecipeLabel = activeMealItem?.recipeName || "Chưa chọn món";
  const dietSummary = useMemo(() => buildDietSummary(state.dietNotes), [state.dietNotes]);
  const canCompleteSession = Boolean(
    state.mealSession.chatSessionId && !state.mealSession.uiClosed && !state.mealSyncing && !state.sending,
  );
  const canMutateMeal = Boolean(!state.mealSession.uiClosed && !state.mealSyncing && !state.sending);
  const canSendMessage = Boolean(!state.mealSession.uiClosed && !state.sending);

  const selectedRecipeEntries = useMemo(
    () =>
      state.mealItems.map((mealItem) => ({
        mealItem,
        recipe: recipeCache[mealItem.recipeId] ?? null,
      })),
    [recipeCache, state.mealItems],
  );

  useEffect(() => {
    if (!syncContextActionsWhen) return;
    setShowContextActions(true);
  }, [syncContextActionsWhen, state.mealSession.chatSessionId]);

  useEffect(() => {
    const hasRetryableMessages = state.timeline.some((item) => {
      if (!item.isFailed || !item.retryable || !item.retryAvailableAt) return false;
      return new Date(item.retryAvailableAt).getTime() > Date.now();
    });

    if (!hasRetryableMessages) return;
    const interval = window.setInterval(() => setRetryNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [state.timeline]);

  useEffect(() => {
    setRetryNow(Date.now());
  }, [state.timeline]);

  useEffect(() => {
    const latestUserId = getAuthUserId();
    if (latestUserId !== resolvedUserId) {
      setResolvedUserId(latestUserId);
    }

    const effectiveUserId = latestUserId ?? resolvedUserId;
    if (!bootstrapWhen || !effectiveUserId) return;
    if (bootstrappingRef.current) return;

    let cancelled = false;

    const run = async () => {
      bootstrappingRef.current = true;
      try {
        await bootstrapUnifiedTimeline();
      } finally {
        if (!cancelled) {
          bootstrappingRef.current = false;
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [bootstrapUnifiedTimeline, bootstrapWhen, resolvedUserId]);

  useEffect(() => {
    if (!recipeIdParam || recipeIdParam <= 0) return;
    if (consumedRecipeParamRef.current === recipeIdParam) return;
    if (!userId) return;

    let cancelled = false;

    const run = async () => {
      await refreshRecommendations();
      if (cancelled) return;

      setHighlightedRecipeId(recipeIdParam);
      setShowRecipePicker(true);
      consumedRecipeParamRef.current = recipeIdParam;
      onRecipeParamConsumed?.();
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [onRecipeParamConsumed, recipeIdParam, refreshRecommendations, userId]);

  useEffect(() => {
    if (!state.mealSession.needsSelection || state.mealSession.uiClosed) return;

    const autoPromptKey = `${state.mealSession.chatSessionId ?? "none"}:${state.mealItems.length}:${state.mealSession.activeRecipeId ?? "none"}`;
    if (autoOpenedNeedSelectionRef.current === autoPromptKey) return;

    autoOpenedNeedSelectionRef.current = autoPromptKey;
    setShowRecipePicker(true);
  }, [state.mealItems.length, state.mealSession.activeRecipeId, state.mealSession.chatSessionId, state.mealSession.needsSelection, state.mealSession.uiClosed]);

  const ensureUserId = useCallback(() => {
    if (!ensureAuth()) return null;
    const uid = getAuthUserId() ?? getUserId();
    if (!uid) return null;
    setResolvedUserId(uid);
    return uid;
  }, [ensureAuth, getUserId]);

  const handleTimelineScroll = useCallback(
    (container: HTMLDivElement) => {
      const distanceToBottom = container.scrollHeight - (container.scrollTop + container.clientHeight);
      nearBottomRef.current = distanceToBottom < CHAT_SCROLL_BOTTOM_THRESHOLD;

      if (container.scrollTop <= CHAT_SCROLL_TOP_LOAD_THRESHOLD) {
        void loadOlderMessages();
      }
    },
    [loadOlderMessages],
  );

  const autoScrollTimeline = useCallback(
    (container: HTMLDivElement) => {
      if (nearBottomRef.current || state.sending) {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      }
    },
    [state.sending],
  );

  const handleSend = useCallback(async () => {
    const uid = ensureUserId();
    if (!uid) return;

    const message = input.trim();
    if (!message || !canSendMessage) return;

    setInput("");
    await sendMessage(message);
  }, [canSendMessage, ensureUserId, input, sendMessage]);

  const handleRetryMessage = useCallback(
    async (tempId: string) => {
      const uid = ensureUserId();
      if (!uid) return;
      await retryMessage(tempId);
    },
    [ensureUserId, retryMessage],
  );

  const handleOpenRecipePicker = useCallback(async () => {
    const uid = ensureUserId();
    if (!uid) return;
    await refreshRecommendations();
    setShowRecipePicker(true);
  }, [ensureUserId, refreshRecommendations]);

  const handleAddRecipeToMeal = useCallback(
    async (item: ChatRecommendation) => {
      const uid = ensureUserId();
      if (!uid) return;
      if (state.mealItems.some((mealItem) => mealItem.recipeId === item.recipeId)) return;

      const nextItems = [
        ...state.mealItems,
        buildMealItemFromRecommendation(item, state.mealItems.length + 1),
      ];
      const ok = await syncMealSelection(nextItems);
      if (ok) {
        setHighlightedRecipeId(item.recipeId);
      }
    },
    [ensureUserId, state.mealItems, syncMealSelection],
  );

  const handleRemoveMealRecipe = useCallback(
    async (recipeId: number) => {
      const uid = ensureUserId();
      if (!uid) return;

      const nextItems = state.mealItems.filter((item) => item.recipeId !== recipeId);
      await syncMealSelection(nextItems);
    },
    [ensureUserId, state.mealItems, syncMealSelection],
  );

  const handleMoveMealRecipe = useCallback(
    async (recipeId: number, direction: "up" | "down") => {
      const uid = ensureUserId();
      if (!uid) return;
      const nextItems = moveMealItem(state.mealItems, recipeId, direction);
      await syncMealSelection(nextItems);
    },
    [ensureUserId, state.mealItems, syncMealSelection],
  );

  const handleSetPrimaryRecipe = useCallback(
    async (recipeId: number) => {
      const uid = ensureUserId();
      if (!uid) return;
      await setPrimaryRecipe(recipeId);
    },
    [ensureUserId, setPrimaryRecipe],
  );

  const handleChangeMealStatus = useCallback(
    async (recipeId: number, status: MealRecipeStatus) => {
      const uid = ensureUserId();
      if (!uid) return;
      await updateMealRecipeStatus({ recipeId, status });
    },
    [ensureUserId, updateMealRecipeStatus],
  );

  const handleOpenRecipes = useCallback(async () => {
    const uid = ensureUserId();
    if (!uid) return;
    if (!state.mealItems.length) {
      toast.error("Phiên hiện tại chưa có món nào để xem công thức");
      return;
    }

    const missingIds = state.mealItems
      .map((item) => item.recipeId)
      .filter((recipeId) => !recipeCache[recipeId]);

    setShowRecipeDialog(true);

    if (!missingIds.length) return;

    setLoadingRecipes(true);
    try {
      const recipes = await recipeService.getRecipesByIds(missingIds);
      setRecipeCache((prev) => ({
        ...prev,
        ...buildRecipeCacheEntries(recipes),
      }));
    } catch {
      toast.error("Không thể tải danh sách công thức cho phiên hiện tại");
    } finally {
      setLoadingRecipes(false);
    }
  }, [ensureUserId, recipeCache, state.mealItems]);

  const handleOpenRecipeFromDialog = useCallback(
    (recipeId: number) => {
      setShowRecipeDialog(false);
      router.push(`/recipe/${recipeId}`);
    },
    [router],
  );

  const handleOpenDietModal = useCallback(async () => {
    const uid = ensureUserId();
    if (!uid) return;
    await refreshDietNotes();
    setShowDietModal(true);
  }, [ensureUserId, refreshDietNotes]);

  const handleAddDietNote = useCallback(async () => {
    const label = dietNoteLabel.trim();
    if (!label) return;

    const ok = await upsertDietNote({
      noteType: dietNoteType,
      label,
      keywords: [label],
      isActive: true,
    });

    if (ok) {
      toast.success("Đã lưu ghi chú ăn uống");
      setDietNoteLabel("");
    }
  }, [dietNoteLabel, dietNoteType, upsertDietNote]);

  const handleToggleDietNote = useCallback(
    async (note: DietNote) => {
      const ok = await upsertDietNote({
        noteId: note.noteId,
        noteType: note.noteType,
        label: note.label,
        keywords: note.keywords && note.keywords.length ? note.keywords : [note.label],
        isActive: note.isActive === false,
      });

      if (ok) {
        toast.success(note.isActive === false ? "Đã bật ghi chú" : "Đã tắt ghi chú");
      }
    },
    [upsertDietNote],
  );

  const handleEditDietNote = useCallback(
    async (note: DietNote) => {
      const nextLabel = window.prompt("Cập nhật ghi chú", note.label);
      if (!nextLabel || !nextLabel.trim()) return;

      const normalizedLabel = nextLabel.trim();
      const ok = await upsertDietNote({
        noteId: note.noteId,
        noteType: note.noteType,
        label: normalizedLabel,
        keywords: [normalizedLabel],
        isActive: note.isActive !== false,
      });

      if (ok) toast.success("Đã cập nhật ghi chú");
    },
    [upsertDietNote],
  );

  const handleDeleteDietNote = useCallback(
    async (noteId: number) => {
      const ok = await deleteDietNote(noteId);
      if (ok) toast.success("Đã xóa ghi chú");
    },
    [deleteDietNote],
  );

  const handleOpenCompleteDialog = useCallback(() => {
    const uid = ensureUserId();
    if (!uid) return;
    if (!canCompleteSession) {
      toast.error("Phiên hiện tại chưa sẵn sàng để hoàn thành");
      return;
    }
    setShowCompleteDialog(true);
  }, [canCompleteSession, ensureUserId]);

  const handleConfirmCompleteSession = useCallback(
    async (payload: {
      completionType: MealCompletionType;
      note: string;
      markRemainingStatus: MealRemainingStatus;
    }) => {
      const ok = await completeCurrentSession(payload);
      if (ok) {
        setShowCompleteDialog(false);
      }
    },
    [completeCurrentSession],
  );

  const handleConfirmPendingPrimarySwitch = useCallback(
    async (nextPrimaryRecipeId: number) => {
      const ok = await confirmPendingPrimarySwitch(nextPrimaryRecipeId);
      if (ok) {
        toast.success("Đã cập nhật món ưu tiên tiếp theo");
      }
    },
    [confirmPendingPrimarySwitch],
  );

  const handleClosePendingPrimarySwitch = useCallback(() => {
    clearPendingPrimarySwitch();
  }, [clearPendingPrimarySwitch]);

  return {
    state,
    userId,
    isLoggedIn,
    input,
    setInput,
    showContextActions,
    setShowContextActions,
    showRecipePicker,
    setShowRecipePicker,
    showDietModal,
    setShowDietModal,
    showRecipeDialog,
    setShowRecipeDialog,
    showCompleteDialog,
    setShowCompleteDialog,
    dietNoteLabel,
    setDietNoteLabel,
    dietNoteType,
    setDietNoteType,
    recommendationGroups,
    activeMealItem,
    activeRecipeLabel,
    dietSummary,
    canCompleteSession,
    canMutateMeal,
    canSendMessage,
    retryNow,
    highlightedRecipeId,
    loadingRecipes,
    selectedRecipeEntries,
    handleTimelineScroll,
    autoScrollTimeline,
    handleSend,
    handleRetryMessage,
    handleOpenRecipePicker,
    handleAddRecipeToMeal,
    handleRemoveMealRecipe,
    handleMoveMealRecipe,
    handleSetPrimaryRecipe,
    handleChangeMealStatus,
    handleOpenRecipes,
    handleOpenRecipeFromDialog,
    handleOpenDietModal,
    handleAddDietNote,
    handleToggleDietNote,
    handleEditDietNote,
    handleDeleteDietNote,
    handleOpenCompleteDialog,
    handleConfirmCompleteSession,
    handleConfirmPendingPrimarySwitch,
    handleClosePendingPrimarySwitch,
  };
}
