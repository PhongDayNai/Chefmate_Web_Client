import { Trash2, Calendar, Scale, AlertTriangle } from "lucide-react";
import type { PantryItemType } from "../types";

interface Props {
  item: PantryItemType;
  onDelete: (id: number) => void;
  canDelete?: boolean;
}

function getExpiryStatus(expiresAt: string | null) {
  if (!expiresAt) return "safe";
  const now = new Date();
  const exp = new Date(expiresAt);
  const diffDays = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "expired";
  if (diffDays <= 1) return "soon";
  if (diffDays <= 3) return "warning";
  return "safe";
}

function getExpiryLabel(expiresAt: string | null) {
  if (!expiresAt) return null;
  const now = new Date();
  const exp = new Date(expiresAt);
  const diffDays = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return `Hết hạn ${Math.abs(Math.floor(diffDays))} ngày`;
  if (diffDays <= 1) return diffDays <= 0 ? "Hết hạn hôm nay!" : "Hết hạn ngày mai!";
  if (diffDays <= 3) return `Còn ${Math.floor(diffDays)} ngày`;
  return `HSD: ${exp.toLocaleDateString("vi-VN")}`;
}

export default function PantryItem({ item, onDelete, canDelete = true }: Props) {
  const status = getExpiryStatus(item.expiresAt);

  const statusStyles = {
    expired: "border-red-200 bg-red-50",
    soon: "border-orange-300 bg-orange-50",
    warning: "border-yellow-200 bg-yellow-50",
    safe: "border-gray-100 bg-white",
  };

  const badgeStyles = {
    expired: "bg-red-100 text-red-600",
    soon: "bg-orange-100 text-orange-600",
    warning: "bg-yellow-100 text-yellow-700",
    safe: "bg-orange-50 text-[#f59127]",
  };

  return (
    <div className={`p-5 rounded-[2rem] shadow-sm border flex justify-between items-center group transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${statusStyles[status]}`}>
      <div className="flex-1">
        <h3 className="font-black text-gray-800 text-lg uppercase tracking-tight">
          {item.ingredientName}
        </h3>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${badgeStyles[status]}`}>
            <Scale className="w-3.5 h-3.5" />
            <span className="text-sm font-bold">{item.quantity} {item.unit}</span>
          </div>
          {item.expiresAt && (
            <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${badgeStyles[status]}`}>
              {status === "expired" || status === "soon" ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : (
                <Calendar className="w-3.5 h-3.5" />
              )}
              <span>{getExpiryLabel(item.expiresAt)}</span>
            </div>
          )}
        </div>
      </div>
      {canDelete && (
        <button
          onClick={() => onDelete(item.pantryItemId)}
          className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}