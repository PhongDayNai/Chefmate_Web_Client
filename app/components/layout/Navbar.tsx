"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Refrigerator, Home, LogOut, Search as SearchIcon, PlusCircle } from "lucide-react";
import { useEffect, useState } from "react";

export default function Navbar() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    setUserName(localStorage.getItem("userName"));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      router.push(`/search?q=${encodeURIComponent(keyword.trim())}`);
      setKeyword("");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/auth";
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="text-2xl font-black text-[#f59127] tracking-tighter flex-shrink-0">
          BEPTROLY
        </Link>

        <form onSubmit={handleSearch} className="flex-1 max-w-md relative group hidden sm:block">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm món ăn ngon..."
            className="w-full bg-gray-50 px-12 py-2.5 rounded-2xl text-sm outline-none border border-transparent focus:border-[#f59127cc] focus:bg-white transition-all font-medium"
          />
          <SearchIcon className="absolute left-4 top-2.5 w-4 h-4 text-gray-400 group-focus-within:text-[#f59127]" />
        </form>

        <div className="flex items-center gap-3 md:gap-5 flex-shrink-0">
          <div className="flex items-center gap-4 mr-2">
            <Link href="/" className="flex items-center gap-1 text-gray-600 hover:text-[#f59127] transition-colors">
              <Home className="w-5 h-5" />
              <span className="text-sm font-bold hidden lg:block">Trang chủ</span>
            </Link>

            <Link
              href="/pantry"
              className="flex items-center gap-1 text-gray-600 hover:text-[#f59127] transition-colors"
            >
              <Refrigerator className="w-5 h-5" />
              <span className="text-sm font-bold hidden lg:block">Tủ lạnh</span>
            </Link>
          </div>

          <Link
            href="/create-recipe"
            className="flex items-center gap-2 px-4 py-2 bg-[#f59127] text-white rounded-xl font-bold hover:bg-[#e07d16] transition-all shadow-md shadow-orange-100 active:scale-95"
          >
            <PlusCircle size={18} />
            <span className="text-sm hidden md:block">Đăng món</span>
          </Link>

          <div className="h-6 w-[1px] bg-gray-200 hidden sm:block"></div>

          <div className="flex items-center gap-3">
            <div className="hidden xl:flex flex-col items-end">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Đầu bếp</span>
              <span className="text-sm font-bold text-gray-700 leading-none">
                {userName ? userName.split(" ").pop() : "Bạn"}
              </span>
            </div>

            <Link
              href="/profile"
              className="w-10 h-10 bg-[#f59127cc] text-white rounded-full flex items-center justify-center font-bold border-2 border-white shadow-sm hover:scale-105 transition-transform"
            >
              {userName ? userName.charAt(0).toUpperCase() : "U"}
            </Link>

            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Đăng xuất">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
