// app/routes/tag-results.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { recipeService } from "~/features/recipes/api/recipeService";
import RecipeCard from "~/features/recipes/components/RecipeCard";
import { ChevronLeft, Hash } from "lucide-react";

export default function TagResultsPage() {
  const params = useParams<{ tagName: string | string[] }>();
  const rawTagName = Array.isArray(params.tagName) ? params.tagName[0] : params.tagName;
  const tagName = decodeURIComponent(rawTagName || "").trim();
  const router = useRouter();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecipes = async () => {
      const rawUserId = localStorage.getItem("userId");
      const parsedUserId = rawUserId ? Number(rawUserId) : NaN;
      const userId = Number.isFinite(parsedUserId) && parsedUserId > 0 ? parsedUserId : undefined;
      if (!tagName) {
        setRecipes([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await recipeService.searchByTag(tagName, userId);
        if (res.success) setRecipes(res.data);
      } finally {
        setLoading(false);
      }
    };
    fetchRecipes();
  }, [tagName]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 p-6">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-all">
            <ChevronLeft size={24} className="text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-1 text-[#f59127] font-black text-xs uppercase tracking-widest mb-1">
              <Hash size={14} /> Danh mục
            </div>
            <h1 className="text-3xl font-black text-gray-900 capitalize">{tagName}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-10">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded-[2rem] animate-pulse"></div>
            ))}
          </div>
        ) : recipes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {recipes.map((recipe: any) => (
              <RecipeCard key={recipe.recipeId} recipe={recipe} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-400 font-bold">Chưa có món ăn nào thuộc danh mục này.</p>
          </div>
        )}
      </main>
    </div>
  );
}
