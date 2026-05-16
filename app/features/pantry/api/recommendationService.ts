// app/features/pantry/api/recommendationService.ts
import apiClient from "~/lib/apiClient";
import { buildApiUrl } from "~/lib/apiConfig";
import { getAuthUserId } from "~/utils/authUtils";
import type { Recommendation, RecommendationPayload } from "../types";

const BASE_URL = buildApiUrl("/v2/recommendations");

export type PersonalizedContext =
  | "normal"
  | "pantry_first"
  | "balance_recovery"
  | "quick_meal"
  | "light";

export interface PersonalizedOptions {
  pantryId?: number;
  limit?: number;
  /**
   * Optional explicit context. If omitted, BE picks one automatically (mode="auto").
   * Only pass when the user has explicitly selected a context in the UI.
   */
  context?: PersonalizedContext;
  /** Override userId. Defaults to the currently logged-in user. */
  userId?: number;
}

export const recommendationService = {
  getPersonalized: async (
    pantryIdOrOptions?: number | PersonalizedOptions,
    legacyLimit?: number,
  ): Promise<RecommendationPayload> => {
    // Backwards-compatible: support `getPersonalized(pantryId, limit)` and `getPersonalized({ ... })`.
    const opts: PersonalizedOptions =
      typeof pantryIdOrOptions === "object" && pantryIdOrOptions !== null
        ? pantryIdOrOptions
        : { pantryId: pantryIdOrOptions, limit: legacyLimit };

    const params: Record<string, string> = {};
    const userId = opts.userId ?? getAuthUserId();
    if (userId) params.userId = String(userId);
    if (opts.pantryId) params.pantryId = String(opts.pantryId);
    params.limit = String(opts.limit ?? 10);
    // Only attach `context` when the caller explicitly chose one. Skipping it lets
    // BE auto-detect (appliedContext.mode = "auto") which is the desired default.
    if (opts.context) params.context = opts.context;

    const res = await apiClient.get(`${BASE_URL}/personalized`, { params });
    // API may return either `{ success, data: {...} }` or the payload at the root.
    const raw = res.data;
    const payload = (raw && typeof raw === "object" && "data" in raw && raw.data)
      ? (raw.data as Partial<RecommendationPayload>)
      : (raw as Partial<RecommendationPayload>);
    return normalizeRecommendations(payload ?? {});
  },
};

function normalizeRecommendations(payload: Partial<RecommendationPayload>): RecommendationPayload {
  // New API returns `items` with recommendationType instead of completionRate.
  // Fall back across all possible source arrays so we never call .filter on undefined.
  const sourceItems: Recommendation[] =
    (payload.items && payload.items.length ? payload.items : undefined) ??
    (payload.recommendations && payload.recommendations.length ? payload.recommendations : undefined) ??
    [];

  // Classification based on recommendationType
  // ready_to_cook / preference_match = can make now
  // almost_ready / pantry_optimized = needs few more ingredients
  const readyToCook = payload.readyToCook?.length
    ? payload.readyToCook
    : sourceItems.filter((i) =>
        i.recommendationType === "ready_to_cook" ||
        i.recommendationType === "preference_match"
      );

  const almostReady = payload.almostReady?.length
    ? payload.almostReady
    : sourceItems.filter((i) =>
        i.recommendationType === "almost_ready" ||
        i.recommendationType === "pantry_optimized"
      );

  return {
    recommendationLimit: payload.recommendationLimit ?? sourceItems.length,
    context: payload.context,
    appliedContext: payload.appliedContext,
    profileConfidence: payload.profileConfidence,
    insights: payload.insights,
    items: sourceItems,
    recommendations: payload.recommendations?.length ? payload.recommendations : sourceItems,
    readyToCook,
    almostReady,
  };
}