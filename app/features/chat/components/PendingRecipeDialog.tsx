"use client";

import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useChatFlow } from "~/features/chat/state/ChatFlowProvider";

export default function PendingRecipeDialog() {
  const {
    state: { pendingPreviousRecipe, sending },
    resolvePendingAction,
    clearPendingPreviousRecipe,
  } = useChatFlow();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  if (!pendingPreviousRecipe) return null;

  const handleAction = async (action: "complete_and_deduct" | "skip_deduction" | "continue_current_session") => {
    setLoadingAction(action);
    const ok = await resolvePendingAction(action);
    setLoadingAction(null);

    if (ok) {
      clearPendingPreviousRecipe();
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3 text-amber-600">
          <AlertTriangle className="h-6 w-6" />
          <h3 className="text-lg font-black">Hoàn tất phiên trước khi bắt đầu món mới</h3>
        </div>

        <p className="mb-3 text-sm text-gray-600">
          Bạn đang có một phiên chưa xử lý xong
          {pendingPreviousRecipe.previousRecipeName ? `: ${pendingPreviousRecipe.previousRecipeName}` : ""}.
        </p>
        <p className="mb-6 text-xs text-gray-500">
          Chọn cách xử lý để Bepes tiếp tục cuộc hội thoại đúng ngữ cảnh.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            disabled={sending || !!loadingAction}
            onClick={() => handleAction("complete_and_deduct")}
            className="rounded-2xl bg-[#f59127] px-4 py-3 text-sm font-black text-white hover:bg-[#e07d16] disabled:opacity-50"
          >
            {loadingAction === "complete_and_deduct" ? "Đang xử lý..." : "Hoàn thành"}
          </button>
          <button
            disabled={sending || !!loadingAction}
            onClick={() => handleAction("skip_deduction")}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {loadingAction === "skip_deduction" ? "Đang xử lý..." : "Bỏ qua trừ kho"}
          </button>
          <button
            disabled={sending || !!loadingAction}
            onClick={() => handleAction("continue_current_session")}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {loadingAction === "continue_current_session" ? "Đang xử lý..." : "Tiếp tục phiên cũ"}
          </button>
        </div>
      </div>
    </div>
  );
}
