"use client";

import { ChevronUp, LockKeyhole, Soup, Target } from "lucide-react";

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
  onToggleActions,
  onOpenMealPicker,
  onOpenDietNotes,
  onOpenRecipes,
  onOpenComplete,
}: Props) {
  const baseButtonClass = compact
    ? "rounded-xl px-2 py-2 text-xs font-black transition hover:brightness-95"
    : "rounded-full px-5 py-3.5 text-lg font-black transition hover:brightness-95";

  return (
    <div className={`rounded-2xl border border-[#efe3d1] bg-[#fbf3e7] ${compact ? "p-3" : "rounded-[1.8rem] p-4"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={`${compact ? "text-xs" : "text-[18px]"} truncate font-semibold leading-relaxed text-gray-700`}>
            Món đang chọn: <span className="font-black text-gray-900">{activeRecipeLabel}</span>
          </p>
          <p className={`${compact ? "mt-1 text-xs" : "mt-1 text-base"} truncate font-semibold leading-relaxed text-gray-700`}>
            Ghi chú: <span className="font-black text-gray-900">{dietSummary}</span>
          </p>

          <div className={`mt-3 flex flex-wrap items-center gap-2 ${compact ? "text-[11px]" : "text-xs"}`}>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 font-bold text-gray-600">
              <Soup size={compact ? 12 : 13} /> {mealCount} món
            </span>
            {needsSelection ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-700">
                <Target size={compact ? 12 : 13} /> Cần chọn món ưu tiên
              </span>
            ) : null}
            {uiClosed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-700">
                <LockKeyhole size={compact ? 12 : 13} /> Phiên đã hoàn tất
              </span>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleActions}
          className={`flex flex-shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 hover:border-[#f59127] hover:text-[#f59127] ${
            compact ? "h-8 w-8" : "h-9 w-9 rounded-xl"
          }`}
          title={showActions ? "Ẩn thao tác" : "Hiện thao tác"}
        >
          <span className={`transition-transform duration-300 ${showActions ? "rotate-0" : "rotate-180"}`}>
            <ChevronUp size={compact ? 16 : 18} />
          </span>
        </button>
      </div>

      <div
        className={`grid grid-cols-2 gap-2 overflow-hidden transition-all duration-300 ease-out ${
          showActions
            ? compact
              ? "mt-3 max-h-36 opacity-100"
              : "mt-4 max-h-48 opacity-100"
            : "pointer-events-none mt-0 max-h-0 opacity-0"
        }`}
      >
        <button
          type="button"
          disabled={!canMutateMeal}
          onClick={onOpenMealPicker}
          className={`${baseButtonClass} ${actionClassName("warm")} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          Chọn món
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
