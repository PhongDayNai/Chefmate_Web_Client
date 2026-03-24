// app/features/pantry/components/AddIngredientModal.tsx
import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newData: any) => void;
}

export default function AddIngredientModal({ isOpen, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({ name: "", qty: 1, unit: "kg", date: "" });
  const [suggestions, setSuggestions] = useState<any[]>([]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    // Giả lập gọi API upsert
    const payload = {
      userId: parseInt(userId),
      ingredientName: form.name,
      quantity: form.qty,
      unit: form.unit,
      expiresAt: form.date.replace("T", " ") // Format lại date cho đúng cURL
    };
    
    onSuccess(payload); // Trả dữ liệu về cho trang cha xử lý
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Overlay mờ */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Modal Content */}
      <div className="relative bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-gray-800">Thêm thực phẩm</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-500 mb-2">Tên nguyên liệu</label>
            <input 
              required
              type="text"
              placeholder="Ví dụ: Thịt bò, Trứng..."
              className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#f59127cc] outline-none font-medium"
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-500 mb-2">Số lượng</label>
              <input 
                type="number"
                className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#f59127cc] outline-none font-bold"
                value={form.qty}
                onChange={(e) => setForm({...form, qty: parseInt(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-500 mb-2">Đơn vị</label>
              <input 
                type="text"
                placeholder="kg, quả..."
                className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#f59127cc] outline-none"
                value={form.unit}
                onChange={(e) => setForm({...form, unit: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-500 mb-2">Ngày hết hạn (Nếu có)</label>
            <input 
              type="datetime-local"
              className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#f59127cc] outline-none font-medium text-gray-600"
              value={form.date}
              onChange={(e) => setForm({...form, date: e.target.value})}
            />
          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-[#f59127cc] hover:bg-[#f59127] text-white font-black rounded-2xl shadow-lg shadow-orange-200 transition-all mt-4 transform active:scale-95"
          >
            BỎ VÀO TỦ LẠNH 🧊
          </button>
        </form>
      </div>
    </div>
  );
}