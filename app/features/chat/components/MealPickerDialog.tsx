"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  Clock3,
  GripVertical,
  Plus,
  Sparkles,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import type { ChatRecommendation, MealItem, MealRecipeStatus } from "~/features/chat/types";

export interface MealPickerGroup {
  key: string;
  title: string;
  description: string;
  items: ChatRecommendation[];
}

interface Props {
  isOpen: boolean;
  compact?: boolean;
  mealItems: MealItem[];
  recommendationGroups: MealPickerGroup[];
  activeRecipeId: number | null;
  highlightedRecipeId?: number | null;
  isLocked?: boolean;
  isSaving?: boolean;
  onClose: () => void;
  onAddRecipe: (item: ChatRecommendation) => void;
  onRemoveRecipe: (recipeId: number) => void;
  onMoveRecipe: (recipeId: number, direction: "up" | "down") => void;
  onSetPrimaryRecipe: (recipeId: number) => void;
  onChangeStatus: (recipeId: number, status: MealRecipeStatus) => void;
}

const STATUS_OPTIONS: { value: MealRecipeStatus; label: string }[] = [
  { value: "pending", label: "Chờ nấu" },
  { value: "cooking", label: "Đang nấu" },
  { value: "done", label: "Đã xong" },
  { value: "skipped", label: "Bỏ qua" },
];

function statusToneClass(status: MealRecipeStatus): string {
  if (status === "cooking") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "done") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "skipped") return "border-slate-200 bg-slate-100 text-slate-600";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function MealPickerDialog({
  isOpen,
  compact = false,
  mealItems,
  recommendationGroups,
  activeRecipeId,
  highlightedRecipeId,
  isLocked = false,
  isSaving = false,
  onClose,
  onAddRecipe,
  onRemoveRecipe,
  onMoveRecipe,
  onSetPrimaryRecipe,
  onChangeStatus,
}: Props) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [openStatusRecipeId, setOpenStatusRecipeId] = useState<number | null>(null);
  const selectedIds = useMemo(() => new Set(mealItems.map((item) => item.recipeId)), [mealItems]);

  useEffect(() => {
    if (!isOpen) return;

    const nextOpenGroups = recommendationGroups.reduce<Record<string, boolean>>((acc, group) => {
      acc[group.key] = group.items.length > 0;
      return acc;
    }, {});
    setOpenGroups(nextOpenGroups);
    setOpenStatusRecipeId(null);
  }, [isOpen, recommendationGroups]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-4">
      <div className={`flex w-full flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ${compact ? "max-h-[78vh] max-w-2xl" : "max-h-[84vh] max-w-4xl"}`}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className={`${compact ? "text-lg" : "text-2xl"} font-black text-gray-900`}>Chọn món cho phiên chat</h3>
            <p className="mt-1 text-sm text-gray-500">
              Sắp xếp thứ tự auto next, chọn món ưu tiên hiện tại và thêm món từ gợi ý tủ lạnh.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className={`grid min-h-0 flex-1 bg-[#f8f6f1] ${compact ? "grid-cols-1 gap-0" : "grid-cols-[1.12fr,88px,0.88fr]"}`}>
          <section className="min-h-0 overflow-y-auto bg-[linear-gradient(180deg,#fffaf2_0%,#fffdf9_100%)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h4 className="text-base font-black text-gray-900">Danh sách món đã chọn</h4>
                <p className="text-xs text-[#8b7558]">Thứ tự ở đây là thứ tự ưu tiên auto next.</p>
              </div>
              {isSaving ? (
                <span className="rounded-full border border-[#f6d6a8] bg-[#fff1da] px-3 py-1 text-xs font-bold text-[#f59127]">Đang lưu...</span>
              ) : null}
            </div>

            {mealItems.length ? (
              <div className="space-y-3">
                {mealItems.map((item, index) => {
                  const isPrimary = activeRecipeId === item.recipeId;
                  const canMoveUp = index > 0;
                  const canMoveDown = index < mealItems.length - 1;

                  return (
                    <div
                      key={item.recipeId}
                      className={`rounded-[1.75rem] border px-4 py-4 shadow-[0_12px_28px_rgba(33,24,8,0.08)] transition ${
                        isPrimary ? "border-[#f0bf7e] bg-[linear-gradient(180deg,#fff6e6_0%,#fffaf2_100%)]" : "border-[#efe6da] bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1 rounded-2xl bg-[#f4efe6] p-2 text-[#a99b88]">
                          <GripVertical size={16} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#1f2a44] px-2.5 py-1 text-[11px] font-black text-white shadow-sm">
                              #{index + 1}
                            </span>
                            <p className="min-w-0 flex-1 truncate text-[15px] font-black text-gray-900">{item.recipeName}</p>
                            {isPrimary ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                                <CheckCircle2 size={12} /> Đang ưu tiên
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr),auto]">
                            <div className="relative">
                              <button
                                type="button"
                                disabled={isLocked || isSaving}
                                onClick={() =>
                                  setOpenStatusRecipeId((prev) => (prev === item.recipeId ? null : item.recipeId))
                                }
                                className={`flex w-full items-center justify-between rounded-2xl border px-3.5 py-3 text-sm font-black shadow-sm transition ${statusToneClass(item.status)} disabled:cursor-not-allowed disabled:opacity-60`}
                              >
                                <span>{STATUS_OPTIONS.find((option) => option.value === item.status)?.label || "Chờ nấu"}</span>
                                <ChevronDown
                                  size={16}
                                  className={`transition-transform ${openStatusRecipeId === item.recipeId ? "rotate-180" : ""}`}
                                />
                              </button>

                              {openStatusRecipeId === item.recipeId ? (
                                <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 rounded-2xl border border-[#eedfc8] bg-white p-2 shadow-[0_22px_40px_rgba(44,33,15,0.18)]">
                                  <div className="mb-1 px-2 py-1 text-[11px] font-black uppercase tracking-widest text-[#b28546]">
                                    Trạng thái món
                                  </div>
                                  <div className="space-y-1">
                                    {STATUS_OPTIONS.map((option) => {
                                      const isSelectedStatus = option.value === item.status;

                                      return (
                                        <button
                                          key={option.value}
                                          type="button"
                                          onClick={() => {
                                            setOpenStatusRecipeId(null);
                                            onChangeStatus(item.recipeId, option.value);
                                          }}
                                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
                                            isSelectedStatus
                                              ? "bg-[#fff3df] text-[#d88418]"
                                              : "text-gray-700 hover:bg-[#f8f4ed]"
                                          }`}
                                        >
                                          <span>{option.label}</span>
                                          {isSelectedStatus ? <CheckCircle2 size={15} className="text-[#d88418]" /> : null}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : null}
                            </div>

                            <button
                              type="button"
                              disabled={isLocked || isSaving || isPrimary}
                              onClick={() => onSetPrimaryRecipe(item.recipeId)}
                              className="rounded-2xl bg-[#fff1da] px-3 py-3 text-sm font-black text-[#f26f12] shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isPrimary ? "Đang ưu tiên" : "Ưu tiên hiện tại"}
                            </button>
                          </div>

                          <div className="mt-3 flex items-center justify-end gap-1 border-t border-[#f2e5d4] pt-3">
                            <div className="mr-auto rounded-full bg-[#fbf2e2] px-3 py-1.5 text-xs font-bold text-[#c9924c]">
                              {isPrimary ? "Bepes sẽ bám theo món này trước" : "Có thể đổi thứ tự hoặc đặt ưu tiên"}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={isLocked || isSaving || !canMoveUp}
                                onClick={() => onMoveRecipe(item.recipeId, "up")}
                                className="rounded-2xl border border-[#eadfce] bg-white p-2 text-gray-500 hover:border-[#f59127] hover:text-[#f59127] disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <ArrowUp size={16} />
                              </button>
                              <button
                                type="button"
                                disabled={isLocked || isSaving || !canMoveDown}
                                onClick={() => onMoveRecipe(item.recipeId, "down")}
                                className="rounded-2xl border border-[#eadfce] bg-white p-2 text-gray-500 hover:border-[#f59127] hover:text-[#f59127] disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <ArrowDown size={16} />
                              </button>
                              <button
                                type="button"
                                disabled={isLocked || isSaving}
                                onClick={() => onRemoveRecipe(item.recipeId)}
                                className="rounded-2xl border border-red-100 bg-white p-2 text-red-400 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-[#f0cf9f] bg-[#fff9f1] px-5 py-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                <p className="text-base font-black text-[#c98022]">Chưa có món nào trong phiên nấu</p>
                <p className="mt-2 text-sm text-[#966426]">Chọn món ở cột bên phải để bắt đầu lên kế hoạch bữa ăn.</p>
              </div>
            )}
          </section>

          <div className={`${compact ? "px-5 pb-1 pt-0" : "flex min-h-0 items-stretch justify-center px-2 py-5"}`}>
            {compact ? (
              <div className="relative h-14">
                <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-[#dcc8ab] to-transparent" />
                <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-[#eedfc9] bg-[#fff8ee] px-4 py-1.5 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-[#f0ba6c]" />
                  <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#c58c43]">
                    Thêm Món
                  </span>
                  <span className="h-2 w-2 rounded-full bg-[#f0ba6c]" />
                </div>
              </div>
            ) : (
              <div className="flex w-full flex-col items-center justify-center rounded-[999px] bg-[linear-gradient(180deg,#f1e7d8_0%,#fbf7f1_48%,#f1e7d8_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <div className="h-20 w-px bg-gradient-to-b from-transparent via-[#d5c0a1] to-transparent" />
                <div className="flex items-center gap-2 rounded-full border border-[#eedfc9] bg-[#fff8ee] px-3 py-2 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-[#f0ba6c]" />
                  <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#c58c43]">
                    Thêm Món
                  </span>
                  <span className="h-2 w-2 rounded-full bg-[#f0ba6c]" />
                </div>
                <div className="h-20 w-px bg-gradient-to-b from-transparent via-[#d5c0a1] to-transparent" />
              </div>
            )}
          </div>

          <section className="min-h-0 overflow-y-auto bg-[linear-gradient(180deg,#f7f4ef_0%,#f2eee8_100%)] p-5">
            <div className="mb-4 rounded-[1.5rem] border border-white/70 bg-white/70 px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="rounded-2xl bg-[#fff0d6] p-2 text-[#e28d1d]">
                  <Sparkles size={16} />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">Chọn món để bắt đầu nấu</p>
                  <p className="text-xs text-gray-500">Ưu tiên các món hợp với nguyên liệu hiện có, nhưng bạn vẫn có thể chọn món từ gợi ý để bắt đầu lên kế hoạch nấu tiếp.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {recommendationGroups.map((group) => {
                const isOpenGroup = openGroups[group.key];

                return (
                  <div key={group.key} className="overflow-hidden rounded-[1.6rem] border border-[#e7ddd0] bg-white shadow-[0_10px_24px_rgba(43,34,18,0.06)]">
                    <button
                      type="button"
                      onClick={() => setOpenGroups((prev) => ({ ...prev, [group.key]: !prev[group.key] }))}
                      className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                    >
                      <div>
                        <p className="text-base font-black text-gray-900">{group.title}</p>
                        <p className="mt-1 text-xs text-[#786b5a]">{group.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#f6f1ea] px-3 py-1 text-xs font-bold text-gray-500">
                          {group.items.length} món
                        </span>
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpenGroup ? "rotate-180" : ""}`} />
                      </div>
                    </button>

                    {isOpenGroup ? (
                      <div className="space-y-3 border-t border-[#efe4d5] bg-[#fffdfa] px-4 py-4">
                        {group.items.length ? (
                          group.items.map((item) => {
                            const isSelected = selectedIds.has(item.recipeId);
                            const isHighlighted = highlightedRecipeId === item.recipeId;

                            return (
                              <div
                                key={`${group.key}-${item.recipeId}`}
                                className={`rounded-2xl border bg-white px-4 py-3 transition ${
                                  isHighlighted ? "border-[#f5bd7b] ring-2 ring-[#ffe3be]" : "border-[#efe7db]"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0">
                                    <p className="font-black text-gray-900">{item.recipeName}</p>
                                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                      <span className="inline-flex items-center gap-1">
                                        <Clock3 size={12} /> {item.cookingTime || "Chưa rõ thời gian"}
                                      </span>
                                      <span className="inline-flex items-center gap-1">
                                        <Utensils size={12} /> {item.ration || 0} khẩu phần
                                      </span>
                                      {typeof item.missingIngredientsCount === "number" ? (
                                        <span>Thiếu {item.missingIngredientsCount} nguyên liệu</span>
                                      ) : null}
                                    </div>
                                    {item.missingIngredients?.length ? (
                                      <p className="mt-2 text-xs text-gray-500 line-clamp-2">
                                        Thiếu: {item.missingIngredients.join(", ")}
                                      </p>
                                    ) : null}
                                  </div>

                                  <button
                                    type="button"
                                    disabled={isLocked || isSaving || isSelected}
                                    onClick={() => onAddRecipe(item)}
                                    className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-black transition ${
                                      isSelected
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-[#fff1da] text-[#f26f12] hover:brightness-95"
                                    } disabled:cursor-not-allowed`}
                                  >
                                    {isSelected ? (
                                      <>
                                        <CheckCircle2 size={12} /> Đã chọn
                                      </>
                                    ) : (
                                      <>
                                        <Plus size={12} /> Thêm món
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="rounded-xl bg-white px-4 py-3 text-sm text-gray-400">Hiện chưa có món nào trong nhóm này.</p>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
