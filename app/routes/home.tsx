"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { recipeService } from "~/features/recipes/api/recipeService";
import RecipeList from "~/features/recipes/components/RecipeList";
import type { Recipe, TrendingPeriod } from "~/features/recipes/types";

const DEFAULT_LIMIT = 32;
const MAX_AUTO_LOAD_BATCHES = 2;

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [userName, setUserName] = useState("");
  const [period, setPeriod] = useState<TrendingPeriod>("all");
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const autoLoadCountRef = useRef(0);

  const fetchTrending = useCallback(
    async (reset = false, source: "auto" | "manual" | "reset" = "auto") => {
      if (loadingRef.current) return;
      if (!hasMoreRef.current && !reset) return;

      loadingRef.current = true;
      if (reset) {
        setIsInitialLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const rawUserId = localStorage.getItem("userId");
        const parsedUserId = rawUserId ? Number(rawUserId) : NaN;
        const userId = Number.isFinite(parsedUserId) && parsedUserId > 0 ? parsedUserId : undefined;

        const targetPage = reset ? 1 : pageRef.current;
        const res = await recipeService.getTrendingV2({
          userId,
          page: targetPage,
          limit: DEFAULT_LIMIT,
          period,
        });

        const newItems = Array.isArray(res?.data?.items) ? res.data.items : [];
        const pagination = res?.data?.pagination;

        setRecipes((prev) => {
          const base = reset ? [] : prev;
          const exists = new Set(base.map((item) => item.recipeId));
          const merged = newItems.filter((item) => !exists.has(item.recipeId));
          return [...base, ...merged];
        });

        const nextHasMore = Boolean(pagination?.hasMore);
        hasMoreRef.current = nextHasMore;
        setHasMore(nextHasMore);
        pageRef.current = targetPage + 1;

        if (!reset && source === "auto" && newItems.length > 0) {
          autoLoadCountRef.current += 1;
        }
      } finally {
        loadingRef.current = false;
        setIsInitialLoading(false);
        setIsLoadingMore(false);
      }
    },
    [period],
  );

  useEffect(() => {
    const savedName = localStorage.getItem("userName");
    if (savedName) setUserName(savedName);
  }, []);

  useEffect(() => {
    pageRef.current = 1;
    hasMoreRef.current = true;
    autoLoadCountRef.current = 0;
    setHasMore(true);
    void fetchTrending(true, "reset");
  }, [fetchTrending]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (!hasMoreRef.current || loadingRef.current) return;
        if (autoLoadCountRef.current >= MAX_AUTO_LOAD_BATCHES) return;
        void fetchTrending(false, "auto");
      },
      { root: null, rootMargin: "200px 0px", threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchTrending]);

  const showLoadMoreButton = hasMore && autoLoadCountRef.current >= MAX_AUTO_LOAD_BATCHES;

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-10 p-8 rounded-3xl bg-gradient-to-r from-[#f59127cc] to-[#f59127] text-white shadow-lg">
        <h2 className="text-3xl font-bold mb-2">
          Hôm nay nấu gì nhỉ, {userName ? userName.split(" ").pop() : ""}?
        </h2>
        <p className="opacity-90">Khám phá công thức nấu ăn dành riêng cho bạn.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {([
            { value: "all", label: "Toàn bộ" },
            { value: "7d", label: "7 ngày" },
            { value: "30d", label: "30 ngày" },
            { value: "90d", label: "90 ngày" },
          ] as { value: TrendingPeriod; label: string }[]).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPeriod(option.value)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                period === option.value ? "bg-white text-[#f59127]" : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <RecipeList recipes={recipes} title="Món ăn dành cho bạn" isLoading={isInitialLoading} />

      <div ref={loadMoreRef} className="py-8 text-center">
        {isLoadingMore ? <p className="text-gray-500 font-medium">Đang tải thêm món...</p> : null}
        {showLoadMoreButton && !isLoadingMore ? (
          <button
            type="button"
            onClick={() => void fetchTrending(false, "manual")}
            className="rounded-full bg-[#f59127] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#e07d16]"
          >
            Tải thêm món
          </button>
        ) : null}
        {!hasMore && recipes.length > 0 ? <p className="text-gray-400">Đã hiển thị hết món trending.</p> : null}
      </div>
    </main>
  );
}
