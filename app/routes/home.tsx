// app/routes/home.tsx
import { useEffect, useState } from "react";
import { recipeService } from "~/features/recipes/api/recipeService";
import RecipeList from "~/features/recipes/components/RecipeList";

export default function Home() {
  const [recipes, setRecipes] = useState([]);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const savedName = localStorage.getItem("userName");
    const savedUserId = localStorage.getItem("userId");
    if (savedName) setUserName(savedName);

    const userId = savedUserId ? parseInt(savedUserId) : 0;
    recipeService.getTopTrendingLegacy(userId).then((res) => {
      if (res.success) setRecipes(res.data);
    });
  }, []);

  return (
    // XÓA Navbar và div bao ngoài min-h-screen ở đây
    <main className="max-w-7xl mx-auto px-4 py-8">
      {/* Banner */}
      <div className="mb-10 p-8 rounded-3xl bg-gradient-to-r from-[#f59127cc] to-[#f59127] text-white shadow-lg">
        <h2 className="text-3xl font-bold mb-2">
          Hôm nay nấu gì nhỉ, {userName ? userName.split(' ').pop() : ""}?
        </h2>
        <p className="opacity-90">Khám phá công thức nấu ăn dành riêng cho bạn.</p>
      </div>

      {/* Danh sách */}
      <RecipeList recipes={recipes} title="Món ăn dành cho bạn" />
    </main>
  );
}