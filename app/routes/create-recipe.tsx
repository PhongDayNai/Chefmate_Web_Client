// app/routes/create-recipe.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { recipeService } from "~/features/recipes/api/recipeService";
import { useAuthGuard } from "~/hooks/useAuthGuard";
import {
  Camera,
  Plus,
  Minus,
  Trash2,
  Clock,
  Users,
  ChefHat,
  ChevronLeft,
  ArrowRight,
  Hash,
  X
} from "lucide-react";
import toast from "react-hot-toast";

export default function CreateRecipe() {
  const MIN_RATION = 1;
  const MAX_RATION = 99;

  const router = useRouter();
  const { requireAuth } = useAuthGuard();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    recipeName: "",
    cookingTime: "30 mins",
    ration: 2,
    image: null as File | null,
  });

  const [ingredients, setIngredients] = useState([
    { ingredientName: "", weight: "", unit: "g", isMain: true, isCommon: false }
  ]);

  const [steps, setSteps] = useState([{ content: "" }]);
  
  // State quản lý Tags
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Xử lý thêm Tag khi nhấn Enter
  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = tagInput.trim();
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
        setTagInput("");
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, image: file });
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const addIngredient = () => setIngredients([...ingredients, { ingredientName: "", weight: "", unit: "g", isMain: false, isCommon: false }]);
  const removeIngredient = (index: number) => setIngredients(ingredients.filter((_, i) => i !== index));

  const addStep = () => setSteps([...steps, { content: "" }]);
  const removeStep = (index: number) => setSteps(steps.filter((_, i) => i !== index));

  const sanitizeRation = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "");
    if (!digitsOnly) return null;

    const parsed = Number.parseInt(digitsOnly, 10);
    if (Number.isNaN(parsed)) return null;

    return Math.max(MIN_RATION, Math.min(MAX_RATION, parsed));
  };

  const handleRationInput = (value: string) => {
    const sanitized = sanitizeRation(value);
    if (sanitized === null) return;
    setFormData((prev) => ({ ...prev, ration: sanitized }));
  };

  const increaseRation = () => {
    setFormData((prev) => ({ ...prev, ration: Math.min(MAX_RATION, prev.ration + 1) }));
  };

  const decreaseRation = () => {
    setFormData((prev) => ({ ...prev, ration: Math.max(MIN_RATION, prev.ration - 1) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check authentication
    if (!requireAuth()) return;

    if (!formData.image) return toast.error("Vui lòng chọn ảnh món ăn!");

    const userId = localStorage.getItem("userId");
    if (!userId) {
      toast.error("Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.");
      setLoading(false);
      return;
    }
    setLoading(true);
    const body = new FormData();
    body.append("recipeName", formData.recipeName);
    body.append("cookingTime", formData.cookingTime);
    body.append("ration", formData.ration.toString());
    body.append("userId", userId);
    body.append("image", formData.image);
    
    // Format mảng object thành JSON string theo yêu cầu Backend
    body.append("ingredients", JSON.stringify(ingredients));
    body.append("cookingSteps", JSON.stringify(steps));
    
    // Format mảng string tags thành JSON string
    const formattedTags = tags.map(t => ({ tagName: t }));
    body.append("tags", JSON.stringify(formattedTags));

    try {
      const res = await recipeService.createRecipe(body);
      if (res.success) {
        toast.success("Đăng công thức thành công!");
        router.push(`/recipe/${res.data}`);
      }
    } catch (error) {
      toast.error("Có lỗi xảy ra khi tạo công thức");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-4xl mx-auto px-6 pt-10">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 font-bold mb-6 hover:text-black transition-colors">
          <ChevronLeft size={20} /> Quay lại
        </button>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 1. Upload Ảnh */}
          <div className="relative h-[400px] w-full bg-white rounded-[3rem] overflow-hidden border-4 border-dashed border-gray-200 group hover:border-[#f59127cc] transition-all">
            {imagePreview ? (
              <>
                <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                   <label className="cursor-pointer bg-white p-4 rounded-2xl font-black shadow-xl flex items-center gap-2 transform hover:scale-105 transition-transform">
                     <Camera size={20} /> Thay đổi ảnh
                     <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                   </label>
                </div>
              </>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="p-6 bg-orange-50 rounded-full text-[#f59127] mb-4">
                  <Camera size={40} />
                </div>
                <span className="text-xl font-black text-gray-400">Tải ảnh món ăn bắt mắt</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
              </label>
            )}
          </div>

          <div className="bg-white p-10 rounded-[3rem] shadow-xl shadow-gray-200/50 space-y-8 border border-gray-50">
            {/* 2. Tên món ăn */}
            <input 
              required
              placeholder="Tên món ăn của bạn..."
              className="text-4xl font-black w-full outline-none placeholder:text-gray-200 text-gray-800"
              value={formData.recipeName}
              onChange={e => setFormData({...formData, recipeName: e.target.value})}
            />

            {/* 3. Tags (MỚI THÊM) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[#f59127]">
                <Hash size={20} />
                <span className="font-black text-sm uppercase tracking-widest">Gắn thẻ danh mục</span>
              </div>
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-[1.5rem] border border-transparent focus-within:border-orange-200 focus-within:bg-white transition-all">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-[#f59127] text-white text-xs font-bold rounded-full animate-in zoom-in duration-300">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)}><X size={14}/></button>
                  </span>
                ))}
                <input 
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder={tags.length === 0 ? "Ví dụ: Seafood, Healthy (Nhấn Enter để thêm)" : "Thêm tag..."}
                  className="flex-1 bg-transparent outline-none text-sm font-medium min-w-[200px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 border-y border-gray-100 py-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-50 rounded-2xl text-[#f59127]"><Clock /></div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase text-gray-400">Thời gian</p>
                  <input value={formData.cookingTime} onChange={e => setFormData({...formData, cookingTime: e.target.value})} className="font-bold outline-none w-full" placeholder="30 phút" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-50 rounded-2xl text-[#f59127]"><Users /></div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase text-gray-400">Khẩu phần</p>
                  <div className="flex items-center justify-between gap-2 rounded-2xl bg-gray-50 px-2 py-1.5 ring-1 ring-transparent transition-all focus-within:bg-white focus-within:ring-[#f59127]/40">
                    <button
                      type="button"
                      onClick={decreaseRation}
                      disabled={formData.ration <= MIN_RATION}
                      className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      aria-label="Giảm khẩu phần"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.ration}
                      onChange={(e) => handleRationInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      className="w-full bg-transparent text-center font-bold outline-none"
                      aria-label="Khẩu phần"
                    />
                    <button
                      type="button"
                      onClick={increaseRation}
                      disabled={formData.ration >= MAX_RATION}
                      className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      aria-label="Tăng khẩu phần"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Nguyên liệu */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black flex items-center gap-2 text-gray-800"><ChefHat className="text-[#f59127]" /> Nguyên liệu</h3>
                <button type="button" onClick={addIngredient} className="p-2 bg-orange-50 text-[#f59127] rounded-xl hover:bg-[#f59127] hover:text-white transition-all">
                  <Plus size={20} />
                </button>
              </div>
              <div className="space-y-3">
                {ingredients.map((ing, idx) => (
                  <div key={idx} className="flex gap-3 animate-in slide-in-from-left-2 duration-300">
                    <input 
                      className="flex-[2] p-4 bg-gray-50 rounded-2xl font-bold outline-none focus:bg-white focus:ring-2 focus:ring-[#f59127cc] transition-all" 
                      placeholder="Tên nguyên liệu"
                      value={ing.ingredientName}
                      onChange={e => {
                        const newIngs = [...ingredients];
                        newIngs[idx].ingredientName = e.target.value;
                        setIngredients(newIngs);
                      }}
                    />
                    <input 
                      className="flex-1 p-4 bg-gray-50 rounded-2xl font-bold outline-none text-center focus:bg-white transition-all" 
                      placeholder="Lượng"
                      value={ing.weight}
                      onChange={e => {
                        const newIngs = [...ingredients];
                        newIngs[idx].weight = e.target.value;
                        setIngredients(newIngs);
                      }}
                    />
                    <input 
                      className="w-20 p-4 bg-gray-50 rounded-2xl font-bold outline-none text-center focus:bg-white transition-all" 
                      placeholder="ĐV"
                      value={ing.unit}
                      onChange={e => {
                        const newIngs = [...ingredients];
                        newIngs[idx].unit = e.target.value;
                        setIngredients(newIngs);
                      }}
                    />
                    <button type="button" onClick={() => removeIngredient(idx)} className="p-4 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Các bước nấu */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-800 border-l-4 border-[#f59127] pl-4">Các bước thực hiện</h3>
                <button type="button" onClick={addStep} className="p-2 bg-orange-50 text-[#f59127] rounded-xl hover:bg-[#f59127] hover:text-white transition-all">
                  <Plus size={20} />
                </button>
              </div>
              <div className="space-y-6">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex gap-4 group">
                    <div className="w-10 h-10 bg-gray-900 group-hover:bg-[#f59127] text-white rounded-xl flex items-center justify-center font-black flex-none shadow-lg transition-colors">
                      {idx + 1}
                    </div>
                    <textarea 
                      className="flex-1 p-4 bg-gray-50 rounded-2xl font-medium outline-none focus:bg-white focus:ring-2 focus:ring-[#f59127cc] min-h-[100px] transition-all" 
                      placeholder={`Bước ${idx + 1} làm gì nhỉ...`}
                      value={step.content}
                      onChange={e => {
                        const newSteps = [...steps];
                        newSteps[idx].content = e.target.value;
                        setSteps(newSteps);
                      }}
                    />
                    <button type="button" onClick={() => removeStep(idx)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 self-start transition-all">
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button 
              disabled={loading}
              className="w-full py-6 bg-gray-900 text-white rounded-[2rem] font-black text-xl shadow-2xl flex items-center justify-center gap-3 hover:bg-black hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-10"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>XUẤT BẢN CÔNG THỨC <ArrowRight /></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
