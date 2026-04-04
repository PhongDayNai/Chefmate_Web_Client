"use client";

import { Bot, Loader2, RotateCcw, User as UserIcon } from "lucide-react";
import type { ChatMessage } from "~/features/chat/types";
import ChatMessageContent from "~/features/chat/components/ChatMessageContent";

interface Props {
  message: ChatMessage;
  compact?: boolean;
  retryNow: number;
  showAssistantLabel?: boolean;
  onRetry?: (tempId: string) => void;
}

function getRetryCountdown(message: ChatMessage, retryNow: number): number {
  if (!message.retryAvailableAt) return 0;
  const waitMs = new Date(message.retryAvailableAt).getTime() - retryNow;
  return waitMs > 0 ? Math.ceil(waitMs / 1000) : 0;
}

export default function ChatMessageBubble({
  message,
  compact = false,
  retryNow,
  showAssistantLabel = false,
  onRetry,
}: Props) {
  const isUser = message.role === "user";
  const retryCountdown = getRetryCountdown(message, retryNow);
  const canRetry = Boolean(message.tempId && message.retryable && retryCountdown <= 0 && !message.isPending);

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
