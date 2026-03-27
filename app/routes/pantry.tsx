import { useEffect, useState } from "react";
import { pantryService } from "~/features/pantry/api/pantryService";
import PantryItem from "~/features/pantry/components/PantryItem";
import AddIngredientModal from "~/features/pantry/components/AddIngredientModal";
import { useAuthGuard } from "~/hooks/useAuthGuard";
import { Plus, Refrigerator, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import type { PantryItemType } from "~/features/pantry/types";

export default function PantryPage() {
  const navigate = useNavigate();
  const { requireAuth } = useAuthGuard();
  const [items, setItems] = useState<PantryItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);

  const fetchPantry = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const res = await pantryService.getByUser(parseInt(userId));
      if (res.success) setItems(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPantry(); }, []);

  const handleOpenModal = () => {
    if (!requireAuth()) return;
    setModalOpen(true);
  };

  const handleAddIngredient = async (payload: any) => {
    try {
      const res = await pantryService.upsert(payload);
      if (res.success) {
        toast.success("Đã thêm vào tủ lạnh!");
        setItems(res.data); // API upsert trả về danh sách mới
        setModalOpen(false);
      }
    } catch (error) {
      toast.error("Không thêm được đồ, thử lại nhé!");
    }
  };

  const handleDelete = async (itemId: number) => {
    if (!requireAuth()) return;

    const userId = localStorage.getItem("userId");
    if (!userId || !confirm("Bạn có chắc muốn bỏ nguyên liệu này?")) return;

    try {
      const res = await pantryService.delete(parseInt(userId), itemId);
      if (res.success) {
        toast.success("Đã xóa khỏi tủ lạnh");
        fetchPantry();
      }
    } catch (error) {
      toast.error("Lỗi khi xóa!");
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-32">
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 p-4">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <button onClick={() => navigate("/")} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div className="flex items-center gap-2">
              <Refrigerator className="text-[#f59127] w-6 h-6" />
              <h1 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Tủ lạnh của tôi</h1>
            </div>
            <button
              onClick={handleOpenModal}
              className="bg-[#f59127cc] text-white p-2.5 rounded-2xl hover:bg-[#f59127] shadow-lg shadow-orange-200 transition-all"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto p-4 mt-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#f59127]"></div>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
              <Refrigerator className="w-20 h-20 text-gray-100 mx-auto mb-6" />
              <p className="text-gray-400 font-bold text-lg">Tủ lạnh của bạn đang trống!</p>
              <button onClick={handleOpenModal} className="mt-4 text-[#f59127] font-bold hover:underline">
                Thêm món đầu tiên ngay
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {items.map((item) => (
                <PantryItem key={item.pantryItemId} item={item} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </main>

        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xs px-4">
          <button className="w-full py-5 bg-gray-900 text-white rounded-[2rem] shadow-2xl font-black hover:scale-105 transition-all flex items-center justify-center gap-3">
            🍳 GỢI Ý MÓN ĂN
          </button>
        </div>
      </div>

      <AddIngredientModal 
        isOpen={isModalOpen} 
        onClose={() => setModalOpen(false)} 
        onSuccess={handleAddIngredient} 
      />
    </>
  );
}