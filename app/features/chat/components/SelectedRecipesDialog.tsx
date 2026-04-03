"use client";

import { Loader2, X } from "lucide-react";
import RecipeCard from "~/features/recipes/components/RecipeCard";
import type { MealItem } from "~/features/chat/types";

interface RecipeEntry {
  mealItem: MealItem;
  recipe: any | null;
}

interface Props {
  isOpen: boolean;
  compact?: boolean;
  loading?: boolean;
  entries: RecipeEntry[];
  onClose: () => void;
  onOpenRecipe: (recipeId: number) => void;
}

export default function SelectedRecipesDialog({
  isOpen,
  compact = false,
  loading = false,
  entries,
  onClose,
  onOpenRecipe,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-4">
      <div className={`flex w-full flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ${compact ? "max-h-[78vh] max-w-3xl" : "max-h-[84vh] max-w-5xl"}`}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className={`${compact ? "text-lg" : "text-2xl"} font-black text-gray-900`}>Công thức trong phiên nấu</h3>
            <p className="mt-1 text-sm text-gray-500">Mỗi card giữ đúng style trang chính. Bấm vào card để mở công thức chi tiết.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#f59127]" />
            </div>
          ) : entries.length ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {entries.map(({ mealItem, recipe }, index) => (
                <div key={mealItem.recipeId} className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">Thứ tự {index + 1}</p>
                      <p className="text-sm font-bold text-gray-800">{mealItem.recipeName}</p>
                    </div>
                    {mealItem.status !== "pending" ? (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-black text-gray-600">
                        {mealItem.status}
                      </span>
                    ) : null}
                  </div>

                  {recipe ? (
                    <RecipeCard
                      recipe={recipe}
                      onClick={(e) => {
                        e.preventDefault();
                        onOpenRecipe(mealItem.recipeId);
                      }}
                    />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#f0cf9f] bg-[#fff8ef] p-5">
                      <p className="text-sm font-black text-[#d08124]">{mealItem.recipeName}</p>
                      <p className="mt-2 text-sm text-[#936026]">Chưa tải được preview chi tiết cho món này.</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[240px] items-center justify-center rounded-3xl border border-dashed border-[#f0cf9f] bg-[#fff8ef]">
              <p className="text-sm font-semibold text-[#936026]">Chưa có món nào để xem công thức.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
