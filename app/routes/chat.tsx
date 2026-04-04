"use client";

import { Fragment, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bot,
  ChevronLeft,
  CheckCircle2,
  Loader2,
  Pencil,
  Send,
  Trash2,
  X,
} from "lucide-react";
import NeedLoginCard from "~/features/chat/components/NeedLoginCard";
import { formatSessionTimeLabel, shouldShowSessionDivider } from "~/features/chat/utils/chatTime";
import { DIET_NOTE_TYPE_OPTIONS, useChatViewModel } from "~/features/chat/hooks/useChatViewModel";
import type { DietNoteType } from "~/features/chat/types";
import { useAuthGuard } from "~/hooks/useAuthGuard";
import ChatContextCard from "~/features/chat/components/ChatContextCard";
import ChatMessageBubble from "~/features/chat/components/ChatMessageBubble";
import CompleteMealDialog from "~/features/chat/components/CompleteMealDialog";
import MealPickerDialog from "~/features/chat/components/MealPickerDialog";
import PendingPrimarySwitchDialog from "~/features/chat/components/PendingPrimarySwitchDialog";
import SelectedRecipesDialog from "~/features/chat/components/SelectedRecipesDialog";

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
    handleResolveMealPolicyPrompt,
    handleOpenMealPickerFromPrompt,
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
    <div className="flex h-[calc(100vh-64px)] justify-center bg-[#f3f3f5] px-1.5 py-1.5 sm:px-3 sm:py-3">
      <section className="relative flex h-full w-full max-w-[900px] flex-col overflow-hidden rounded-[1.6rem] bg-[#f3f3f5] shadow-sm sm:rounded-[1.8rem]">
        <div className="rounded-[1.3rem] bg-gradient-to-r from-[#ff7a16] via-[#f69035] to-[#ffb467] px-3 py-3 text-white shadow-md sm:rounded-[1.5rem] sm:px-4 sm:py-3.5">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-full bg-white/20 p-2 transition hover:bg-white/30 sm:p-2.5"
              title="Quay lại"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 sm:h-9 sm:w-9">
              <Bot size={20} />
            </div>
            <div>
              <h1 className="text-[24px] font-black leading-none tracking-tight sm:text-[2rem]">Bepes</h1>
              <p className="mt-0.5 text-[11px] font-semibold text-white/80 sm:mt-1 sm:text-xs">Trợ lý nấu ăn theo tủ lạnh và khẩu vị</p>
            </div>
          </div>
        </div>

        <div className="px-3 pt-3 sm:px-4 sm:pt-4">{!isLoggedIn ? <NeedLoginCard /> : null}</div>

        <div className="px-3 pt-2.5 sm:px-4 sm:pt-2.5">
          <ChatContextCard
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

        <div ref={timelineRef} className="custom-scrollbar flex-1 overflow-y-auto px-3 pb-2 pt-2.5 sm:px-3.5 sm:pb-2.5 sm:pt-3">
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
                <p className="mt-3 text-[30px] font-bold leading-snug">Nhấn gửi để bắt đầu cuộc trò chuyện với Bepes.</p>
                <p className="mt-2 text-lg leading-relaxed text-[#344455]">
                  Mình sẽ bám theo meal session hiện tại, thứ tự món đã chọn và ghi chú ăn uống của bạn.
                </p>
              </div>
            </div>
          ) : null}

          <div className="space-y-3 pb-2">
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
                    <div className="flex items-center gap-3 py-0.5">
                      <div className="h-px flex-1 bg-[#d7dde5]" />
                      <span className="text-[11px] font-semibold text-[#9ca3af]">{sessionTimeLabel}</span>
                      <div className="h-px flex-1 bg-[#d7dde5]" />
                    </div>
                  ) : null}

                  <ChatMessageBubble
                    message={msg}
                    retryNow={retryNow}
                    showAssistantLabel
                    onMealPolicyPromptAction={(messageTempId, action) =>
                      void handleResolveMealPolicyPrompt(messageTempId, action)
                    }
                    onOpenMealPickerFromPrompt={(messageTempId) =>
                      void handleOpenMealPickerFromPrompt(messageTempId)
                    }
                    onRetry={(tempId) => void handleRetryMessage(tempId)}
                  />
                </Fragment>
              );
            })}

            {state.sending ? (
              <div className="flex gap-2.5">
                <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[#ebd7b8] bg-[#fff4e3] text-[#f57a14]">
                  <Loader2 size={13} className="animate-spin" />
                </div>
                <div className="rounded-[1.35rem] rounded-tl-md border border-[#ebd9c3] bg-[#f7e7cf] px-3.5 py-2.5 text-sm font-medium italic text-[#7b7f8a]">
                  Bepes đang soạn phản hồi...
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="bg-[#f3f3f5] px-3.5 pb-3.5 pt-1.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="mx-auto flex max-w-4xl items-center gap-2 rounded-[1.8rem] border border-[#e4e6ed] bg-white p-1.5 pl-4 shadow-lg"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!canSendMessage}
              placeholder={composerPlaceholder}
              className="h-9 flex-1 bg-transparent text-[15px] text-[#1f2937] outline-none placeholder:text-[#a1a7b6] disabled:cursor-not-allowed disabled:text-gray-400"
            />
            <button
              type="submit"
              disabled={state.sending || !input.trim() || !isLoggedIn || !canSendMessage}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ff7a16] text-white transition hover:bg-[#ea6f12] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </section>

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
        loading={state.mealSyncing}
        onClose={() => setShowCompleteDialog(false)}
        onSubmit={(payload) => void handleConfirmCompleteSession(payload)}
      />

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
