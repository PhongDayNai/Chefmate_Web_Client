"use client";

import { useEffect, useState } from "react";
import { LockKeyhole, MessageSquare, Refrigerator } from "lucide-react";
import toast from "react-hot-toast";
import type { PantryType } from "~/features/pantry/types";
import { pantryService } from "~/features/pantry/api/pantryService";

interface Props {
  /**
   * Called when the user picks a pantry option (or "no pantry" → null).
   * Should resolve to true on success so the card can dismiss itself.
   */
  onSelect: (pantryId: number | null) => Promise<boolean> | boolean;
  /** Optional: highlight the currently active pantry. */
  activePantryId?: number | null;
  compact?: boolean;
  /** Subtitle shown above the options. */
  description?: string;
}

export default function PantryPickerCard({
  onSelect,
  activePantryId = null,
  compact = false,
  description,
}: Props) {
  const [pantries, setPantries] = useState<PantryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null | "none">(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    pantryService
      .getPantries()
      .then((res) => {
        if (cancelled) return;
        if (res?.success && Array.isArray(res.data)) {
          setPantries(res.data);
        } else {
          setPantries([]);
        }
      })
      .catch(() => {
        if (!cancelled) setPantries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelect = async (pantryId: number | null) => {
    const key = pantryId === null ? "none" : pantryId;
    setSubmittingId(key);
    try {
      const ok = await onSelect(pantryId);
      if (!ok) {
        // Caller already surfaced any error toast.
      }
    } catch (err: any) {
      toast.error(err?.message || "Không thể chọn tủ lạnh này");
    } finally {
      setSubmittingId(null);
    }
  };

  const padding = compact ? "p-3" : "p-4 sm:p-5";
  const title = compact ? "Chat với tủ lạnh nào?" : "Bắt đầu chat với Bepes";

  const usableOptions = pantries.filter((p) => p.userRole !== "viewer");
  const viewerOptions = pantries.filter((p) => p.userRole === "viewer");

  return (
    <div className={`rounded-2xl border border-[#efe3d1] bg-[#fbf3e7] ${padding}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#f59127] text-white">
          <Refrigerator size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={`font-black text-gray-900 ${compact ? "text-sm" : "text-base sm:text-lg"}`}>{title}</h3>
          <p className={`mt-1 text-gray-600 ${compact ? "text-[11px]" : "text-xs sm:text-sm"}`}>
            {description ??
              "Chọn tủ lạnh để Bepes biết bạn đang có gì. Cũng có thể chat thuần túy mà không cần tủ lạnh nào."}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-white/70" />
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => void handleSelect(null)}
            disabled={submittingId !== null}
            className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
              activePantryId === null
                ? "border-[#f59127] bg-orange-50 text-[#a4570d]"
                : "border-transparent bg-white text-gray-800 hover:border-[#f5c98c] hover:bg-orange-50/40"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare size={16} className="text-[#f59127]" />
              <span className="text-sm font-bold">Chat thuần túy (không gắn tủ)</span>
            </div>
            <span className="text-[11px] font-semibold text-gray-400">Hỏi đáp tự do</span>
          </button>

          {usableOptions.map((p) => {
            const isActive = activePantryId === p.pantryId;
            return (
              <button
                key={p.pantryId}
                type="button"
                onClick={() => void handleSelect(p.pantryId)}
                disabled={submittingId !== null}
                className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isActive
                    ? "border-[#f59127] bg-orange-50 text-[#a4570d]"
                    : "border-transparent bg-white text-gray-800 hover:border-[#f5c98c] hover:bg-orange-50/40"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Refrigerator size={16} className="text-[#f59127]" />
                  <span className="truncate text-sm font-bold">{p.name}</span>
                </div>
                <span className="ml-3 text-[11px] font-semibold text-gray-500">
                  {p.itemCount} món · {p.userRole === "owner" ? "Sở hữu" : "Chỉnh sửa"}
                </span>
              </button>
            );
          })}

          {viewerOptions.length > 0 ? (
            <div className="space-y-1.5 pt-1">
              {viewerOptions.map((p) => (
                <div
                  key={p.pantryId}
                  className="flex w-full items-center justify-between rounded-xl border-2 border-dashed border-gray-200 px-4 py-3 text-gray-400"
                  title="Bạn chỉ có quyền xem tủ lạnh này"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <LockKeyhole size={14} />
                    <span className="truncate text-sm font-medium">{p.name}</span>
                  </div>
                  <span className="ml-3 text-[10px] font-semibold uppercase tracking-wide">
                    Chỉ xem
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {usableOptions.length === 0 ? (
            <p className="rounded-xl bg-white/70 px-3 py-2 text-center text-xs text-gray-500">
              Bạn chưa có tủ lạnh nào để gắn vào chat. Có thể tạo tủ ở mục Tủ lạnh.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
