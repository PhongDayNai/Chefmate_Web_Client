"use client";

import { useEffect, useState } from "react";
import type { MealCompletionType, MealRemainingStatus } from "~/features/chat/types";
import { CheckCircle2, PauseCircle, X } from "lucide-react";

interface Props {
  isOpen: boolean;
  compact?: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    completionType: MealCompletionType;
    note: string;
    markRemainingStatus: MealRemainingStatus;
  }) => void;
}

export default function CompleteMealDialog({
  isOpen,
  compact = false,
  loading = false,
  onClose,
  onSubmit,
}: Props) {
  const [completionType, setCompletionType] = useState<MealCompletionType>("completed");
  const [markRemainingStatus, setMarkRemainingStatus] = useState<MealRemainingStatus>("done");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setCompletionType("completed");
    setMarkRemainingStatus("done");
    setNote("");
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4">
      <div className={`w-full rounded-3xl bg-white shadow-2xl ${compact ? "max-w-xl" : "max-w-2xl"}`}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h3 className={`${compact ? "text-lg" : "text-2xl"} font-black text-gray-900`}>Hoàn thành phiên nấu</h3>
            <p className="mt-1 text-sm text-gray-500">Chọn cách đóng phiên hiện tại trước khi khóa các thao tác write.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <section>
            <p className="mb-3 text-sm font-black uppercase tracking-wide text-gray-500">Kiểu kết thúc</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setCompletionType("completed");
                  setMarkRemainingStatus("done");
                }}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  completionType === "completed" ? "border-emerald-300 bg-emerald-50" : "border-gray-200 bg-white hover:border-emerald-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="font-black text-gray-900">Đã nấu xong</p>
                    <p className="mt-1 text-sm text-gray-500">Đóng phiên với trạng thái hoàn tất.</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCompletionType("abandoned");
                  setMarkRemainingStatus("skipped");
                }}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  completionType === "abandoned" ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white hover:border-amber-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-amber-100 p-3 text-amber-600">
                    <PauseCircle size={20} />
                  </div>
                  <div>
                    <p className="font-black text-gray-900">Dừng tại đây</p>
                    <p className="mt-1 text-sm text-gray-500">Đóng phiên nhưng xem như không tiếp tục bữa này.</p>
                  </div>
                </div>
              </button>
            </div>
          </section>

          <section>
            <p className="mb-3 text-sm font-black uppercase tracking-wide text-gray-500">Xử lý các món còn lại</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                { value: "done", label: "Đánh dấu xong" },
                { value: "skipped", label: "Đánh dấu bỏ qua" },
                { value: "keep", label: "Giữ nguyên" },
              ].map((option) => {
                const isSelected =
                  option.value === "keep" ? markRemainingStatus === null : markRemainingStatus === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMarkRemainingStatus(option.value === "keep" ? null : (option.value as Exclude<MealRemainingStatus, null>))}
                    className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
                      isSelected ? "border-[#f5bd7b] bg-[#fff6ea] text-[#d07a15]" : "border-gray-200 bg-white text-gray-600 hover:border-[#f5bd7b]"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <p className="mb-3 text-sm font-black uppercase tracking-wide text-gray-500">Ghi chú thêm</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="Ví dụ: Đã nấu gần xong, phần còn lại để ngày mai."
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#f5bd7b]"
            />
          </section>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              onSubmit({
                completionType,
                note: note.trim(),
                markRemainingStatus,
              })
            }
            className="rounded-full bg-[#f59127] px-5 py-2 text-sm font-black text-white hover:bg-[#e07d16] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Đang hoàn tất..." : "Xác nhận hoàn tất"}
          </button>
        </div>
      </div>
    </div>
  );
}
