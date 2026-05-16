// app/features/pantry/components/RecommendationItem.tsx
import Link from "next/link";
import { API_BASE_URL } from "~/lib/apiConfig";
import type { Recommendation } from "~/features/pantry/types";

interface Props {
  recipe: Recommendation;
  variant: "ready" | "almost";
}

function getRecommendationLabel(recipe: Recommendation, missingCount: number): string {
  switch (recipe.recommendationType) {
    case "ready_to_cook":
      return "Nấu được";
    case "preference_match":
      return "Hợp gu";
    case "pantry_optimized":
      return "Tận dụng tủ";
    case "almost_ready":
      return missingCount > 0 ? `Thiếu ${missingCount}` : "Thiếu ít";
    default:
      return missingCount > 0 ? `Thiếu ${missingCount}` : "Đề xuất";
  }
}

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

export default function RecommendationItem({ recipe, variant }: Props) {
  const borderColor = variant === "ready" ? "border-green-500" : "border-orange-400";
  const badgeColor =
    variant === "ready"
      ? "bg-green-100 text-green-700"
      : "bg-orange-100 text-orange-700";

  const imageUrl = recipe.image
    ? recipe.image.startsWith("http")
      ? recipe.image
      : `${API_BASE_URL}${recipe.image}`
    : null;

  const missingItems = recipe.missing ?? [];
  const badgeText = getRecommendationLabel(recipe, missingItems.length);
  const reason = humanizeReason(recipe.reasons?.[0]);

  return (
    <Link
      href={`/recipe/${recipe.recipeId}`}
      className={`flex items-center gap-3 p-3 rounded-xl border-2 ${borderColor} hover:shadow-md transition-shadow bg-white`}
    >
      {imageUrl && (
        <div className="w-14 h-14 relative rounded-lg overflow-hidden flex-shrink-0">
          <img src={imageUrl} alt={recipe.recipeName} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-bold text-gray-800 text-sm truncate">{recipe.recipeName}</h4>
          <span className={`text-xs px-2 py-0.5 rounded-full ${badgeColor}`}>
            {badgeText}
          </span>
        </div>

        {recipe.cookingTime && (
          <p className="text-xs text-gray-500 mt-0.5">{recipe.cookingTime}</p>
        )}

        {missingItems.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {missingItems.slice(0, 3).map((m, i) => (
              <span key={i} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                {m.ingredientName}
              </span>
            ))}
            {missingItems.length > 3 && (
              <span className="text-xs text-gray-400">+{missingItems.length - 3}</span>
            )}
          </div>
        ) : (
          reason && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-1" title={recipe.reasons?.[0]}>
              {reason}
            </p>
          )
        )}
      </div>
    </Link>
  );
}