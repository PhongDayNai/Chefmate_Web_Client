// app/features/recipes/components/RecipeCard.tsx
import { Heart, Clock, Users, Eye } from "lucide-react"; // npm install lucide-react
import { Link } from "react-router";

interface RecipeProps {
  recipe: any; // Sau này thay bằng interface chuẩn
}

export default function RecipeCard({ recipe }: RecipeProps) {
  // Fix đường dẫn ảnh nếu API trả về đường dẫn tương đối
  const imageUrl = recipe.image.startsWith('http') 
    ? recipe.image 
    : `https://your-api-url.com${recipe.image}`;

  return (
    <Link to={`/recipe/${recipe.recipeId}`} className="h-full">
        <div className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full">
        {/* Image Container */}
        <div className="relative h-48 overflow-hidden">
            <img 
            src={imageUrl} 
            alt={recipe.recipeName}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm p-1.5 rounded-full shadow-sm cursor-pointer hover:bg-white transition-colors">
            <Heart className={`w-5 h-5 ${recipe.isLiked ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
            </div>
            {/* Badge cho Tag đầu tiên */}
            {recipe.tags?.[0] && (
            <span className="absolute bottom-3 left-3 bg-[#f59127cc] text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                {recipe.tags[0].tagName}
            </span>
            )}
        </div>

        {/* Content */}
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