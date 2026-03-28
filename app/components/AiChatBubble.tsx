"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bot,
  CheckCircle2,
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
import { formatSessionTimeLabel, shouldShowSessionDivider } from "~/features/chat/utils/chatTime";
import {
  DIET_NOTE_TYPE_OPTIONS,
  useChatViewModel,
} from "~/features/chat/hooks/useChatViewModel";
import type { DietNoteType } from "~/features/chat/types";

const BUBBLE_ANIMATION_MS = 260;

export default function AiChatBubble() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isBubbleRendered, setIsBubbleRendered] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);

  const ensureLoggedIn = () => {
    const rawUserId = localStorage.getItem("userId");
    const parsedUserId = Number(rawUserId);
    const nextUserId = Number.isFinite(parsedUserId) && parsedUserId > 0 ? parsedUserId : null;

    setUserName(localStorage.getItem("userName"));

    if (!nextUserId) {
      toast.error("Vui lòng đăng nhập để chat với Bepes!");
      router.push("/auth");
      return null;
    }

    return nextUserId;
  };

  const {
    state,
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
  } = useChatViewModel({
    ensureAuth: () => Boolean(ensureLoggedIn()),
    bootstrapWhen: isOpen,
    syncContextActionsWhen: isOpen,
  });

  useEffect(() => {
    setUserName(localStorage.getItem("userName"));
  }, []);

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
    if (pathname === "/chat") {
      setIsOpen(false);
      setIsBubbleRendered(false);
    }
  }, [pathname]);

  useEffect(() => {
    const container = timelineRef.current;
    if (!container || !isOpen) return;

    const onScroll = () => {
      handleTimelineScroll(container);
    };

    container.addEventListener("scroll", onScroll);
    return () => container.removeEventListener("scroll", onScroll);
  }, [handleTimelineScroll, isOpen]);

  useEffect(() => {
    const container = timelineRef.current;
    if (!container || !isOpen) return;
    autoScrollTimeline(container);
  }, [autoScrollTimeline, isOpen, state.sending, state.timeline]);

  const toggleChat = () => {
    const uid = ensureLoggedIn();
    if (!uid) return;

    setIsOpen((prev) => !prev);

    if (!isOpen && state.timeline.length === 0) {
      const displayName = userName ? userName.split(" ").pop() : "bạn";
      toast.success(`Xin chào ${displayName}, Bepes đã sẵn sàng hỗ trợ!`);
    }
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

  if (pathname === "/chat") return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4">
      {isBubbleRendered && (
        <div
          onWheel={handleBubbleWheel}
          className={`h-[750px] max-h-[calc(100dvh-2rem)] w-[380px] overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white shadow-2xl md:w-[420px] flex flex-col transition-all ease-out duration-300 ${
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
                  onClick={() => void handleCompleteSession()}
                  className="rounded-xl border border-emerald-200 p-2 text-emerald-600 transition-all hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Hoàn thành"
                  disabled={!canCompleteSession}
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
                  onClick={() => void handleOpenRecipePicker()}
                  className="rounded-xl bg-[#ffe8c8] px-2 py-2 text-xs font-black text-[#f26f12] transition hover:brightness-95"
                >
                  Chọn món
                </button>
                <button
                  type="button"
                  onClick={() => void handleOpenDietModal()}
                  className="rounded-xl bg-[#d4e9f9] px-2 py-2 text-xs font-black text-[#116ca7] transition hover:brightness-95"
                >
                  Ghi chú
                </button>
                <button
                  type="button"
                  onClick={() => void handleOpenRecipe()}
                  className="rounded-xl bg-[#ddd7f2] px-2 py-2 text-xs font-black text-[#5c39c8] transition hover:brightness-95"
                >
                  Xem công thức
                </button>
                <button
                  type="button"
                  onClick={() => void handleCompleteSession()}
                  disabled={!canCompleteSession}
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
              state.timeline.map((msg, idx) => {
                const renderKey = msg.chatMessageId
                  ? `session:${msg.chatSessionId ?? "none"}:message:${msg.chatMessageId}`
                  : msg.tempId
                    ? `temp:${msg.tempId}`
                    : `fallback:${msg.chatSessionId ?? "none"}:${msg.role}:${msg.createdAt}:${idx}`;
                const showSessionDivider = shouldShowSessionDivider(state.timeline, idx);
                const sessionTimeLabel = formatSessionTimeLabel(msg.createdAt);

                return (
                  <Fragment key={renderKey}>
                    {showSessionDivider ? (
                      <div className="flex items-center gap-2 py-1">
                        <div className="h-px flex-1 bg-gray-200" />
                        <span className="text-[11px] font-semibold text-gray-400">{sessionTimeLabel}</span>
                        <div className="h-px flex-1 bg-gray-200" />
                      </div>
                    ) : null}
                    <div className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border shadow-sm ${
                          msg.role === "user"
                            ? "border-[#e07d16] bg-[#ff8f2a] text-white"
                            : "border-orange-100 bg-orange-50 text-[#f59127]"
                        }`}
                      >
                        {msg.role === "user" ? <UserIcon size={14} /> : <Bot size={14} />}
                      </div>
                      <div
                        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl p-4 text-sm leading-relaxed font-medium shadow-sm ${
                          msg.role === "user"
                            ? "rounded-tr-none bg-[#ff8f2a] text-white"
                            : "rounded-tl-none bg-gray-100 text-gray-800"
                        } ${msg.isPending ? "opacity-70" : ""}`}
                      >
                        <ChatMessageContent role={msg.role} content={msg.content} />
                      </div>
                    </div>
                  </Fragment>
                );
              })
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
          </div>

          <div className="flex-shrink-0 border-t border-gray-100 bg-gray-50 p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSend();
              }}
              className="group relative"
            >
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
          isOpen ? "rotate-180 bg-[#ea6f12]" : "bg-[#f59127]"
        }`}
        type="button"
      >
        {isOpen ? <X size={28} /> : <Bot size={32} />}
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
                        {group.items.map((item, index) => (
                          <button
                            key={`${group.key}-${item.recipeId}-${index}`}
                            type="button"
                            onClick={() => void handleSelectRecipe(item)}
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

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleAddDietNote();
              }}
              className="grid grid-cols-1 gap-2 border-b border-gray-100 p-4 sm:grid-cols-4"
            >
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
                          onClick={() => void handleToggleDietNote(note)}
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                          title={note.isActive === false ? "Bật ghi chú" : "Tắt ghi chú"}
                        >
                          <CheckCircle2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleEditDietNote(note)}
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-orange-100 hover:text-[#f59127]"
                          title="Sửa ghi chú"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteDietNote(note.noteId)}
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
