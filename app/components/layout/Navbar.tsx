// app/components/layout/Navbar.tsx
import { Link, useNavigate } from "react-router";
import { Refrigerator, Home, LogOut, Search as SearchIcon } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const userName = typeof window !== "undefined" ? localStorage.getItem("userName") : "";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      navigate(`/search?q=${encodeURIComponent(keyword.trim())}`);
      setKeyword(""); // Xóa trắng sau khi search
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/auth";
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        
        {/* Logo */}
        <Link to="/" className="text-2xl font-black text-[#f59127] tracking-tighter flex-shrink-0">
          BEPTROLY
        </Link>

        {/* THANH SEARCH Ở GIỮA */}
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

        {/* Menu điều hướng */}
        <div className="flex items-center gap-4 md:gap-6 flex-shrink-0">
          <Link to="/" className="flex items-center gap-1 text-gray-600 hover:text-[#f59127] transition-colors">
            <Home className="w-5 h-5" />
            <span className="text-sm font-bold hidden lg:block">Trang chủ</span>
          </Link>

          <Link to="/pantry" className="flex items-center gap-1 text-gray-600 hover:text-[#f59127] transition-colors">
            <Refrigerator className="w-5 h-5" />
            <span className="text-sm font-bold hidden lg:block">Tủ lạnh</span>
          </Link>

          <div className="h-6 w-[1px] bg-gray-200 mx-1 hidden sm:block"></div>

          {/* Thông tin User */}
          <div className="flex items-center gap-3">
            <span className="hidden xl:block text-sm font-medium text-gray-600">
              Chào, {userName ? userName.split(' ').pop() : "Bạn"}
            </span>
            
            <button 
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Đăng xuất"
            >
              <LogOut className="w-5 h-5" />
            </button>

            <Link 
              to="/profile" 
              title="Trang cá nhân"
              className="w-10 h-10 bg-[#f59127cc] text-white rounded-full flex items-center justify-center font-bold border-2 border-white shadow-sm hover:scale-105 transition-transform"
            >
              {userName ? userName.charAt(0).toUpperCase() : "U"}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}