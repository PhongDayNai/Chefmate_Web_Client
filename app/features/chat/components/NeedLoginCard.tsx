"use client";

import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function NeedLoginCard() {
  const router = useRouter();

  return (
    <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm text-orange-700 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Lock size={16} />
        <p className="font-semibold">Vui lòng đăng nhập để sử dụng đầy đủ tính năng chat với Bepes.</p>
      </div>
      <button
        onClick={() => router.push("/auth")}
        className="shrink-0 rounded-xl bg-[#f59127] px-4 py-2 text-xs font-black text-white hover:bg-[#e07d16] transition-colors"
      >
        Đăng nhập
      </button>
    </div>
  );
}
