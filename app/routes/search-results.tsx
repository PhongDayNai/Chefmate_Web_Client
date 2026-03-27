// app/routes/search-results.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { recipeService } from "~/features/recipes/api/recipeService";
import RecipeCard from "~/features/recipes/components/RecipeCard";
import { Search } from "lucide-react";

export default function SearchResultsPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || ""; // Lấy chữ "Feijoada" từ URL
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      const userId = localStorage.getItem("userId") || "0";
      try {
        const res = await recipeService.searchRecipes(query, parseInt(userId));
        if (res.success) setRecipes(res.data);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    };

    if (query) fetchResults();
  }, [query]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 min-h-[60vh]">
      <div className="flex items-center gap-3 mb-10">
        <div className="p-3 bg-orange-100 rounded-2xl text-[#f59127]">
          <Search size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-900">Kết quả tìm kiếm</h1>
          <p className="text-gray-500 font-medium">Tìm thấy {recipes.length} kết quả cho "{query}"</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-64 bg-gray-100 rounded-[2.5rem] animate-pulse"></div>
          ))}
        </div>
      ) : recipes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {recipes.map((recipe: any) => (
            <RecipeCard key={recipe.recipeId} recipe={recipe} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
           <p className="text-gray-400 font-bold text-lg">Hic, không tìm thấy món "{query}" rồi...</p>
           <p className="text-sm text-gray-300">Thử tìm "Noodle" hoặc "Salad" xem sao bạn!</p>
        </div>
      )}
    </div>
  );
}
