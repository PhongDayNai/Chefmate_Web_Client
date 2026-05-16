"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpenText,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  LockKeyhole,
  NotebookPen,
  Refrigerator,
  Soup,
  Target,
  UtensilsCrossed,
} from "lucide-react";
import type { PantryType } from "~/features/pantry/types";

interface Props {
  compact?: boolean;
  activeRecipeLabel: string;
  dietSummary: string;
  mealCount: number;
  needsSelection: boolean;
  uiClosed: boolean;
  showActions: boolean;
  canComplete: boolean;
  canMutateMeal: boolean;
  // Pantry context
  pantries: PantryType[];
  pantryId: number | null;
  pantryLoading?: boolean;
  pantrySwitching?: boolean;
  /** Whether the user can change the pantry right now (false in V2 meal mid-flow). */
  canChangePantry: boolean;
  onSelectPantry: (pantryId: number | null) => void;
  onToggleActions: () => void;
  onOpenMealPicker: () => void;
  onOpenDietNotes: () => void;
  onOpenRecipes: () => void;
  onOpenComplete: () => void;
}

function actionClassName(tone: "warm" | "cool" | "violet" | "green") {
  if (tone === "cool") return "bg-[#d4e9f9] text-[#116ca7]";
  if (tone === "violet") return "bg-[#ddd7f2] text-[#5c39c8]";
  if (tone === "green") return "border border-[#7dd59a] bg-[#d3f0dc] text-[#1b7f43]";
  return "bg-[#ffe8c8] text-[#f26f12]";
}

function quickActionClassName(tone: "warm" | "cool" | "violet" | "green") {
  if (tone === "cool") return "border-[#b7d6ef] bg-[#eef7ff] text-[#116ca7]";
  if (tone === "violet") return "border-[#d6cef0] bg-[#f2eeff] text-[#5c39c8]";
  if (tone === "green") return "border-[#86d8a2] bg-[#e9f8ee] text-[#1b7f43]";
  return "border-[#f5dcb5] bg-[#fff4e3] text-[#f26f12]";
}

export default function ChatContextCard({
  compact = false,
  activeRecipeLabel,
  dietSummary,
  mealCount,
  needsSelection,
  uiClosed,
  showActions,
  canComplete,
  canMutateMeal,
  pantries,
  pantryId,
  pantryLoading = false,
  pantrySwitching = false,
  canChangePantry,
  onSelectPantry,
  onToggleActions,
  onOpenMealPicker,
  onOpenDietNotes,
  onOpenRecipes,
  onOpenComplete,
}: Props) {
  const [pantryMenuOpen, setPantryMenuOpen] = useState(false);
  const pantryMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pantryMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (pantryMenuRef.current && !pantryMenuRef.current.contains(e.target as Node)) {
        setPantryMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pantryMenuOpen]);

  const baseButtonClass = compact
    ? "rounded-xl px-2 py-2 text-[11px] font-black transition hover:brightness-95"
    : "rounded-[1rem] px-3 py-2.5 text-[14px] font-black transition hover:brightness-95 sm:rounded-[1.1rem] sm:px-3.5 sm:py-2.5 sm:text-[15px]";
  const mealActionLabel = mealCount > 0 ? "Món ăn" : "Chọn món";

  const quickActionClass =
    "flex h-8 w-8 items-center justify-center rounded-full border bg-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50";

  const activePantry = pantries.find((p) => p.pantryId === pantryId) || null;
  const pantryLabel = activePantry?.name || (pantryId == null ? "Chưa chọn" : `#${pantryId}`);

  const pantryButtonDisabled = !canChangePantry || pantryLoading || pantrySwitching;

  return (
    <div className={`rounded-2xl border border-[#efe3d1] bg-[#fbf3e7] ${compact ? "p-2.5" : "rounded-[1.45rem] p-3"}`}>
      <div className="flex items-start justify-between gap-2.5 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className={`${compact ? "text-[11px]" : "text-[14px] sm:text-[15px]"} truncate font-semibold leading-snug text-gray-700`}>
            Món đang chọn: <span className="font-black text-gray-900">{activeRecipeLabel}</span>
          </p>
          <p className={`${compact ? "mt-0.5 text-[11px]" : "mt-1 text-[12px] sm:text-[13px]"} truncate font-semibold leading-snug text-gray-700`}>
            Ghi chú: <span className="font-black text-gray-900">{dietSummary}</span>
          </p>

          <div className="relative mt-1.5" ref={pantryMenuRef}>
            <button
              type="button"
              disabled={pantryButtonDisabled}
              onClick={() => setPantryMenuOpen((v) => !v)}
              className={`flex w-full items-center justify-between gap-2 rounded-lg bg-white/70 px-2.5 py-1.5 text-left transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 ${
                compact ? "text-[11px]" : "text-[12px] sm:text-[13px]"
              }`}
              title={
                canChangePantry
                  ? "Đổi tủ lạnh đang gắn với phiên chat"
                  : "Không thể đổi tủ trong khi đang trong phiên nấu"
              }
            >
              <span className="flex min-w-0 items-center gap-1.5 font-semibold text-gray-700">
                <Refrigerator size={compact ? 12 : 13} className="flex-shrink-0 text-[#f59127]" />
                <span className="truncate">
                  Tủ lạnh: <span className="font-black text-gray-900">{pantrySwitching ? "Đang đổi..." : pantryLabel}</span>
                </span>
              </span>
              <ChevronDown
                size={compact ? 12 : 13}
                className={`flex-shrink-0 text-gray-400 transition-transform ${pantryMenuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {pantryMenuOpen ? (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setPantryMenuOpen(false);
                    onSelectPantry(null);
                  }}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12px] transition hover:bg-orange-50 ${
                    pantryId === null ? "bg-orange-50 text-[#f59127]" : "text-gray-700"
                  }`}
                >
                  <span className="font-semibold">Không gắn tủ lạnh</span>
                  <span className="text-[10px] text-gray-400">Hỏi đáp tự do</span>
                </button>

                {pantries
                  .filter((p) => p.userRole !== "viewer")
                  .map((p) => (
                    <button
                      key={p.pantryId}
                      type="button"
                      onClick={() => {
                        setPantryMenuOpen(false);
                        onSelectPantry(p.pantryId);
                      }}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12px] transition hover:bg-orange-50 ${
                        pantryId === p.pantryId ? "bg-orange-50 text-[#f59127]" : "text-gray-700"
                      }`}
                    >
                      <span className="truncate font-semibold">{p.name}</span>
                      <span className="ml-2 text-[10px] text-gray-400">
                        {p.itemCount} món · {p.userRole === "owner" ? "Sở hữu" : "Chỉnh sửa"}
                      </span>
                    </button>
                  ))}

                {pantries
                  .filter((p) => p.userRole === "viewer")
                  .map((p) => (
                    <div
                      key={`view-${p.pantryId}`}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-[11px] text-gray-400"
                      title="Chỉ xem - không thể dùng để chat"
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <LockKeyhole size={11} />
                        <span className="truncate">{p.name}</span>
                      </span>
                      <span className="text-[10px]">Chỉ xem</span>
                    </div>
                  ))}
              </div>
            ) : null}
          </div>

          <div className={`mt-2 flex flex-wrap items-center gap-1.5 ${compact ? "text-[10px]" : "text-[11px]"}`}>
            {!uiClosed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 font-bold text-gray-600">
                <Soup size={compact ? 12 : 13} /> {mealCount} món
              </span>
            ) : null}
            {!uiClosed && needsSelection ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 font-bold text-amber-700">
                <Target size={compact ? 12 : 13} /> Cần chọn món ưu tiên
              </span>
            ) : null}
            {uiClosed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 font-bold text-emerald-700">
                <LockKeyhole size={compact ? 12 : 13} /> Phiên đã hoàn tất
              </span>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleActions}
          className={`flex flex-shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 hover:border-[#f59127] hover:text-[#f59127] ${
            compact ? "h-8 w-8" : "h-8 w-8 rounded-lg"
          }`}
          title={showActions ? "Ẩn thao tác" : "Hiện thao tác"}
        >
          <span className={`transition-transform duration-300 ${showActions ? "rotate-0" : "rotate-180"}`}>
            <ChevronUp size={compact ? 16 : 18} />
          </span>
        </button>
      </div>

      {!showActions ? (
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            disabled={!canMutateMeal}
            onClick={onOpenMealPicker}
            className={`${quickActionClass} ${quickActionClassName("warm")}`}
            title={mealActionLabel}
          >
            <UtensilsCrossed size={14} />
          </button>
          <button
            type="button"
            onClick={onOpenDietNotes}
            className={`${quickActionClass} ${quickActionClassName("cool")}`}
            title="Ghi chú"
          >
            <NotebookPen size={14} />
          </button>
          <button
            type="button"
            onClick={onOpenRecipes}
            className={`${quickActionClass} ${quickActionClassName("violet")}`}
            title="Công thức"
          >
            <BookOpenText size={14} />
          </button>
          <button
            type="button"
            disabled={!canComplete}
            onClick={onOpenComplete}
            className={`${quickActionClass} ${quickActionClassName("green")}`}
            title="Hoàn thành"
          >
            <CheckCircle2 size={14} />
          </button>
        </div>
      ) : null}

      <div
        className={`grid grid-cols-2 gap-2 overflow-hidden transition-all duration-300 ease-out ${
          showActions
            ? compact
              ? "mt-2.5 max-h-28 opacity-100"
              : "mt-2.5 max-h-28 opacity-100"
            : "pointer-events-none mt-0 max-h-0 opacity-0"
        }`}
      >
        <button
          type="button"
          disabled={!canMutateMeal}
          onClick={onOpenMealPicker}
          className={`${baseButtonClass} ${actionClassName("warm")} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {mealActionLabel}
        </button>
        <button
          type="button"
          onClick={onOpenDietNotes}
          className={`${baseButtonClass} ${actionClassName("cool")}`}
        >
          Ghi chú
        </button>
        <button
          type="button"
          onClick={onOpenRecipes}
          className={`${baseButtonClass} ${actionClassName("violet")}`}
        >
          Công thức
        </button>
        <button
          type="button"
          disabled={!canComplete}
          onClick={onOpenComplete}
          className={`${baseButtonClass} ${actionClassName("green")} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          Hoàn thành
        </button>
      </div>
    </div>
  );
}
