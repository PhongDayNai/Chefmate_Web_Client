"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bot,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  Trash2,
  User as UserIcon,
  Utensils,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import ChatMessageContent from "~/features/chat/components/ChatMessageContent";
import NeedLoginCard from "~/features/chat/components/NeedLoginCard";
import { useChatFlow } from "~/features/chat/state/ChatFlowProvider";
import type { ChatRecommendation, DietNote, DietNoteType } from "~/features/chat/types";
import { recipeService } from "~/features/recipes/api/recipeService";
import { useAuthGuard } from "~/hooks/useAuthGuard";

const SCROLL_TOP_LOAD_THRESHOLD = 80;
const SCROLL_BOTTOM_THRESHOLD = 120;

type RecommendationGroupTone = "ready" | "almost" | "unavailable";

interface RecommendationGroup {
  key: RecommendationGroupTone;
  title: string;
  description: string;
  items: ChatRecommendation[];
}

const DIET_NOTE_TYPE_OPTIONS: { value: DietNoteType; label: string }[] = [
  { value: "allergy", label: "Dị ứng" },
  { value: "restriction", label: "Hạn chế" },
  { value: "preference", label: "Sở thích" },
  { value: "health_note", label: "Lưu ý sức khỏe" },
];

function formatDividerTime(createdAt?: string): string {
  if (!createdAt) return "";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildDietSummary(notes: DietNote[]): string {
  const active = notes.filter((note) => note.isActive !== false);
  if (!active.length) return "Không có";
  if (active.length <= 2) return active.map((note) => note.label).join(", ");
  return `${active[0].label}, ${active[1].label} +${active.length - 2}`;
}

function recommendationToneClasses(tone: RecommendationGroupTone): string {
  if (tone === "ready") return "border-emerald-200 bg-emerald-50";
  if (tone === "almost") return "border-amber-200 bg-amber-50";
  return "border-slate-200 bg-slate-50";
}

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { requireAuth } = useAuthGuard();

  const recipeIdParam = Number(searchParams.get("recipeId") || -1);

  const {
    state,
    getUserId,
    bootstrapUnifiedTimeline,
    newSession,
    openSession,
    sendMessage,
    loadOlderMessages,
    loadSessions,
    renameSession,
    deleteSession,
    refreshRecommendations,
    refreshDietNotes,
    upsertDietNote,
    deleteDietNote,
    selectRecipeForCurrentSession,
    completeCurrentSession,
  } = useChatFlow();

  const [input, setInput] = useState("");
  const [showSessionsPanel, setShowSessionsPanel] = useState(false);
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [showDietModal, setShowDietModal] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [pendingRecipeSelection, setPendingRecipeSelection] = useState<ChatRecommendation | null>(null);
  const [dietNoteLabel, setDietNoteLabel] = useState("");
  const [dietNoteType, setDietNoteType] = useState<DietNoteType>("allergy");

  const timelineRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const prevFirstKeyRef = useRef<string | null>(null);
  const prevLastKeyRef = useRef<string | null>(null);
  const bootstrapKeyRef = useRef<string | null>(null);

  const userId = getUserId();
  const isLoggedIn = Boolean(userId);

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

  const dietSummary = useMemo(() => buildDietSummary(state.dietNotes), [state.dietNotes]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const activeRecipeId = recipeIdParam > 0 ? recipeIdParam : undefined;
    const bootstrapKey = activeRecipeId ? `recipe:${activeRecipeId}` : "plain";
    if (bootstrapKeyRef.current === bootstrapKey) return;

    let cancelled = false;

    const runBootstrap = async () => {
      bootstrapKeyRef.current = bootstrapKey;
      await bootstrapUnifiedTimeline(activeRecipeId);

      // Consume recipeId query so hard refresh will not re-attach stale recipe context.
      if (!cancelled && activeRecipeId) {
        bootstrapKeyRef.current = "plain";
        router.replace("/chat");
      }
    };

    runBootstrap();

    return () => {
      cancelled = true;
    };
  }, [bootstrapUnifiedTimeline, isLoggedIn, recipeIdParam, router]);

  useEffect(() => {
    const container = timelineRef.current;
    if (!container) return;

    const handleScroll = () => {
      const distanceToBottom = container.scrollHeight - (container.scrollTop + container.clientHeight);
      nearBottomRef.current = distanceToBottom < SCROLL_BOTTOM_THRESHOLD;

      if (container.scrollTop <= SCROLL_TOP_LOAD_THRESHOLD) {
        loadOlderMessages();
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [loadOlderMessages]);

  useEffect(() => {
    const container = timelineRef.current;
    if (!container) return;

    const firstMessage = state.timeline[0];
    const lastMessage = state.timeline[state.timeline.length - 1];
    const firstKey = firstMessage ? String(firstMessage.chatMessageId ?? firstMessage.tempId ?? "") : null;
    const lastKey = lastMessage ? String(lastMessage.chatMessageId ?? lastMessage.tempId ?? "") : null;

    const isPrepend =
      prevFirstKeyRef.current &&
      prevLastKeyRef.current &&
      firstKey !== prevFirstKeyRef.current &&
      lastKey === prevLastKeyRef.current;

    if (!isPrepend && (nearBottomRef.current || state.sending)) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }

    prevFirstKeyRef.current = firstKey;
    prevLastKeyRef.current = lastKey;
  }, [state.sending, state.timeline]);

  const handleOpenSessionsPanel = useCallback(async () => {
    if (!requireAuth()) return;
    await loadSessions();
    setShowSessionsPanel(true);
  }, [loadSessions, requireAuth]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireAuth()) return;

    const message = input.trim();
    if (!message || state.sending) return;

    setInput("");
    await sendMessage(message);
  };

  const handleRenameSession = async (sessionId: number, currentTitle: string) => {
    const nextTitle = window.prompt("Nhập tên hội thoại mới", currentTitle);
    if (!nextTitle || !nextTitle.trim()) return;

    const success = await renameSession(sessionId, nextTitle);
    if (success) toast.success("Đã đổi tên hội thoại");
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (!window.confirm("Bạn có chắc muốn xóa hội thoại này?")) return;

    const success = await deleteSession(sessionId);
    if (success) toast.success("Đã xóa hội thoại");
  };

  const handleOpenRecipe = useCallback(async () => {
    if (!requireAuth()) return;

    if (state.currentSession?.activeRecipeId) {
      router.push(`/recipe/${state.currentSession.activeRecipeId}`);
      return;
    }

    if (!activeRecommendation?.recipeName) {
      toast.error("Phiên hiện tại chưa có món đang nấu");
      return;
    }

    try {
      const res = await recipeService.searchRecipes(activeRecommendation.recipeName, userId || 0);
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
  }, [activeRecommendation?.recipeId, activeRecommendation?.recipeName, requireAuth, router, state.currentSession?.activeRecipeId, userId]);

  const handleConfirmSelectRecipe = async () => {
    if (!pendingRecipeSelection) return;
    await selectRecipeForCurrentSession(pendingRecipeSelection.recipeId);
    toast.success(`Đã chọn món: ${pendingRecipeSelection.recipeName}`);
    setPendingRecipeSelection(null);
    setShowRecipePicker(false);
  };

  const handleOpenRecipePicker = async () => {
    if (!requireAuth()) return;
    await refreshRecommendations();
    setShowRecipePicker(true);
  };

  const handleOpenDietModal = async () => {
    if (!requireAuth()) return;
    await refreshDietNotes();
    setShowDietModal(true);
  };

  const handleAddDietNote = async (e: React.FormEvent) => {
    e.preventDefault();
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
  };

  const handleToggleDietNote = async (note: DietNote) => {
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
  };

  const handleEditDietNote = async (note: DietNote) => {
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
  };

  const handleCompleteSession = async () => {
    setShowCompleteDialog(false);
    await completeCurrentSession();
  };

  const handleCreateSession = () => {
    if (!requireAuth()) return;
    newSession();
    toast.success("Đã tạo hội thoại mới");
  };

  return (
    <div className="flex h-[calc(100vh-64px)] justify-center bg-[#f3f3f5] px-2 py-2 sm:px-4 sm:py-4">
      <section className="relative flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-[#f3f3f5] shadow-sm">
        <div className="rounded-[1.8rem] bg-gradient-to-r from-[#ff7a16] via-[#f69035] to-[#ffb467] px-5 py-4 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <Bot size={22} />
              </div>
              <div>
                <h1 className="text-3xl font-black leading-none tracking-tight">Bepes</h1>
                <p className="mt-1 text-xs font-semibold text-white/80">Trợ lý nấu ăn theo pantry và khẩu vị</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenSessionsPanel}
                className="rounded-full bg-white/20 p-2.5 transition hover:bg-white/30"
                title="Lịch sử hội thoại"
              >
                <MessageSquare size={18} />
              </button>
              <button
                onClick={handleCreateSession}
                className="rounded-full bg-white/20 p-2.5 transition hover:bg-white/30"
                title="Tạo phiên chat mới"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 pt-4">{!isLoggedIn ? <NeedLoginCard /> : null}</div>

        <div className="px-4 pt-3">
          <div className="rounded-[1.8rem] border border-[#ded4c5] bg-[#f2ece2] p-4 text-[#263444] shadow-sm">
            <p className="text-[20px] leading-relaxed">
              Món đang chọn: {" "}
              <span className="font-semibold">
                {activeRecommendation?.recipeName || "Chưa chọn món cho cuộc trò chuyện hiện tại"}
              </span>
            </p>
            <p className="mt-2 text-[18px] leading-relaxed">
              Ghi chú ăn uống: <span className="font-semibold">{dietSummary}</span>
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                onClick={handleOpenRecipePicker}
                className="rounded-full bg-[#ffe8c8] px-5 py-3.5 text-lg font-black text-[#f26f12] transition hover:brightness-95"
              >
                Chọn món
              </button>
              <button
                onClick={handleOpenDietModal}
                className="rounded-full bg-[#d4e9f9] px-5 py-3.5 text-lg font-black text-[#116ca7] transition hover:brightness-95"
              >
                Ghi chú
              </button>
              <button
                onClick={handleOpenRecipe}
                className="rounded-full bg-[#ddd7f2] px-5 py-3.5 text-lg font-black text-[#5c39c8] transition hover:brightness-95"
              >
                Xem công thức
              </button>
              <button
                onClick={() => setShowCompleteDialog(true)}
                disabled={!state.currentSessionId}
                className="rounded-full border border-[#7dd59a] bg-[#d3f0dc] px-5 py-3.5 text-lg font-black text-[#1b7f43] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Hoàn thành
              </button>
            </div>
          </div>
        </div>

        <div ref={timelineRef} className="flex-1 overflow-y-auto px-4 pb-3 pt-4 custom-scrollbar">
          {state.loadingTimeline && state.timeline.length > 0 ? (
            <div className="mb-3 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-[#f59127]" />
            </div>
          ) : null}

          {state.loadingTimeline && state.timeline.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#f59127]" />
            </div>
          ) : null}

          {state.timeline.length === 0 && !state.loadingTimeline ? (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-xl rounded-[1.8rem] border border-[#eadbc1] bg-[#f7e7cf] p-6 text-[#1f2937] shadow-sm">
                <p className="text-2xl font-black text-[#f57a14]">Bepes</p>
                <p className="mt-3 text-[32px] leading-snug font-bold">Xin chào anh, em là Bepes - trợ lý nấu ăn của ChefMate.</p>
                <p className="mt-2 text-lg leading-relaxed text-[#344455]">
                  Em có thể gợi ý món theo nguyên liệu hiện có, hướng dẫn từng bước nấu và điều chỉnh theo dị ứng/hạn
                  chế ăn uống của anh.
                </p>
              </div>
            </div>
          ) : null}

          <div className="space-y-4 pb-2">
            {state.timeline.map((msg, index) => {
              const previous = state.timeline[index - 1];
              const showDivider = msg.isSessionStart || (previous && previous.chatSessionId !== msg.chatSessionId);

              return (
                <div key={msg.chatMessageId ?? msg.tempId ?? index} className="space-y-3">
                  {showDivider ? (
                    <div className="flex items-center gap-3 py-1">
                      <span className="h-px flex-1 bg-[#d2d6df]" />
                      <span className="text-xs font-semibold text-[#9ca3af]">
                        Cuộc trò chuyện mới · {formatDividerTime(msg.createdAt)}
                      </span>
                      <span className="h-px flex-1 bg-[#d2d6df]" />
                    </div>
                  ) : null}

                  <div className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div
                      className={`mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                        msg.role === "user"
                          ? "bg-[#ff8f2a] text-white"
                          : "border border-[#ebd7b8] bg-[#fff4e3] text-[#f57a14]"
                      }`}
                    >
                      {msg.role === "user" ? <UserIcon size={15} /> : <Bot size={15} />}
                    </div>

                    <div
                      className={`max-w-[85%] rounded-[1.6rem] px-4 py-3 text-[19px] leading-relaxed shadow-sm whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "rounded-tr-md bg-[#ff8f2a] text-white"
                          : "rounded-tl-md border border-[#ebd9c3] bg-[#f7e7cf] text-[#1f2937]"
                      } ${msg.isPending ? "opacity-70" : ""}`}
                    >
                      {msg.role === "assistant" ? <p className="mb-1 text-2xl font-black text-[#f57a14]">Bepes</p> : null}
                      <ChatMessageContent role={msg.role} content={msg.content} />
                    </div>
                  </div>
                </div>
              );
            })}

            {state.sending ? (
              <div className="flex gap-3">
                <div className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#ebd7b8] bg-[#fff4e3] text-[#f57a14]">
                  <Loader2 size={15} className="animate-spin" />
                </div>
                <div className="rounded-[1.6rem] rounded-tl-md border border-[#ebd9c3] bg-[#f7e7cf] px-4 py-3 text-base font-medium italic text-[#7b7f8a]">
                  Bepes đang soạn phản hồi{state.aiBusyRetryCount > 0 ? ` (retry ${state.aiBusyRetryCount}/3)` : ""}...
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="bg-[#f3f3f5] px-4 pb-4 pt-2">
          <form
            onSubmit={handleSend}
            className="mx-auto flex max-w-4xl items-center gap-3 rounded-[2.2rem] border border-[#e4e6ed] bg-white p-2 pl-5 shadow-lg"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhắn Bepes..."
              className="h-11 flex-1 bg-transparent text-[18px] text-[#1f2937] placeholder:text-[#a1a7b6] outline-none"
            />
            <button
              type="submit"
              disabled={state.sending || !input.trim() || !isLoggedIn}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ff7a16] text-white transition hover:bg-[#ea6f12] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Send size={19} />
            </button>
          </form>
        </div>
      </section>

      {showSessionsPanel ? (
        <div className="fixed inset-0 z-[110] bg-black/40">
          <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-black text-gray-900">Lịch sử phiên chat</h3>
              <button onClick={() => setShowSessionsPanel(false)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <button
              onClick={() => {
                handleCreateSession();
                setShowSessionsPanel(false);
              }}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 px-4 py-3 font-bold text-gray-600 transition hover:border-[#f59127] hover:text-[#f59127]"
            >
              <Plus size={18} /> Tạo phiên mới
            </button>

            <div className="max-h-[calc(100vh-160px)] space-y-2 overflow-y-auto pr-1">
              {state.sessions.length ? (
                state.sessions.map((session) => (
                  <div
                    key={session.chatSessionId}
                    className={`rounded-2xl border p-3 ${
                      state.currentSessionId === session.chatSessionId
                        ? "border-orange-200 bg-orange-50"
                        : "border-gray-100 bg-white"
                    }`}
                  >
                    <button
                      className="flex w-full items-start gap-3 text-left"
                      onClick={async () => {
                        await openSession(session.chatSessionId);
                        setShowSessionsPanel(false);
                      }}
                    >
                      <MessageSquare
                        size={16}
                        className={state.currentSessionId === session.chatSessionId ? "text-[#f59127]" : "text-gray-400"}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-gray-800">{session.title || "Bepes"}</p>
                        <p className="mt-0.5 text-xs text-gray-400">Session #{session.chatSessionId}</p>
                      </div>
                    </button>

                    <div className="mt-2 flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleRenameSession(session.chatSessionId, session.title || "Bepes")}
                        className="rounded-lg p-1.5 text-gray-400 transition hover:bg-orange-100 hover:text-[#f59127]"
                        title="Đổi tên"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteSession(session.chatSessionId)}
                        className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                        title="Xóa"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-16 text-center text-sm text-gray-400">Chưa có phiên hội thoại nào.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showRecipePicker ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[84vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-xl font-black text-gray-900">Chọn món cho phiên hiện tại</h3>
                <p className="mt-1 text-sm text-gray-500">Chọn món để Bepes trả lời đúng ngữ cảnh món ăn của bạn.</p>
              </div>
              <button onClick={() => setShowRecipePicker(false)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto p-5">
              {recommendationGroups.some((group) => group.items.length > 0) ? (
                recommendationGroups.map((group) => (
                  <div key={group.key} className={`rounded-2xl border p-4 ${recommendationToneClasses(group.key)}`}>
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h4 className="text-base font-black text-gray-800">{group.title}</h4>
                        <p className="text-xs text-gray-500">{group.description}</p>
                      </div>
                      <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-gray-600">
                        {group.items.length} món
                      </span>
                    </div>

                    {group.items.length ? (
                      <div className="space-y-2">
                        {group.items.map((item) => {
                          const isActiveRecipe = state.currentSession?.activeRecipeId === item.recipeId;

                          return (
                            <button
                              key={`${group.key}-${item.recipeId}`}
                              onClick={() => setPendingRecipeSelection(item)}
                              className="flex w-full items-start justify-between gap-4 rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-left transition hover:border-[#f59127] hover:bg-white"
                            >
                              <div>
                                <p className="font-bold text-gray-800">{item.recipeName}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                  <span className="inline-flex items-center gap-1">
                                    <Clock3 size={12} /> {item.cookingTime || "Chưa rõ thời gian"}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <Utensils size={12} /> {item.ration || 0} khẩu phần
                                  </span>
                                  {typeof item.missingIngredientsCount === "number" ? (
                                    <span>Thiếu {item.missingIngredientsCount} nguyên liệu</span>
                                  ) : null}
                                </div>
                              </div>

                              {isActiveRecipe ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
                                  <CheckCircle2 size={12} /> Đang chọn
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="rounded-xl bg-white/70 px-4 py-3 text-sm text-gray-500">Hiện chưa có món ở nhóm này.</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="py-16 text-center text-sm text-gray-400">Chưa có gợi ý món nào từ tủ lạnh.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {pendingRecipeSelection ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-black text-gray-900">Xác nhận chọn món</h3>
            <p className="mt-3 text-sm text-gray-600">
              Bạn muốn đặt <span className="font-bold text-gray-800">{pendingRecipeSelection.recipeName}</span> làm món
              đang nấu cho phiên chat hiện tại?
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setPendingRecipeSelection(null)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmSelectRecipe}
                className="rounded-xl bg-[#f59127] px-4 py-2.5 font-black text-white hover:bg-[#e07d16]"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDietModal ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[84vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-xl font-black text-gray-900">Ghi chú ăn uống</h3>
                <p className="mt-1 text-sm text-gray-500">Thêm hoặc chỉnh sửa dị ứng, hạn chế và preference để Bepes gợi ý đúng hơn.</p>
              </div>
              <button onClick={() => setShowDietModal(false)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddDietNote} className="grid grid-cols-1 gap-2 border-b border-gray-100 p-5 sm:grid-cols-4">
              <select
                value={dietNoteType}
                onChange={(e) => setDietNoteType(e.target.value as DietNoteType)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold"
              >
                {DIET_NOTE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                value={dietNoteLabel}
                onChange={(e) => setDietNoteLabel(e.target.value)}
                placeholder="Ví dụ: Hạn chế đồ chiên"
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 sm:col-span-2"
              />
              <button className="rounded-xl bg-[#f59127] px-4 py-2 text-sm font-black text-white hover:bg-[#e07d16]">
                Thêm
              </button>
            </form>

            <div className="space-y-2 overflow-y-auto p-5">
              {state.dietNotes.length ? (
                state.dietNotes.map((note) => (
                  <div
                    key={note.noteId}
                    className={`rounded-2xl border px-4 py-3 ${note.isActive === false ? "border-gray-200 bg-gray-50" : "border-orange-100 bg-orange-50/40"}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-gray-500">{note.noteType}</p>
                        <p className="mt-1 font-bold text-gray-800">{note.label}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          Trạng thái: {note.isActive === false ? "Đang tắt" : "Đang áp dụng"}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleDietNote(note)}
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                          title={note.isActive === false ? "Bật ghi chú" : "Tắt ghi chú"}
                        >
                          <CheckCircle2 size={16} />
                        </button>
                        <button
                          onClick={() => handleEditDietNote(note)}
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-orange-100 hover:text-[#f59127]"
                          title="Sửa ghi chú"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={async () => {
                            const ok = await deleteDietNote(note.noteId);
                            if (ok) toast.success("Đã xóa ghi chú");
                          }}
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                          title="Xóa ghi chú"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-16 text-center text-sm text-gray-400">Chưa có ghi chú ăn uống nào.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showCompleteDialog ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-black text-gray-900">Xác nhận hoàn thành món</h3>
            <p className="mt-3 text-sm text-gray-600">
              Bepes sẽ chốt phiên hiện tại với action <span className="font-semibold">complete_and_deduct</span> và làm mới
              timeline để bạn tiếp tục cuộc trò chuyện mới.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowCompleteDialog(false)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleCompleteSession}
                className="rounded-xl bg-[#f59127] px-4 py-2.5 font-black text-white hover:bg-[#e07d16]"
              >
                Xác nhận hoàn thành
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
