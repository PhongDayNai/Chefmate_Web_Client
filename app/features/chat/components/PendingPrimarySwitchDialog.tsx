"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import type { MealItem, PendingPrimarySwitch } from "~/features/chat/types";

interface Props {
  isOpen: boolean;
  pendingSwitch: PendingPrimarySwitch | null;
  mealItems: MealItem[];
  loading?: boolean;
  onClose: () => void;
  onConfirm: (nextPrimaryRecipeId: number) => void;
}

export default function PendingPrimarySwitchDialog({
  isOpen,
  pendingSwitch,
  mealItems,
  loading = false,
  onClose,
  onConfirm,
}: Props) {
  const candidateItems = useMemo(() => {
    if (!pendingSwitch) return [];
    const mealMap = new Map(mealItems.map((item) => [item.recipeId, item]));
    return pendingSwitch.candidateNextPrimaryRecipeIds
      .map((recipeId) => mealMap.get(recipeId))
      .filter(Boolean) as MealItem[];
  }, [mealItems, pendingSwitch]);

  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);

  useEffect(() => {
    if (!pendingSwitch) {
      setSelectedRecipeId(null);
      return;
    }

    const fallbackRecipeId =
      pendingSwitch.suggestedNextPrimaryRecipeId ??
      candidateItems[0]?.recipeId ??
      null;
    setSelectedRecipeId(fallbackRecipeId);
  }, [candidateItems, pendingSwitch]);

  if (!isOpen || !pendingSwitch) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900">Chọn món ưu tiên tiếp theo</h3>
              <p className="mt-1 text-sm text-gray-500">
                {pendingSwitch.reason || "Món hiện tại đã được đóng, hãy chọn món tiếp theo để Bepes tiếp tục đúng ngữ cảnh."}
              </p>
            </div>
          </div>

          <button type="button" onClick={onClose} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-6">
          {candidateItems.length ? (
            candidateItems.map((item) => {
              const isSelected = selectedRecipeId === item.recipeId;

              return (
                <button
                  type="button"
                  key={item.recipeId}
                  onClick={() => setSelectedRecipeId(item.recipeId)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${
                    isSelected ? "border-[#f5bd7b] bg-[#fff6ea]" : "border-gray-100 bg-white hover:border-[#f5bd7b]"
                  }`}
                >
                  <div>
                    <p className="font-black text-gray-900">{item.recipeName}</p>
                    <p className="mt-1 text-xs text-gray-500">Trạng thái hiện tại: {item.status}</p>
                  </div>

                  {isSelected ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                      <CheckCircle2 size={12} /> Được chọn
                    </span>
                  ) : null}
                </button>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
              Không có món ứng viên nào khả dụng cho bước chuyển này.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50"
          >
            Để sau
          </button>
          <button
            type="button"
            disabled={!selectedRecipeId || loading}
            onClick={() => selectedRecipeId && onConfirm(selectedRecipeId)}
            className="rounded-full bg-[#f59127] px-5 py-2 text-sm font-black text-white hover:bg-[#e07d16] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Đang xác nhận..." : "Xác nhận món tiếp theo"}
          </button>
        </div>
      </div>
    </div>
  );
}
