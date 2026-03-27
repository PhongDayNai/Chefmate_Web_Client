"use client";

import Link from "next/link";
import { Heart, Clock, Users, Eye } from "lucide-react";
import { API_BASE_URL } from "~/lib/apiConfig";

interface RecipeProps {
  recipe: any;
}

export default function RecipeCard({ recipe }: RecipeProps) {
  const imageUrl = recipe.image.startsWith("http")
    ? recipe.image
    : `${API_BASE_URL}${recipe.image}`;

  return (
    <Link href={`/recipe/${recipe.recipeId}`} className="h-full">
      <div className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full">
        <div className="relative h-48 overflow-hidden">
          <img
            src={imageUrl}
            alt={recipe.recipeName}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm p-1.5 rounded-full shadow-sm cursor-pointer hover:bg-white transition-colors">
            <Heart className={`w-5 h-5 ${recipe.isLiked ? "fill-red-500 text-red-500" : "text-gray-600"}`} />
          </div>
          {recipe.tags?.[0] && (
            <span className="absolute bottom-3 left-3 bg-[#f59127cc] text-white text-xs font-bold px-2.5 py-1 rounded-lg">
              {recipe.tags[0].tagName}
            </span>
          )}
        </div>

        <div className="p-4 flex flex-col flex-grow">
          <h3 className="font-bold text-gray-800 text-lg line-clamp-1 group-hover:text-[#f59127] transition-colors">
            {recipe.recipeName}
          </h3>
          <p className="text-sm text-gray-500 mb-4 italic">bởi {recipe.userName}</p>

          <div className="grid grid-cols-3 gap-2 mt-auto">
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Clock className="w-3.5 h-3.5 text-[#f59127]" />
              {recipe.cookingTime}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Users className="w-3.5 h-3.5 text-[#f59127]" />
              {recipe.ration} người
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Eye className="w-3.5 h-3.5 text-[#f59127]" />
              {recipe.viewCount}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
