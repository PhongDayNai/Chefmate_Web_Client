"use client";

import { Bot, Loader2, RotateCcw, User as UserIcon } from "lucide-react";
import type {
  ChatMessage,
  MealPolicyPromptAction,
  MealPolicyPromptActionId,
  MealPolicyPromptMessageMeta,
} from "~/features/chat/types";
import ChatMessageContent from "~/features/chat/components/ChatMessageContent";

interface Props {
  message: ChatMessage;
  compact?: boolean;
  retryNow: number;
  showAssistantLabel?: boolean;
  onRetry?: (tempId: string) => void;
  onMealPolicyPromptAction?: (messageTempId: string, action: MealPolicyPromptActionId) => void;
  onOpenMealPickerFromPrompt?: (messageTempId: string) => void;
}

function getRetryCountdown(message: ChatMessage, retryNow: number): number {
  if (!message.retryAvailableAt) return 0;
  const waitMs = new Date(message.retryAvailableAt).getTime() - retryNow;
  return waitMs > 0 ? Math.ceil(waitMs / 1000) : 0;
}

function normalizeMealPolicyPromptActions(raw: unknown): MealPolicyPromptAction[] {
  if (!Array.isArray(raw)) return [];

  return raw.filter(
    (item): item is MealPolicyPromptAction =>
      Boolean(item) &&
      typeof item === "object" &&
      (item as MealPolicyPromptAction).id !== undefined &&
      ((item as MealPolicyPromptAction).id === "mark_done" ||
        (item as MealPolicyPromptAction).id === "mark_skipped" ||
        (item as MealPolicyPromptAction).id === "continue_current" ||
        (item as MealPolicyPromptAction).id === "complete_session" ||
        (item as MealPolicyPromptAction).id === "keep_session_open") &&
      typeof (item as MealPolicyPromptAction).label === "string" &&
      Boolean((item as MealPolicyPromptAction).label.trim()),
  );
}

function getMealPolicyPromptMeta(message: ChatMessage): MealPolicyPromptMessageMeta | null {
  if (!message.meta || message.meta.mealPolicyPrompt !== true || message.meta.flow !== "meal_v2") return null;

  const status = message.meta.status;
  if (status !== "pending" && status !== "loading" && status !== "error" && status !== "resolved") {
    return null;
  }

  const actions = normalizeMealPolicyPromptActions(message.meta.actions);
  if (!actions.length) return null;

  return {
    flow: "meal_v2",
    mealPolicyPrompt: true,
    promptCode:
      message.meta.promptCode === "PENDING_MEAL_V2_COMPLETION_CHECK" ||
      message.meta.promptCode === "MEAL_SESSION_READY_TO_COMPLETE"
        ? message.meta.promptCode
        : "PENDING_MEAL_V2_COMPLETION_CHECK",
    status,
    actions,
    selectedActionId:
      message.meta.selectedActionId === "mark_done" ||
      message.meta.selectedActionId === "mark_skipped" ||
      message.meta.selectedActionId === "continue_current" ||
      message.meta.selectedActionId === "complete_session" ||
      message.meta.selectedActionId === "keep_session_open"
        ? message.meta.selectedActionId
        : undefined,
    selectedActionLabel:
      typeof message.meta.selectedActionLabel === "string" ? message.meta.selectedActionLabel : undefined,
  };
}

function actionClassName(actionId: MealPolicyPromptActionId, disabled: boolean, active: boolean): string {
  if (disabled && active) return "border-emerald-300 bg-emerald-100 text-emerald-800";
  if (disabled) return "border-[#ebd9c3] bg-white/70 text-[#9a835f]";
  if (actionId === "mark_done") return "border-[#f5b778] bg-[#ffedd6] text-[#b45309] hover:bg-[#ffe3bf]";
  if (actionId === "mark_skipped") return "border-[#d8dce6] bg-[#f4f5f8] text-[#4b5563] hover:bg-[#ebeef3]";
  if (actionId === "continue_current") return "border-[#b9d7c2] bg-[#e8f5ec] text-[#17603a] hover:bg-[#d9f0e0]";
  if (actionId === "complete_session") return "border-[#cbd5ff] bg-[#e8edff] text-[#3047a7] hover:bg-[#dce4ff]";
  return "border-[#d7d2ff] bg-[#f1edff] text-[#5a43a7] hover:bg-[#e7e0ff]";
}

export default function ChatMessageBubble({
  message,
  compact = false,
  retryNow,
  showAssistantLabel = false,
  onRetry,
  onMealPolicyPromptAction,
  onOpenMealPickerFromPrompt,
}: Props) {
  const isUser = message.role === "user";
  const retryCountdown = getRetryCountdown(message, retryNow);
  const canRetry = Boolean(message.tempId && message.retryable && retryCountdown <= 0 && !message.isPending);
  const mealPolicyPromptMeta = !isUser ? getMealPolicyPromptMeta(message) : null;
  const mealPolicyPromptDisabled =
    !message.tempId || mealPolicyPromptMeta?.status === "loading" || mealPolicyPromptMeta?.status === "resolved";
  const canOpenMealPickerFromPrompt = Boolean(
    message.tempId &&
      mealPolicyPromptMeta?.promptCode === "MEAL_SESSION_READY_TO_COMPLETE" &&
      mealPolicyPromptMeta.status !== "loading" &&
      mealPolicyPromptMeta.status !== "resolved",
  );

  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`mt-1 flex flex-shrink-0 items-center justify-center rounded-xl border shadow-sm ${
          compact ? "h-8 w-8" : "h-8 w-8"
        } ${
          isUser
            ? "border-[#e07d16] bg-[#ff8f2a] text-white"
            : "border-orange-100 bg-orange-50 text-[#f59127]"
        }`}
      >
        {isUser ? <UserIcon size={compact ? 14 : 13} /> : <Bot size={compact ? 14 : 13} />}
      </div>

      <div
        className={`max-w-[85%] whitespace-pre-wrap shadow-sm ${
          compact
            ? "rounded-2xl p-4 text-sm leading-relaxed font-medium"
            : "rounded-[1.35rem] px-3.5 py-2.5 text-[14px] leading-[1.6]"
        } ${
          isUser
            ? "rounded-tr-none bg-[#ff8f2a] text-white"
            : compact
              ? "rounded-tl-none bg-gray-100 text-gray-800"
              : "rounded-tl-md border border-[#ebd9c3] bg-[#f7e7cf] text-[#1f2937]"
        } ${message.isPending ? "opacity-80" : ""} ${message.isFailed ? "ring-2 ring-red-200" : ""}`}
      >
        {!compact && !isUser && showAssistantLabel ? (
          <p className="mb-1 text-[16px] font-black text-[#f57a14]">Bepes</p>
        ) : null}

        <ChatMessageContent role={message.role} content={message.content} />

        {mealPolicyPromptMeta ? (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              {mealPolicyPromptMeta.actions.map((action) => {
                const isSelected = mealPolicyPromptMeta.selectedActionId === action.id;
                return (
                  <button
                    key={action.id}
                    type="button"
                    disabled={mealPolicyPromptDisabled}
                    onClick={() => {
                      if (!message.tempId) return;
                      onMealPolicyPromptAction?.(message.tempId, action.id);
                    }}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black transition disabled:cursor-not-allowed ${actionClassName(
                      action.id,
                      mealPolicyPromptDisabled,
                      isSelected,
                    )}`}
                  >
                    {mealPolicyPromptMeta.status === "loading" ? <Loader2 size={12} className="animate-spin" /> : null}
                    {action.label}
                  </button>
                );
              })}

              {canOpenMealPickerFromPrompt ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!message.tempId) return;
                    onOpenMealPickerFromPrompt?.(message.tempId);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-[#ffd7ad] bg-[#fff2df] px-3 py-1.5 text-xs font-black text-[#c26a17] transition hover:bg-[#ffe9cb]"
                >
                  Chọn thêm món
                </button>
              ) : null}
            </div>

            {mealPolicyPromptMeta.status === "resolved" && mealPolicyPromptMeta.selectedActionLabel ? (
              <p className="text-xs font-semibold text-emerald-700">
                Đã chọn: {mealPolicyPromptMeta.selectedActionLabel}
              </p>
            ) : null}

            {mealPolicyPromptMeta.status === "loading" ? (
              <p className="text-xs font-semibold text-[#7b7f8a]">Bepes đang xử lý lựa chọn của bạn...</p>
            ) : null}

            {mealPolicyPromptMeta.status === "error" ? (
              <p className="text-xs font-semibold text-amber-700">
                Chưa xử lý được. Bạn có thể thử lại hoặc tiếp tục nhắn tay.
              </p>
            ) : null}
          </div>
        ) : null}

        {message.isPending && !isUser ? (
          <div className={`mt-2 inline-flex items-center gap-2 ${isUser ? "text-white/85" : "text-[#7b7f8a]"}`}>
            <Loader2 size={compact ? 13 : 14} className="animate-spin" />
            <span className={compact ? "text-xs font-semibold" : "text-sm font-semibold"}>Đang gửi...</span>
          </div>
        ) : null}

        {message.isFailed ? (
          <div
            className={`mt-3 rounded-2xl border px-3 py-2 ${
              isUser ? "border-white/25 bg-white/15 text-white" : "border-red-100 bg-red-50 text-red-600"
            }`}
          >
            <p className={compact ? "text-[11px] font-semibold" : "text-xs font-semibold"}>
              {message.failedReason || "Tin nhắn chưa gửi được."}
            </p>

            {message.retryable && message.tempId ? (
              <button
                type="button"
                disabled={!canRetry}
                onClick={() => onRetry?.(message.tempId!)}
                className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black transition ${
                  canRetry
                    ? isUser
                      ? "bg-white text-[#f26f12] hover:brightness-95"
                      : "bg-red-600 text-white hover:bg-red-500"
                    : isUser
                      ? "bg-white/70 text-[#f26f12]"
                      : "bg-red-100 text-red-500"
                } disabled:cursor-not-allowed`}
              >
                <RotateCcw size={12} />
                {retryCountdown > 0 ? `Gửi lại sau ${retryCountdown}s` : "Gửi lại"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
