"use client";

import { Fragment, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronUp,
  Clock3,
  Loader2,
  Pencil,
  Send,
  Trash2,
  User as UserIcon,
  Utensils,
  X,
} from "lucide-react";
import ChatMessageContent from "~/features/chat/components/ChatMessageContent";
import NeedLoginCard from "~/features/chat/components/NeedLoginCard";
import { formatSessionTimeLabel, shouldShowSessionDivider } from "~/features/chat/utils/chatTime";
import {
  DIET_NOTE_TYPE_OPTIONS,
  recommendationToneClasses,
  useChatViewModel,
} from "~/features/chat/hooks/useChatViewModel";
import type { DietNoteType } from "~/features/chat/types";
import { useAuthGuard } from "~/hooks/useAuthGuard";

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { requireAuth } = useAuthGuard();
  const recipeIdParam = Number(searchParams.get("recipeId") || -1);
  const handleRecipeParamConsumed = useCallback(() => {
    router.replace("/chat");
  }, [router]);

  const {
    state,
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
  } = useChatViewModel({
    ensureAuth: requireAuth,
    recipeIdParam,
    bootstrapWhen: true,
    syncContextActionsWhen: true,
    onRecipeParamConsumed: handleRecipeParamConsumed,
  });

  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = timelineRef.current;
    if (!container) return;

    const onScroll = () => {
      handleTimelineScroll(container);
    };

    container.addEventListener("scroll", onScroll);
    return () => container.removeEventListener("scroll", onScroll);
  }, [handleTimelineScroll]);

  useEffect(() => {
    const container = timelineRef.current;
    if (!container) return;
    autoScrollTimeline(container);
  }, [autoScrollTimeline, state.sending, state.timeline]);

  return (
    <div className="flex h-[calc(100vh-64px)] justify-center bg-[#f3f3f5] px-2 py-2 sm:px-4 sm:py-4">
      <section className="relative flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-[#f3f3f5] shadow-sm">
        <div className="rounded-[1.8rem] bg-gradient-to-r from-[#ff7a16] via-[#f69035] to-[#ffb467] px-5 py-4 text-white shadow-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-full bg-white/20 p-2.5 transition hover:bg-white/30"
              title="Quay lại"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <Bot size={22} />
            </div>
            <div>
              <h1 className="text-3xl font-black leading-none tracking-tight">Bepes</h1>
              <p className="mt-1 text-xs font-semibold text-white/80">Trợ lý nấu ăn theo tủ lạnh và khẩu vị</p>
            </div>
          </div>
        </div>

        <div className="px-4 pt-4">{!isLoggedIn ? <NeedLoginCard /> : null}</div>

        <div className="px-4 pt-3">
          <div className="rounded-[1.8rem] border border-[#ded4c5] bg-[#f2ece2] p-4 text-[#263444] shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[18px] font-semibold leading-relaxed">
                  Món đang chọn:{" "}
                  <span className="font-black">
                    {activeRecommendation?.recipeName || "Chưa chọn món cho cuộc trò chuyện hiện tại"}
                  </span>
                </p>
                <p className="mt-1 truncate text-base font-semibold leading-relaxed">
                  Ghi chú ăn uống: <span className="font-black">{dietSummary}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowContextActions((prev) => !prev)}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-500 hover:border-[#f59127] hover:text-[#f59127]"
                title={showContextActions ? "Ẩn thao tác" : "Hiện thao tác"}
              >
                <span className={`transition-transform duration-300 ${showContextActions ? "rotate-0" : "rotate-180"}`}>
                  <ChevronUp size={18} />
                </span>
              </button>
            </div>

            <div
              className={`grid grid-cols-1 gap-3 overflow-hidden transition-all duration-300 ease-out sm:grid-cols-2 ${
                showContextActions ? "mt-4 max-h-40 opacity-100" : "pointer-events-none mt-0 max-h-0 opacity-0"
              }`}
            >
              <button
                onClick={() => void handleOpenRecipePicker()}
                className="rounded-full bg-[#ffe8c8] px-5 py-3.5 text-lg font-black text-[#f26f12] transition hover:brightness-95"
              >
                Chọn món
              </button>
              <button
                onClick={() => void handleOpenDietModal()}
                className="rounded-full bg-[#d4e9f9] px-5 py-3.5 text-lg font-black text-[#116ca7] transition hover:brightness-95"
              >
                Ghi chú
              </button>
              <button
                onClick={() => void handleOpenRecipe()}
                className="rounded-full bg-[#ddd7f2] px-5 py-3.5 text-lg font-black text-[#5c39c8] transition hover:brightness-95"
              >
                Xem công thức
              </button>
              <button
                onClick={() => void handleCompleteSession()}
                disabled={!canCompleteSession}
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
                <p className="mt-3 text-[30px] leading-snug font-bold">Nhấn gửi để bắt đầu cuộc trò chuyện với Bepes.</p>
                <p className="mt-2 text-lg leading-relaxed text-[#344455]">
                  Mình sẽ bám đúng ngữ cảnh món đang chọn và tình trạng tủ lạnh của bạn.
                </p>
              </div>
            </div>
          ) : null}

          <div className="space-y-4 pb-2">
            {state.timeline.map((msg, index) => {
              const renderKey = msg.chatMessageId
                ? `session:${msg.chatSessionId ?? "none"}:message:${msg.chatMessageId}`
                : msg.tempId
                  ? `temp:${msg.tempId}`
                  : `fallback:${msg.chatSessionId ?? "none"}:${msg.role}:${msg.createdAt}:${index}`;
              const showSessionDivider = shouldShowSessionDivider(state.timeline, index);
              const sessionTimeLabel = formatSessionTimeLabel(msg.createdAt);

              return (
                <Fragment key={renderKey}>
                  {showSessionDivider ? (
                    <div className="py-1 text-center text-xs font-semibold text-[#9ca3af]">{`--- ${sessionTimeLabel} ---`}</div>
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
                </Fragment>
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
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
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
                        {group.items.map((item, index) => {
                          const isActiveRecipe = state.currentSession?.activeRecipeId === item.recipeId;

                          return (
                            <button
                              key={`${group.key}-${item.recipeId}-${index}`}
                              onClick={() => void handleSelectRecipe(item)}
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

      {showDietModal ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[84vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-xl font-black text-gray-900">Ghi chú ăn uống</h3>
                <p className="mt-1 text-sm text-gray-500">Thêm hoặc chỉnh sửa dị ứng, hạn chế và sở thích để Bepes gợi ý đúng hơn.</p>
              </div>
              <button onClick={() => setShowDietModal(false)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleAddDietNote();
              }}
              className="grid grid-cols-1 gap-2 border-b border-gray-100 p-5 sm:grid-cols-4"
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
                          type="button"
                          onClick={() => void handleToggleDietNote(note)}
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                          title={note.isActive === false ? "Bật ghi chú" : "Tắt ghi chú"}
                        >
                          <CheckCircle2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleEditDietNote(note)}
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-orange-100 hover:text-[#f59127]"
                          title="Sửa ghi chú"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteDietNote(note.noteId)}
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
    </div>
  );
}
