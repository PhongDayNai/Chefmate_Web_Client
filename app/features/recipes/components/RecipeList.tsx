// app/features/recipes/components/RecipeList.tsx
import RecipeCard from "./RecipeCard";
import type { Recipe } from "../types";

interface Props {
  recipes: Recipe[];
  title?: string;
  isLoading?: boolean;
  emptyText?: string;
}

export default function RecipeList({ recipes, title, isLoading = false, emptyText = "Chưa có món nào phù hợp." }: Props) {
  if (recipes.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">{isLoading ? "Đang tải món ăn ngon..." : emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {title && <h2 className="text-2xl font-bold text-gray-800">{title}</h2>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {recipes.map((item) => (
          <RecipeCard key={item.recipeId} recipe={item} />
        ))}
      </div>
    </div>
  );
}
