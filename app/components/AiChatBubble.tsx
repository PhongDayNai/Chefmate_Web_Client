"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  PanelRightOpen,
  Pencil,
  Send,
  Trash2,
  User as UserIcon,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import ChatMessageContent from "~/features/chat/components/ChatMessageContent";
import { useChatFlow } from "~/features/chat/state/ChatFlowProvider";
import type { ChatRecommendation, DietNote, DietNoteType } from "~/features/chat/types";
import { recipeService } from "~/features/recipes/api/recipeService";

const DIET_NOTE_TYPE_OPTIONS: { value: DietNoteType; label: string }[] = [
  { value: "allergy", label: "Dị ứng" },
  { value: "restriction", label: "Hạn chế" },
  { value: "preference", label: "Sở thích" },
  { value: "health_note", label: "Lưu ý sức khỏe" },
];
const BUBBLE_ANIMATION_MS = 260;

function buildDietSummary(notes: DietNote[]): string {
  const active = notes.filter((note) => note.isActive !== false);
  if (!active.length) return "Không có";
  if (active.length <= 2) return active.map((note) => note.label).join(", ");
  return `${active[0].label}, ${active[1].label} +${active.length - 2}`;
}

export default function AiChatBubble() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isBubbleRendered, setIsBubbleRendered] = useState(false);
  const [input, setInput] = useState("");
  const [showContextActions, setShowContextActions] = useState(true);
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [showDietModal, setShowDietModal] = useState(false);
  const [dietNoteLabel, setDietNoteLabel] = useState("");
  const [dietNoteType, setDietNoteType] = useState<DietNoteType>("allergy");
  const [userId, setUserId] = useState<number | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const {
    state,
    bootstrapUnifiedTimeline,
    sendMessage,
    refreshRecommendations,
    refreshDietNotes,
    selectRecipeForCurrentSession,
    upsertDietNote,
    deleteDietNote,
    completeCurrentSession,
  } = useChatFlow();

  const syncUserFromStorage = () => {
    const rawUserId = localStorage.getItem("userId");
    const parsedUserId = Number(rawUserId);
    const nextUserId = Number.isFinite(parsedUserId) && parsedUserId > 0 ? parsedUserId : null;

    setUserId(nextUserId);
    setUserName(localStorage.getItem("userName"));

    return nextUserId;
  };

  useEffect(() => {
    syncUserFromStorage();
  }, []);

  useEffect(() => {
    if (isOpen && userId && state.timeline.length === 0) {
      bootstrapUnifiedTimeline();
    }
  }, [bootstrapUnifiedTimeline, isOpen, state.timeline.length, userId]);

  useEffect(() => {
    if (isOpen) {
      setIsBubbleRendered(true);
      return;
    }

    if (!isBubbleRendered) return;

    const timeout = setTimeout(() => {
      setIsBubbleRendered(false);
    }, BUBBLE_ANIMATION_MS);

    return () => clearTimeout(timeout);
  }, [isBubbleRendered, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 50);
  }, [isOpen, state.timeline, state.sending]);

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
  const dietSummary = useMemo(() => buildDietSummary(state.dietNotes), [state.dietNotes]);

  const recommendationGroups = useMemo(
    () => [
      { key: "ready", title: "Sẵn sàng nấu", items: state.readyToCook },
      { key: "almost", title: "Gần đủ", items: state.almostReady },
      { key: "unavailable", title: "Chưa đủ", items: state.unavailable },
    ],
    [state.almostReady, state.readyToCook, state.unavailable],
  );

  useEffect(() => {
    if (!isOpen) return;
    setShowContextActions(!hasActiveRecipe);
  }, [hasActiveRecipe, isOpen]);

  const ensureLoggedIn = () => {
    const latestUserId = syncUserFromStorage();
    if (!latestUserId) {
      toast.error("Vui lòng đăng nhập để chat với Bepes!");
      router.push("/auth");
      return null;
    }

    return latestUserId;
  };

  const toggleChat = () => {
    if (!ensureLoggedIn()) return;
    setIsOpen((prev) => !prev);

    if (!isOpen && state.timeline.length === 0) {
      const displayName = userName ? userName.split(" ").pop() : "bạn";
      toast.success(`Xin chào ${displayName}, Bepes đã sẵn sàng hỗ trợ!`);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ensureLoggedIn()) return;

    const message = input.trim();
    if (!message || state.sending) return;

    setInput("");
    await sendMessage(message);
  };

  const handleOpenRecipe = async () => {
    const uid = ensureLoggedIn();
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
  };

  const handleOpenRecipePicker = async () => {
    if (!ensureLoggedIn()) return;
    await refreshRecommendations();
    setShowRecipePicker(true);
  };

  const handleOpenDietModal = async () => {
    if (!ensureLoggedIn()) return;
    await refreshDietNotes();
    setShowDietModal(true);
  };

  const handleSelectRecipe = async (item: ChatRecommendation) => {
    if (!window.confirm(`Chọn món \"${item.recipeName}\" cho phiên hiện tại?`)) return;
    await selectRecipeForCurrentSession(item.recipeId);
    toast.success(`Đã chọn món: ${item.recipeName}`);
    setShowRecipePicker(false);
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
    if (!ensureLoggedIn()) return;
    if (!state.currentSessionId) {
      toast.error("Chưa có phiên chat để hoàn thành");
      return;
    }

    if (!window.confirm("Xác nhận hoàn thành phiên hiện tại?")) return;
    await completeCurrentSession();
  };

  const handleBubbleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const container = timelineRef.current;
    if (!container) return;

    const target = e.target as Node;
    const isWheelInsideTimeline = container.contains(target);

    if (!isWheelInsideTimeline) {
      e.preventDefault();
      container.scrollTop += e.deltaY;
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = container;
    const canScroll = scrollHeight > clientHeight;
    if (!canScroll) {
      e.preventDefault();
      return;
    }

    const isScrollingDown = e.deltaY > 0;
    const isAtTop = scrollTop <= 0;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

    if ((isScrollingDown && isAtBottom) || (!isScrollingDown && isAtTop)) {
      e.preventDefault();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4">
      {isBubbleRendered && (
        <div
          onWheel={handleBubbleWheel}
          className={`h-[560px] w-[380px] overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white shadow-2xl md:w-[420px] flex flex-col transition-all ease-out duration-300 ${
            isOpen ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-6 scale-95 opacity-0"
          }`}
        >
          <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-orange-100 text-[#f59127]">
                <Bot size={22} />
              </div>
              <div>
                <h4 className="leading-none font-black text-gray-800">Bepes AI</h4>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Trợ lý đầu bếp</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/chat")}
                className="p-2 text-gray-400 transition-all hover:text-[#f59127]"
                title="Mở trang chat đầy đủ"
                type="button"
              >
                <PanelRightOpen size={18} />
              </button>

              {!showContextActions ? (
                <button
                  onClick={handleCompleteSession}
                  className="rounded-xl border border-emerald-200 p-2 text-emerald-600 transition-all hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Hoàn thành"
                  disabled={!state.currentSessionId}
                  type="button"
                >
                  <CheckCircle2 size={18} />
                </button>
              ) : null}

              <button onClick={toggleChat} className="p-2 text-gray-400 transition-all hover:text-red-500" type="button">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-shrink-0 border-b border-gray-100 bg-white px-4 pb-3 pt-2">
            <div className="rounded-2xl border border-[#efe3d1] bg-[#fbf3e7] p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-gray-700">
                    Món đang chọn: <span className="font-bold text-gray-900">{activeRecommendation?.recipeName || "Chưa chọn món"}</span>
                  </p>
                  <p className="mt-1 truncate text-xs font-semibold text-gray-700">
                    Ghi chú: <span className="font-bold text-gray-900">{dietSummary}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowContextActions((prev) => !prev)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 hover:border-[#f59127] hover:text-[#f59127]"
                  title={showContextActions ? "Ẩn thao tác" : "Hiện thao tác"}
                >
                  <span
                    className={`transition-transform duration-300 ${showContextActions ? "rotate-0" : "rotate-180"}`}
                  >
                    <ChevronUp size={16} />
                  </span>
                </button>
              </div>

              <div
                className={`grid grid-cols-2 gap-2 overflow-hidden transition-all duration-300 ease-out ${
                  showContextActions ? "mt-3 max-h-32 opacity-100" : "pointer-events-none mt-0 max-h-0 opacity-0"
                }`}
              >
                  <button
                    type="button"
                    onClick={handleOpenRecipePicker}
                    className="rounded-xl bg-[#ffe8c8] px-2 py-2 text-xs font-black text-[#f26f12] transition hover:brightness-95"
                  >
                    Chọn món
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenDietModal}
                    className="rounded-xl bg-[#d4e9f9] px-2 py-2 text-xs font-black text-[#116ca7] transition hover:brightness-95"
                  >
                    Ghi chú
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenRecipe}
                    className="rounded-xl bg-[#ddd7f2] px-2 py-2 text-xs font-black text-[#5c39c8] transition hover:brightness-95"
                  >
                    Xem công thức
                  </button>
                  <button
                    type="button"
                    onClick={handleCompleteSession}
                    disabled={!state.currentSessionId}
                    className="rounded-xl border border-[#7dd59a] bg-[#d3f0dc] px-2 py-2 text-xs font-black text-[#1b7f43] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Hoàn thành
                  </button>
              </div>
            </div>
          </div>

          <div
            ref={timelineRef}
            className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain bg-white p-5"
          >
            {state.timeline.length === 0 && !state.sending ? (
              <div className="pt-12 text-center text-sm text-gray-400">Nhấn gửi để bắt đầu cuộc trò chuyện với Bepes.</div>
            ) : (
              state.timeline.map((msg, idx) => (
                <div key={msg.chatMessageId ?? msg.tempId ?? idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border shadow-sm ${
                      msg.role === "user"
                        ? "border-gray-700 bg-gray-800 text-white"
                        : "border-orange-100 bg-orange-50 text-[#f59127]"
                    }`}
                  >
                    {msg.role === "user" ? <UserIcon size={14} /> : <Bot size={14} />}
                  </div>
                  <div
                    className={`max-w-[80%] whitespace-pre-wrap rounded-2xl p-4 text-sm leading-relaxed font-medium shadow-sm ${
                      msg.role === "user"
                        ? "rounded-tr-none bg-gray-900 text-white"
                        : "rounded-tl-none bg-gray-100 text-gray-800"
                    } ${msg.isPending ? "opacity-70" : ""}`}
                  >
                    <ChatMessageContent role={msg.role} content={msg.content} />
                  </div>
                </div>
              ))
            )}

            {state.sending && (
              <div className="flex animate-pulse gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-orange-100 bg-orange-50 text-[#f59127]">
                  <Loader2 size={14} className="animate-spin" />
                </div>
                <div className="max-w-[80%] rounded-2xl rounded-tl-none border border-gray-100 bg-gray-50 p-4 text-sm font-medium italic text-gray-400">
                  Bepes đang soạn câu trả lời{state.aiBusyRetryCount > 0 ? ` (retry ${state.aiBusyRetryCount}/3)` : ""}...
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          <div className="flex-shrink-0 border-t border-gray-100 bg-gray-50 p-4">
            <form onSubmit={handleSend} className="group relative">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hỏi Bepes công thức nấu ăn..."
                className="w-full rounded-2xl border-2 border-transparent bg-white p-4 pr-14 text-sm font-medium text-gray-900 shadow-sm outline-none transition-all focus:border-orange-200"
              />
              <button
                type="submit"
                disabled={state.sending || !input.trim()}
                className="absolute right-1.5 bottom-1.5 top-1.5 rounded-xl bg-[#f59127] px-4 font-black text-white transition-all hover:scale-105 disabled:opacity-30"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        onClick={toggleChat}
        className={`relative z-[101] flex h-16 w-16 transform items-center justify-center rounded-full text-white shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${
          isOpen ? "rotate-180 bg-gray-900" : "bg-[#f59127]"
        }`}
        type="button"
      >
        {isOpen ? <X size={28} /> : <Bot size={32} />}
        {!isOpen && !userId && (
          <span className="absolute -right-1 -top-1 flex h-6 w-6">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[10px] font-black">!</span>
          </span>
        )}
      </button>

      {showRecipePicker ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[78vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="text-lg font-black text-gray-900">Chọn món cho phiên chat</h3>
              <button type="button" onClick={() => setShowRecipePicker(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto p-4">
              {recommendationGroups.some((group) => group.items.length > 0) ? (
                recommendationGroups.map((group) => (
                  <div key={group.key} className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                    <p className="mb-2 text-xs font-black uppercase tracking-wide text-gray-500">{group.title}</p>
                    {group.items.length ? (
                      <div className="space-y-2">
                        {group.items.map((item) => (
                          <button
                            key={`${group.key}-${item.recipeId}`}
                            type="button"
                            onClick={() => handleSelectRecipe(item)}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-left transition hover:border-[#f59127]"
                          >
                            <p className="text-sm font-bold text-gray-800">{item.recipeName}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {item.cookingTime || "Chưa rõ thời gian"} • {item.ration || 0} khẩu phần
                            </p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-xl bg-white px-3 py-2 text-xs text-gray-400">Hiện chưa có món ở nhóm này.</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="py-10 text-center text-sm text-gray-400">Chưa có gợi ý món nào từ tủ lạnh.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showDietModal ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[78vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="text-lg font-black text-gray-900">Ghi chú ăn uống</h3>
              <button type="button" onClick={() => setShowDietModal(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddDietNote} className="grid grid-cols-1 gap-2 border-b border-gray-100 p-4 sm:grid-cols-4">
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
                placeholder="Ví dụ: Không ăn cay"
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 sm:col-span-2"
              />
              <button className="rounded-xl bg-[#f59127] px-4 py-2 text-sm font-black text-white hover:bg-[#e07d16]">
                Thêm
              </button>
            </form>

            <div className="space-y-2 overflow-y-auto p-4">
              {state.dietNotes.length ? (
                state.dietNotes.map((note) => (
                  <div
                    key={note.noteId}
                    className={`rounded-2xl border px-3 py-2 ${note.isActive === false ? "border-gray-200 bg-gray-50" : "border-orange-100 bg-orange-50/40"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-gray-500">{note.noteType}</p>
                        <p className="mt-0.5 text-sm font-bold text-gray-800">{note.label}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleDietNote(note)}
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                          title={note.isActive === false ? "Bật ghi chú" : "Tắt ghi chú"}
                        >
                          <CheckCircle2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditDietNote(note)}
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-orange-100 hover:text-[#f59127]"
                          title="Sửa ghi chú"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const ok = await deleteDietNote(note.noteId);
                            if (ok) toast.success("Đã xóa ghi chú");
                          }}
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                          title="Xóa ghi chú"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-gray-400">Chưa có ghi chú ăn uống nào.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
