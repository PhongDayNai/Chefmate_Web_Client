"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { ChatRecommendation, DietNote, DietNoteType } from "~/features/chat/types";
import { useChatFlow } from "~/features/chat/state/ChatFlowProvider";
import { recipeService } from "~/features/recipes/api/recipeService";

export const CHAT_SCROLL_TOP_LOAD_THRESHOLD = 80;
export const CHAT_SCROLL_BOTTOM_THRESHOLD = 120;

export type RecommendationGroupTone = "ready" | "almost" | "unavailable";

export interface RecommendationGroup {
  key: RecommendationGroupTone;
  title: string;
  description: string;
  items: ChatRecommendation[];
}

interface UseChatViewModelOptions {
  ensureAuth: () => boolean;
  recipeIdParam?: number;
  bootstrapWhen?: boolean;
  onRecipeParamConsumed?: () => void;
  syncContextActionsWhen?: boolean;
}

function readUserIdFromStorage(): number | null {
  if (typeof window === "undefined") return null;
  const rawUserId = localStorage.getItem("userId");
  const parsedUserId = Number(rawUserId);
  return Number.isFinite(parsedUserId) && parsedUserId > 0 ? parsedUserId : null;
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

export function recommendationToneClasses(tone: RecommendationGroupTone): string {
  if (tone === "ready") return "border-emerald-200 bg-emerald-50";
  if (tone === "almost") return "border-amber-200 bg-amber-50";
  return "border-slate-200 bg-slate-50";
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
    loadOlderMessages,
    refreshRecommendations,
    refreshDietNotes,
    upsertDietNote,
    deleteDietNote,
    selectRecipeForCurrentSession,
    completeCurrentSession,
  } = useChatFlow();

  const [input, setInput] = useState("");
  const [showContextActions, setShowContextActions] = useState(true);
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [showDietModal, setShowDietModal] = useState(false);
  const [dietNoteLabel, setDietNoteLabel] = useState("");
  const [dietNoteType, setDietNoteType] = useState<DietNoteType>("allergy");
  const [resolvedUserId, setResolvedUserId] = useState<number | null>(null);

  const nearBottomRef = useRef(true);
  const consumedRecipeParamRef = useRef<number | null>(null);
  const bootstrappingRef = useRef(false);

  useEffect(() => {
    setResolvedUserId(readUserIdFromStorage());
    const onStorage = () => setResolvedUserId(readUserIdFromStorage());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const userId = resolvedUserId;
  const isLoggedIn = Boolean(resolvedUserId);

  const recommendationGroups = useMemo<RecommendationGroup[]>(
    () => [
      {
        key: "ready",
        title: "Sẵn sàng nấu",
        description: "Đủ nguyên liệu để bắt đầu ngay",
        items: state.readyToCook || [],
      },
      {
        key: "almost",
        title: "Gần đủ nguyên liệu",
        description: "Thiếu ít nguyên liệu, có thể thay thế",
        items: state.almostReady || [],
      },
      {
        key: "unavailable",
        title: "Chưa đủ nguyên liệu",
        description: "Cần bổ sung thêm trước khi nấu",
        items: state.unavailable || [],
      },
    ],
    [state.almostReady, state.readyToCook, state.unavailable],
  );

  const activeRecommendation = useMemo(() => {
    if (!state.currentSession?.activeRecipeId) return null;
    const activeId = state.currentSession.activeRecipeId;

    const source = [state.recommendations, state.readyToCook, state.almostReady, state.unavailable];
    for (const group of source) {
      const found = group.find((item) => item.recipeId === activeId);
      if (found) return found;
    }

    return null;
  }, [
    state.almostReady,
    state.currentSession?.activeRecipeId,
    state.readyToCook,
    state.recommendations,
    state.unavailable,
  ]);

  const hasActiveRecipe = Boolean(state.currentSession?.activeRecipeId);
  const hasUserMessageInCurrentSession = useMemo(() => {
    if (!state.currentSessionId) return false;

    return state.timeline.some((item) => {
      if (item.role !== "user") return false;
      if (item.isPending) return false;
      if (!item.content.trim()) return false;
      if (item.chatSessionId && item.chatSessionId !== state.currentSessionId) return false;
      return true;
    });
  }, [state.currentSessionId, state.timeline]);
  const canCompleteSession = Boolean(state.currentSessionId && hasUserMessageInCurrentSession && !state.sending);
  const dietSummary = useMemo(() => buildDietSummary(state.dietNotes), [state.dietNotes]);

  useEffect(() => {
    if (!syncContextActionsWhen) return;
    setShowContextActions(!hasActiveRecipe);
  }, [hasActiveRecipe, syncContextActionsWhen]);

  useEffect(() => {
    const latestUserId = readUserIdFromStorage();
    if (latestUserId !== resolvedUserId) {
      setResolvedUserId(latestUserId);
    }

    const effectiveUserId = latestUserId ?? resolvedUserId;
    if (!bootstrapWhen || !effectiveUserId) return;

    const activeRecipeId = recipeIdParam && recipeIdParam > 0 ? recipeIdParam : undefined;
    const hasRecipeParam = Boolean(activeRecipeId);

    // Nếu có recipeId thì chỉ bootstrap một lần cho recipe đó.
    if (hasRecipeParam && consumedRecipeParamRef.current === activeRecipeId) return;

    if (bootstrappingRef.current) return;

    let cancelled = false;

    const run = async () => {
      bootstrappingRef.current = true;
      try {
        await bootstrapUnifiedTimeline(activeRecipeId);

        if (!cancelled && activeRecipeId && onRecipeParamConsumed && consumedRecipeParamRef.current !== activeRecipeId) {
          consumedRecipeParamRef.current = activeRecipeId;
          onRecipeParamConsumed();
        }
      } finally {
        bootstrappingRef.current = false;
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [
    bootstrapUnifiedTimeline,
    bootstrapWhen,
    onRecipeParamConsumed,
    recipeIdParam,
    resolvedUserId,
  ]);

  const ensureUserId = useCallback(() => {
    if (!ensureAuth()) return null;
    const uid = readUserIdFromStorage() ?? getUserId();
    if (!uid) return null;
    setResolvedUserId(uid);
    return uid;
  }, [ensureAuth, getUserId]);

  const handleTimelineScroll = useCallback(
    (container: HTMLDivElement) => {
      const distanceToBottom = container.scrollHeight - (container.scrollTop + container.clientHeight);
      nearBottomRef.current = distanceToBottom < CHAT_SCROLL_BOTTOM_THRESHOLD;

      if (container.scrollTop <= CHAT_SCROLL_TOP_LOAD_THRESHOLD) {
        loadOlderMessages();
      }
    },
    [loadOlderMessages],
  );

  const autoScrollTimeline = useCallback((container: HTMLDivElement) => {
    if (nearBottomRef.current || state.sending) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  }, [state.sending]);

  const handleSend = useCallback(async () => {
    const uid = ensureUserId();
    if (!uid) return;

    const message = input.trim();
    if (!message || state.sending) return;

    setInput("");
    await sendMessage(message);
  }, [ensureUserId, input, sendMessage, state.sending]);

  const handleOpenRecipe = useCallback(async () => {
    const uid = ensureUserId();
    if (!uid) return;

    if (state.currentSession?.activeRecipeId) {
      router.push(`/recipe/${state.currentSession.activeRecipeId}`);
      return;
    }

    if (!activeRecommendation?.recipeName) {
      toast.error("Phiên hiện tại chưa có món đang nấu");
      return;
    }

    try {
      const res = await recipeService.searchRecipes(activeRecommendation.recipeName, uid);
      const items = Array.isArray(res?.data) ? res.data : [];

      if (!items.length) {
        toast.error("Không tìm thấy công thức phù hợp");
        return;
      }

      const matched =
        items.find((item: { recipeId?: number }) => item.recipeId === activeRecommendation.recipeId) || items[0];
      if (!matched?.recipeId) {
        toast.error("Không tìm thấy công thức phù hợp");
        return;
      }

      router.push(`/recipe/${matched.recipeId}`);
    } catch {
      toast.error("Không thể mở công thức từ chat context");
    }
  }, [activeRecommendation?.recipeId, activeRecommendation?.recipeName, ensureUserId, router, state.currentSession?.activeRecipeId]);

  const handleOpenRecipePicker = useCallback(async () => {
    const uid = ensureUserId();
    if (!uid) return;
    await refreshRecommendations();
    setShowRecipePicker(true);
  }, [ensureUserId, refreshRecommendations]);

  const handleSelectRecipe = useCallback(async (item: ChatRecommendation) => {
    if (!window.confirm(`Chọn món "${item.recipeName}" cho phiên hiện tại?`)) return;
    await selectRecipeForCurrentSession(item.recipeId);
    toast.success(`Đã chọn món: ${item.recipeName}`);
    setShowRecipePicker(false);
  }, [selectRecipeForCurrentSession]);

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

  const handleToggleDietNote = useCallback(async (note: DietNote) => {
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
  }, [upsertDietNote]);

  const handleEditDietNote = useCallback(async (note: DietNote) => {
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
  }, [upsertDietNote]);

  const handleDeleteDietNote = useCallback(async (noteId: number) => {
    const ok = await deleteDietNote(noteId);
    if (ok) toast.success("Đã xóa ghi chú");
  }, [deleteDietNote]);

  const handleCompleteSession = useCallback(async () => {
    const uid = ensureUserId();
    if (!uid) return;
    if (!canCompleteSession) {
      toast.error("Cần có hội thoại thực tế trước khi hoàn thành phiên");
      return;
    }

    if (!window.confirm("Xác nhận hoàn thành phiên hiện tại?")) return;
    await completeCurrentSession();
  }, [canCompleteSession, completeCurrentSession, ensureUserId]);

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
    dietNoteLabel,
    setDietNoteLabel,
    dietNoteType,
    setDietNoteType,
    recommendationGroups,
    activeRecommendation,
    dietSummary,
    canCompleteSession,
    handleTimelineScroll,
    autoScrollTimeline,
    handleSend,
    handleOpenRecipe,
    handleOpenRecipePicker,
    handleSelectRecipe,
    handleOpenDietModal,
    handleAddDietNote,
    handleToggleDietNote,
    handleEditDietNote,
    handleDeleteDietNote,
    handleCompleteSession,
  };
}
