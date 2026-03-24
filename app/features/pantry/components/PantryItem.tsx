import { Trash2, Calendar, Scale } from "lucide-react";
import type { PantryItemType } from "../types";

interface Props {
  item: PantryItemType;
  onDelete: (id: number) => void;
}

export default function PantryItem({ item, onDelete }: Props) {
  return (
    <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex justify-between items-center group hover:border-[#f59127cc] hover:shadow-md transition-all duration-300">
      <div className="flex-1">
        <h3 className="font-black text-gray-800 text-lg uppercase tracking-tight">
          {item.ingredientName}
        </h3>
        <div className="flex flex-wrap items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-[#f59127] rounded-full">
            <Scale className="w-3.5 h-3.5" />
            <span className="text-sm font-bold">{item.quantity} {item.unit}</span>
          </div>
          {item.expiresAt && (
            <div className="flex items-center gap-1.5 text-gray-400">
              <Calendar className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">
                Hết hạn: {new Date(item.expiresAt).toLocaleDateString('vi-VN')}
              </span>
            </div>
          )}
        </div>
      </div>
      <button 
        onClick={() => onDelete(item.pantryItemId)}
        className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
}