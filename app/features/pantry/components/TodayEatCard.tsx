// app/features/pantry/components/TodayEatCard.tsx
"use client";

import { useState, useEffect } from "react";
import { recommendationService } from "~/features/pantry/api/recommendationService";
import RecommendationItem from "./RecommendationItem";
import type { Recommendation } from "~/features/pantry/types";

interface Props {
  pantryId: number;
}

export default function TodayEatCard({ pantryId }: Props) {
  const [readyToCook, setReadyToCook] = useState<Recommendation[]>([]);
  const [almostReady, setAlmostReady] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pantryId) return;

    let cancelled = false;
    const fetch = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const payload = await recommendationService.getPersonalized(pantryId);
        if (!cancelled) {
          setReadyToCook(payload.readyToCook);
          setAlmostReady(payload.almostReady);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("TodayEatCard fetch error:", err);
          setError("Không tải được đề xuất");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetch();
    return () => {
      cancelled = true;
    };
  }, [pantryId]);

  if (!pantryId) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
      <h2 className="text-lg font-bold mb-3">Hôm nay ăn gì?</h2>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-20 bg-gray-100 rounded-lg" />
          <div className="h-20 bg-gray-100 rounded-lg" />
        </div>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <>
          {readyToCook.length > 0 && (
            <section className="mb-4">
              <h3 className="text-sm font-semibold text-green-600 mb-2 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                Có thể nấu ngay
              </h3>
              <div className="space-y-2">
                {readyToCook.map((rec) => (
                  <RecommendationItem key={rec.recipeId} recipe={rec} variant="ready" />
                ))}
              </div>
            </section>
          )}

          {almostReady.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-orange-500 mb-2 flex items-center gap-1">
                <span className="w-2 h-2 bg-orange-400 rounded-full" />
                Cần thêm nguyên liệu
              </h3>
              <div className="space-y-2">
                {almostReady.map((rec) => (
                  <RecommendationItem key={rec.recipeId} recipe={rec} variant="almost" />
                ))}
              </div>
            </section>
          )}

          {readyToCook.length === 0 && almostReady.length === 0 && (
            <p className="text-gray-500 text-sm">
              Thêm nguyên liệu vào tủ lạnh để nhận đề xuất
            </p>
          )}
        </>
      )}
    </div>
  );
}