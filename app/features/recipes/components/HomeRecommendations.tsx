// app/features/recipes/components/HomeRecommendations.tsx
"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Refrigerator,
  LogIn,
} from "lucide-react";
import { pantryService } from "~/features/pantry/api/pantryService";
import { recommendationService } from "~/features/pantry/api/recommendationService";
import { API_BASE_URL } from "~/lib/apiConfig";
import type { PantryType, Recommendation } from "~/features/pantry/types";
import { checkAuth } from "~/utils/authUtils";

const VISIBLE_COUNT = 6;
const STEP = 3;
const GAP_PX = 16; // tailwind gap-4

export default function HomeRecommendations() {
  const [pantries, setPantries] = useState<PantryType[]>([]);
  const [selectedPantry, setSelectedPantry] = useState<PantryType | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPantryMenu, setShowPantryMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showNoPantryPrompt, setShowNoPantryPrompt] = useState(false);

  // Carousel state
  const trackContainerRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const [start, setStart] = useState(0);

  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch pantries on mount
  useEffect(() => {
    if (!checkAuth()) {
      setShowLoginPrompt(true);
      setIsLoading(false);
      return;
    }

    const fetchPantries = async () => {
      try {
        const res = await pantryService.getPantries();
        if (res.success) {
          if (res.data.length === 0) {
            setShowNoPantryPrompt(true);
            setIsLoading(false);
            return;
          }
          setPantries(res.data);
          setSelectedPantry(res.data[0]);
        }
      } catch (err) {
        setIsLoading(false);
      }
    };

    void fetchPantries();
  }, []);

  // Fetch recommendations when selected pantry changes
  useEffect(() => {
    if (!selectedPantry) return;

    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const fetch = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const payload = await recommendationService.getPersonalized(selectedPantry.pantryId);
        if (!cancelled) {
          const all = [...payload.readyToCook, ...payload.almostReady];
          all.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
          setRecommendations(all);
          setStart(0);
          setHasFetchedOnce(true);
        }
      } catch (err: any) {
        if (!cancelled) {
          if (err?.name === "AbortError" || err?.code === "ERR_CANCELED") return;
          setError("Không tải được đề xuất");
        }
      } finally {
        clearTimeout(timeoutId);
        if (!cancelled) setIsLoading(false);
      }
    };

    void fetch();
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [selectedPantry]);

  // Track width via ResizeObserver so card width responds to layout changes.
  useLayoutEffect(() => {
    const node = trackContainerRef.current;
    if (!node) return;

    const update = () => setTrackWidth(node.clientWidth);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowPantryMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectPantry = (p: PantryType) => {
    setSelectedPantry(p);
    setStart(0);
    setShowPantryMenu(false);
  };

  // Login prompt for non-authenticated users
  if (showLoginPrompt) {
    return (
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Hôm nay ăn gì?</h2>
        </div>
        <div className="bg-gray-50 rounded-2xl p-6 text-center border-2 border-dashed border-gray-200">
          <Refrigerator className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium mb-4">
            Đăng nhập để nhận đề xuất món ăn phù hợp với tủ lạnh của bạn
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#f59127] text-white rounded-xl font-bold hover:bg-[#e07d16] transition-all"
          >
            <LogIn className="w-4 h-4" />
            Đăng nhập ngay
          </Link>
        </div>
      </section>
    );
  }

  // No pantry prompt for authenticated users without any pantry
  if (showNoPantryPrompt) {
    return (
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Hôm nay ăn gì?</h2>
        </div>
        <div className="bg-gray-50 rounded-2xl p-6 text-center border-2 border-dashed border-gray-200">
          <Refrigerator className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium mb-4">
            Bạn chưa có tủ lạnh nào. Tạo tủ lạnh để nhận đề xuất món ăn phù hợp!
          </p>
          <Link
            href="/pantry"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#f59127] text-white rounded-xl font-bold hover:bg-[#e07d16] transition-all"
          >
            <Refrigerator className="w-4 h-4" />
            Tạo tủ lạnh ngay
          </Link>
        </div>
      </section>
    );
  }

  // Don't show section if no recommendations after having fetched at least once
  if (recommendations.length === 0 && hasFetchedOnce && !isLoading) {
    return null;
  }

  // Carousel math
  const cardWidth =
    trackWidth > 0
      ? (trackWidth - GAP_PX * (VISIBLE_COUNT - 1)) / VISIBLE_COUNT
      : 0;
  const maxStart = Math.max(0, recommendations.length - VISIBLE_COUNT);
  const clampedStart = Math.min(start, maxStart);
  const offsetPx = clampedStart * (cardWidth + GAP_PX);
  const canPrev = clampedStart > 0;
  const canNext = clampedStart < maxStart;
  const showArrows = recommendations.length > VISIBLE_COUNT;

  const handlePrev = () => setStart((s) => Math.max(0, s - STEP));
  const handleNext = () => setStart((s) => Math.min(maxStart, s + STEP));

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Hôm nay ăn gì?</h2>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowPantryMenu(!showPantryMenu)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors"
          >
            <Refrigerator className="w-4 h-4 text-[#f59127]" />
            <span className="font-medium text-sm">
              {selectedPantry?.name || "Chọn tủ lạnh"}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {showPantryMenu && (
            <div className="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-lg border border-gray-100 py-2 min-w-[180px] z-50">
              {pantries.map((p) => (
                <button
                  key={p.pantryId}
                  onClick={() => handleSelectPantry(p)}
                  className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 text-sm ${
                    selectedPantry?.pantryId === p.pantryId ? "bg-orange-50 text-[#f59127]" : "text-gray-700"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        {showArrows && (
          <>
            <CarouselArrow
              direction="prev"
              onClick={handlePrev}
              disabled={!canPrev}
            />
            <CarouselArrow
              direction="next"
              onClick={handleNext}
              disabled={!canNext}
            />
          </>
        )}

        <div ref={trackContainerRef} className="overflow-hidden">
          {isLoading ? (
            <div className="flex gap-4">
              {Array.from({ length: VISIBLE_COUNT }).map((_, i) => (
                <div
                  key={i}
                  style={{ width: cardWidth || undefined, flex: cardWidth ? "0 0 auto" : "1 1 0" }}
                  className="h-[260px] bg-gray-100 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <p className="text-red-500 text-sm">{error}</p>
          ) : (
            <div
              className="flex gap-4 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ transform: `translate3d(-${offsetPx}px, 0, 0)` }}
            >
              {recommendations.map((rec) => (
                <div
                  key={rec.recipeId}
                  style={{ width: cardWidth || 0, flex: "0 0 auto" }}
                >
                  <RecommendationCard recipe={rec} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CarouselArrow({
  direction,
  onClick,
  disabled,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  disabled: boolean;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  const positionClass = direction === "prev" ? "-left-4" : "-right-4";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "Xem món trước" : "Xem món tiếp"}
      className={`absolute top-1/2 ${positionClass} z-20 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-gray-700 transition-all duration-300 ease-out hover:bg-[#f59127] hover:text-white hover:scale-110 hover:shadow-lg active:scale-95 disabled:opacity-0 disabled:pointer-events-none`}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}

function RecommendationCard({ recipe }: { recipe: Recommendation }) {
  const imageUrl = recipe.image
    ? recipe.image.startsWith("http")
      ? recipe.image
      : `${API_BASE_URL}${recipe.image}`
    : null;

  const isReady =
    recipe.recommendationType === "ready_to_cook" ||
    recipe.recommendationType === "preference_match";
  const missingCount = recipe.missing?.length ?? 0;

  let badgeText: string;
  switch (recipe.recommendationType) {
    case "ready_to_cook":
      badgeText = "Nấu được";
      break;
    case "preference_match":
      badgeText = "Hợp gu";
      break;
    case "pantry_optimized":
      badgeText = "Tận dụng tủ";
      break;
    case "almost_ready":
      badgeText = missingCount > 0 ? `Thiếu ${missingCount}` : "Thiếu ít";
      break;
    default:
      badgeText = missingCount > 0 ? `Thiếu ${missingCount}` : "Đề xuất";
  }

  const reason = humanizeReason(recipe.reasons?.[0]);

  return (
    <Link
      href={`/recipe/${recipe.recipeId}`}
      className="group block h-[260px]"
    >
      <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 h-full flex flex-col">
        <div className="relative h-36 overflow-hidden flex-shrink-0">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={recipe.recipeName}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <Refrigerator className="w-12 h-12 text-gray-200" />
            </div>
          )}
          <div className="absolute top-2 right-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isReady ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
              }`}
            >
              {badgeText}
            </span>
          </div>
        </div>

        <div className="p-3 flex-1 flex flex-col">
          <h3 className="font-bold text-gray-800 text-sm line-clamp-1 group-hover:text-[#f59127] transition-colors">
            {recipe.recipeName}
          </h3>

          <p className="text-xs text-gray-500 mt-0.5 h-4 line-clamp-1">
            {recipe.cookingTime ?? "\u00A0"}
          </p>

          <p
            className="text-xs text-gray-400 mt-1 line-clamp-2 min-h-[2rem]"
            title={recipe.reasons?.[0]}
          >
            {reason ?? "\u00A0"}
          </p>
        </div>
      </div>
    </Link>
  );
}

// Map each backend reason string to a short, friendly Vietnamese phrase.
// We only translate the most common reasons; unknown text falls back to the original.
function humanizeReason(raw: string | undefined): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.includes("pantry")) return "Dùng nguyên liệu trong tủ";
  if (lower.includes("lighter")) return "Nhẹ hơn bữa gần đây";
  if (lower.includes("balance") || lower.includes("vegetable")) return "Cân bằng dinh dưỡng";
  if (lower.includes("quick") || lower.includes("fast")) return "Nấu nhanh";
  if (lower.includes("positive") || lower.includes("feedback")) return "Giống món bạn từng thích";
  if (lower.includes("diversity") || lower.includes("new")) return "Đổi vị một chút";
  return raw;
}
