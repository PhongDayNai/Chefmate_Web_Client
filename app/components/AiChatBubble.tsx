"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bot, CheckCircle2, Loader2, PanelRightOpen, Pencil, Send, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { formatSessionTimeLabel, shouldShowSessionDivider } from "~/features/chat/utils/chatTime";
import { DIET_NOTE_TYPE_OPTIONS, useChatViewModel } from "~/features/chat/hooks/useChatViewModel";
import type { DietNoteType } from "~/features/chat/types";
import ChatContextCard from "~/features/chat/components/ChatContextCard";
import ChatMessageBubble from "~/features/chat/components/ChatMessageBubble";
import CompleteMealDialog from "~/features/chat/components/CompleteMealDialog";
import MealPickerDialog from "~/features/chat/components/MealPickerDialog";
import PendingPrimarySwitchDialog from "~/features/chat/components/PendingPrimarySwitchDialog";
import SelectedRecipesDialog from "~/features/chat/components/SelectedRecipesDialog";
import { checkAuth, getAuthUser } from "~/utils/authUtils";

const BUBBLE_ANIMATION_MS = 260;

export default function AiChatBubble() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isBubbleRendered, setIsBubbleRendered] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);

  const ensureLoggedIn = () => {
    const nextUser = getAuthUser();

    setUserName(nextUser?.fullName || null);

    if (!checkAuth()) {
      toast.error("Vui lòng đăng nhập để chat với Bepes!");
      router.push("/auth");
      return null;
    }

    return nextUser?.userId ?? null;
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
    showRecipeDialog,
    setShowRecipeDialog,
    showCompleteDialog,
    setShowCompleteDialog,
    dietNoteLabel,
    setDietNoteLabel,
    dietNoteType,
    setDietNoteType,
    recommendationGroups,
    activeRecipeLabel,
    dietSummary,
    canCompleteSession,
    canMutateMeal,
    canSendMessage,
    composerPlaceholder,
    retryNow,
    highlightedRecipeId,
    loadingRecipes,
    selectedRecipeEntries,
    handleTimelineScroll,
    autoScrollTimeline,
    handleSend,
    handleResolveCompletionCheck,
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
  } = useChatViewModel({
    ensureAuth: () => Boolean(ensureLoggedIn()),
    bootstrapWhen: isOpen,
    syncContextActionsWhen: isOpen,
  });

  useEffect(() => {
    setUserName(getAuthUser()?.fullName || null);
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
    <div className="fixed inset-x-2 bottom-2 z-[100] flex flex-col items-end gap-3 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:gap-4">
      {isBubbleRendered ? (
        <div
          onWheel={handleBubbleWheel}
          style={{
            width: "min(100%, 420px)",
            height: "min(750px, calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 6.5rem))",
          }}
          className={`flex flex-col overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-2xl transition-all duration-300 ease-out sm:rounded-[2.5rem] md:w-[420px] ${
            isOpen ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-6 scale-95 opacity-0"
          }`}
        >
          <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-4 shadow-sm sm:p-5">
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
              <button onClick={toggleChat} className="p-2 text-gray-400 transition-all hover:text-red-500" type="button">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-shrink-0 border-b border-gray-100 bg-white px-3 pb-3 pt-2 sm:px-4">
            <ChatContextCard
              compact
              activeRecipeLabel={activeRecipeLabel}
              dietSummary={dietSummary}
              mealCount={state.mealItems.length}
              needsSelection={state.mealSession.needsSelection}
              uiClosed={state.mealSession.uiClosed}
              showActions={showContextActions}
              canComplete={canCompleteSession}
              canMutateMeal={canMutateMeal}
              onToggleActions={() => setShowContextActions((prev) => !prev)}
              onOpenMealPicker={() => void handleOpenRecipePicker()}
              onOpenDietNotes={() => void handleOpenDietModal()}
              onOpenRecipes={() => void handleOpenRecipes()}
              onOpenComplete={handleOpenCompleteDialog}
            />
          </div>

          <div ref={timelineRef} className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain bg-white p-4 sm:p-5">
            {state.loadingTimeline && state.timeline.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#f59127]" />
              </div>
            ) : null}

            {state.timeline.length === 0 && !state.sending && !state.loadingTimeline ? (
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

                    <ChatMessageBubble
                      message={msg}
                      compact
                      retryNow={retryNow}
                      onCompletionCheckAction={(messageTempId, action) =>
                        void handleResolveCompletionCheck(messageTempId, action)
                      }
                      onRetry={(tempId) => void handleRetryMessage(tempId)}
                    />
                  </Fragment>
                );
              })
            )}

            {state.sending ? (
              <div className="flex animate-pulse gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-orange-100 bg-orange-50 text-[#f59127]">
                  <Loader2 size={14} className="animate-spin" />
                </div>
                <div className="max-w-[80%] rounded-2xl rounded-tl-none border border-gray-100 bg-gray-50 p-4 text-sm font-medium italic text-gray-400">
                  Bepes đang soạn câu trả lời...
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex-shrink-0 border-t border-gray-100 bg-gray-50 p-3 sm:p-4">
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
                disabled={!canSendMessage}
                placeholder={composerPlaceholder}
                className="w-full rounded-2xl border-2 border-transparent bg-white p-3.5 pr-14 text-sm font-medium text-gray-900 shadow-sm outline-none transition-all focus:border-orange-200 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 sm:p-4 sm:pr-14"
              />
              <button
                type="submit"
                disabled={state.sending || !input.trim() || !canSendMessage}
                className="absolute bottom-1.5 right-1.5 top-1.5 rounded-xl bg-[#f59127] px-4 font-black text-white transition-all hover:scale-105 disabled:opacity-30"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <button
        onClick={toggleChat}
        className={`relative z-[101] mr-1 flex h-16 w-16 transform items-center justify-center rounded-full text-white shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 sm:mr-0 ${
          isOpen ? "rotate-180 bg-[#ea6f12]" : "bg-[#f59127]"
        }`}
        type="button"
      >
        {isOpen ? <X size={28} /> : <Bot size={32} />}
      </button>

      <MealPickerDialog
        isOpen={showRecipePicker}
        compact
        mealItems={state.mealSession.uiClosed ? [] : state.mealItems}
        recommendationGroups={recommendationGroups}
        activeRecipeId={state.mealSession.activeRecipeId}
        highlightedRecipeId={highlightedRecipeId}
        isLocked={false}
        isSaving={state.mealSyncing}
        onClose={() => setShowRecipePicker(false)}
        onAddRecipe={(item) => void handleAddRecipeToMeal(item)}
        onRemoveRecipe={(recipeId) => void handleRemoveMealRecipe(recipeId)}
        onMoveRecipe={(recipeId, direction) => void handleMoveMealRecipe(recipeId, direction)}
        onSetPrimaryRecipe={(recipeId) => void handleSetPrimaryRecipe(recipeId)}
        onChangeStatus={(recipeId, status) => void handleChangeMealStatus(recipeId, status)}
      />

      <SelectedRecipesDialog
        isOpen={showRecipeDialog}
        compact
        loading={loadingRecipes}
        entries={selectedRecipeEntries}
        onClose={() => setShowRecipeDialog(false)}
        onOpenRecipe={handleOpenRecipeFromDialog}
      />

      <PendingPrimarySwitchDialog
        isOpen={Boolean(state.pendingPrimarySwitch)}
        pendingSwitch={state.pendingPrimarySwitch}
        mealItems={state.mealItems}
        loading={state.mealSyncing}
        onClose={handleClosePendingPrimarySwitch}
        onConfirm={(recipeId) => void handleConfirmPendingPrimarySwitch(recipeId)}
      />

      <CompleteMealDialog
        isOpen={showCompleteDialog}
        compact
        loading={state.mealSyncing}
        onClose={() => setShowCompleteDialog(false)}
        onSubmit={(payload) => void handleConfirmCompleteSession(payload)}
      />

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
