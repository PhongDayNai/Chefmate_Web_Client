// app/routes/recipe-detail.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { recipeService } from "~/features/recipes/api/recipeService";
import { interactionService } from "~/features/interactions/api/interactionService";
import { useAuthGuard } from "~/hooks/useAuthGuard";
import { API_BASE_URL } from "~/lib/apiConfig";
import {
  Clock,
  Users,
  ChevronLeft,
  CheckCircle2,
  Heart,
  MessageCircle,
  Send,
  Trash2,
} from "lucide-react";
import type { Recipe } from "~/features/recipes/types";
import toast from "react-hot-toast";

export default function RecipeDetail() {
  const params = useParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { requireAuth } = useAuthGuard();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [comment, setComment] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Lấy userId hiện tại từ localStorage
  const currentUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  // Hàm load lại dữ liệu món ăn
  const loadRecipe = async () => {
    if (!id) return;
    const data = await recipeService.getRecipeById(parseInt(id));
    if (data) {
      setRecipe(data);
      setIsLiked(data.isLiked || false);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (id) {
      interactionService.increaseView(parseInt(id));
      loadRecipe();
    }
  }, [id]);

  // Xử lý Thả tim
  const handleLike = async () => {
    if (!requireAuth()) return;

    const res = await interactionService.likeRecipe(parseInt(currentUserId!), recipe!.recipeId);
    if (res.success) {
      setIsLiked(!isLiked);
      toast.success(isLiked ? "Đã bỏ yêu thích" : "Đã thêm vào yêu thích");
    }
  };

  // Xử lý gửi bình luận
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!requireAuth()) return;

    if (!comment.trim()) return;

    const res = await interactionService.createComment(parseInt(currentUserId!), recipe!.recipeId, comment);
    if (res.success) {
      toast.success("Đã gửi bình luận!");
      setComment("");
      loadRecipe();
    }
  };

  // Xử lý xóa bình luận
  const handleDeleteComment = async (commentId: number) => {
    if (!requireAuth()) return;

    try {
      const res = await interactionService.deleteComment(commentId);
      if (res.success) {
        toast.success("Đã xóa bình luận!");
        loadRecipe(); // Refresh danh sách bình luận
      }
    } catch (error) {
      toast.error("Xóa bình luận thất bại");
    }
  };

  if (loading) return <div className="p-20 text-center font-bold text-gray-400">Đang chuẩn bị công thức...</div>;
  if (!recipe) return <div className="p-20 text-center text-red-500">Không tìm thấy công thức này!</div>;

  const imageUrl = recipe.image.startsWith("http") ? recipe.image : `${API_BASE_URL}${recipe.image}`;

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="relative h-[45vh] w-full">
        <img src={imageUrl} alt={recipe.recipeName} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <button 
          onClick={() => router.back()}
          className="absolute top-6 left-6 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      </div>

      <main className="max-w-5xl mx-auto px-6 -mt-20 relative z-10">
        <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl border border-gray-100">
          
          <div className="flex justify-end -mt-20 mb-8">
            <button 
              onClick={handleLike}
              className={`p-5 rounded-full shadow-2xl transition-all transform active:scale-90 border-4 border-white ${isLiked ? 'bg-red-500 text-white' : 'bg-white text-gray-400'}`}
            >
              <Heart className={`w-8 h-8 ${isLiked ? 'fill-current' : ''}`} />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {recipe.tags?.map(tag => (
                <Link 
                  key={tag.tagId} 
                  href={`/tag/${tag.tagName}`}
                  className="px-4 py-1.5 bg-orange-50 text-[#f59127] text-[10px] font-black uppercase rounded-full tracking-widest hover:bg-[#f59127] hover:text-white transition-all shadow-sm"
                >
                  {tag.tagName}
                </Link>
            ))}
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 leading-tight">
            {recipe.recipeName}
          </h1>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center font-bold text-xs uppercase">
               {recipe.userName.charAt(0)}
            </div>
            <p className="text-gray-500 font-medium">Chia sẻ bởi <span className="text-gray-900 font-bold">{recipe.userName}</span></p>
          </div>

          <div className="grid grid-cols-2 gap-4 py-8 border-y border-gray-100 mb-10">
            <div className="flex items-center gap-4 justify-center md:justify-start">
              <div className="p-3 bg-orange-100 rounded-2xl text-[#f59127]"><Clock className="w-6 h-6" /></div>
              <div><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Thời gian</p><p className="font-black text-lg">{recipe.cookingTime}</p></div>
            </div>
            <div className="flex items-center gap-4 justify-center md:justify-start">
              <div className="p-3 bg-orange-100 rounded-2xl text-[#f59127]"><Users className="w-6 h-6" /></div>
              <div><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Khẩu phần</p><p className="font-black text-lg">{recipe.ration} người</p></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            <div className="lg:col-span-1">
              <h3 className="text-2xl font-black mb-8 text-gray-800">Nguyên liệu</h3>
              <ul className="space-y-4">
                {recipe.ingredients?.map((ing) => (
                  <li key={ing.ingredientId} className="group flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-transparent hover:border-orange-200 transition-all">
                    <span className={`font-bold ${ing.isMain ? 'text-[#f59127]' : 'text-gray-700'}`}>
                      {ing.ingredientName}
                    </span>
                    <span className="text-sm font-black text-gray-400 group-hover:text-[#f59127]">{ing.weight} {ing.unit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-2">
              <h3 className="text-2xl font-black mb-8 text-gray-800">Các bước thực hiện</h3>
              <div className="space-y-10">
                {recipe.cookingSteps?.map((step) => (
                  <div key={step.indexStep} className="flex gap-6">
                    <div className="flex-none w-10 h-10 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-black text-sm shadow-xl">
                      {step.indexStep}
                    </div>
                    <div className="pt-2">
                      <p className="text-gray-700 leading-relaxed font-medium text-lg">{step.stepContent}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <button className="w-full mt-16 py-5 bg-[#f59127cc] hover:bg-[#f59127] text-white font-black rounded-[2rem] shadow-xl shadow-orange-100 flex items-center justify-center gap-3 transition-all transform active:scale-95">
                <CheckCircle2 className="w-6 h-6" /> HOÀN THÀNH MÓN ĂN
              </button>
            </div>
          </div>

          <div className="mt-20 pt-12 border-t border-gray-100">
             <h3 className="text-2xl font-black mb-10 flex items-center gap-3">
                <MessageCircle className="text-[#f59127]" /> 
                Thảo luận ({recipe.comments?.length || 0})
             </h3>

             <form onSubmit={handleSendComment} className="flex gap-4 mb-12">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex-none flex items-center justify-center font-black text-[#f59127] uppercase">
                   {currentUserId ? (localStorage.getItem("userName")?.charAt(0) || "U") : "U"}
                </div>
                <div className="flex-1 relative">
                   <input 
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Chia sẻ mẹo nấu món này của bạn..."
                      className="w-full p-4 pr-16 bg-gray-50 border-none rounded-[1.5rem] outline-none focus:ring-2 focus:ring-[#f59127cc] font-medium"
                   />
                   <button type="submit" className="absolute right-2 top-2 p-2.5 bg-[#f59127cc] text-white rounded-2xl hover:bg-[#f59127] transition-all">
                      <Send size={20} />
                   </button>
                </div>
             </form>

             <div className="space-y-8">
                {recipe.comments?.length > 0 ? (
                  recipe.comments.map((cmt: any) => (
                    <div key={cmt.commentId} className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500 group">
                       <div className="w-10 h-10 bg-gray-100 rounded-full flex-none flex items-center justify-center text-gray-400 font-bold text-xs uppercase">
                          {cmt.userName?.charAt(0)}
                       </div>
                       <div className="flex-1">
                          <div className="bg-gray-50 p-5 rounded-[1.5rem] relative hover:bg-orange-50/50 transition-colors">
                             <div className="flex justify-between items-center mb-1">
                                <p className="font-black text-xs text-[#f59127] uppercase">{cmt.userName}</p>
                                
                                {/* Chỉ hiện nút xóa nếu comment thuộc về User đang đăng nhập */}
                                {currentUserId && parseInt(currentUserId) === cmt.userId && (
                                  <button 
                                    onClick={() => handleDeleteComment(cmt.commentId)}
                                    className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                    title="Xóa bình luận"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                             </div>
                             <p className="text-gray-700 leading-relaxed font-medium">{cmt.content}</p>
                          </div>
                       </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-400 italic">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
                )}
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
