// app/components/layout/Footer.tsx
import { Heart, Mail, Phone, ShieldCheck, Globe } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          {/* Cột 1: Thương hiệu */}
          <div className="col-span-1 md:col-span-1">
            <h2 className="text-2xl font-black text-[#f59127] mb-4 tracking-tighter">BEPTROLY</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Trợ lý nấu ăn thông minh giúp bạn quản lý thực phẩm và khám phá hàng ngàn công thức nấu ăn mỗi ngày.
            </p>
          </div>

          {/* Cột 2: Liên kết */}
          <div>
            <h3 className="font-bold text-gray-800 mb-4 uppercase text-xs tracking-widest">Khám phá</h3>
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="hover:text-[#f59127] cursor-pointer transition-colors">Công thức mới</li>
              <li className="hover:text-[#f59127] cursor-pointer transition-colors">Món ăn theo mùa</li>
              <li className="hover:text-[#f59127] cursor-pointer transition-colors">Blog nấu ăn</li>
            </ul>
          </div>

          {/* Cột 3: Liên hệ */}
          <div>
            <h3 className="font-bold text-gray-800 mb-4 uppercase text-xs tracking-widest">Liên hệ</h3>
            <ul className="space-y-3 text-sm text-gray-500">
              <li className="flex items-center gap-2"><Mail size={16}/> support@beptroly.vn</li>
              <li className="flex items-center gap-2"><Phone size={16}/> 1900 1234</li>
              <li className="flex items-center gap-2"><Globe size={16}/> www.beptroly.store</li>
            </ul>
          </div>

          {/* Cột 4: Chứng nhận & Tin cậy */}
          <div>
            <h3 className="font-bold text-gray-800 mb-4 uppercase text-xs tracking-widest">Tin cậy</h3>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold border border-green-100">
                <ShieldCheck size={12}/> AN TOÀN THỰC PHẨM
              </div>
              <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold border border-blue-100">
                <Heart size={12}/> VÌ SỨC KHỎE VIỆT
              </div>
            </div>
          </div>
        </div>

        {/* Dòng bản quyền dưới cùng */}
        <div className="pt-8 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-400">
            © 2026 BEPTROLY. All rights reserved. Made with ❤️ by Bui Cong Son &{" "}
            <a
              href="https://portfolio.phongdaynai.id.vn"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              PhongDayNai
            </a>
            .
          </p>
          <div className="flex gap-6 text-xs text-gray-400 font-medium">
            <span className="hover:underline cursor-pointer">Điều khoản</span>
            <span className="hover:underline cursor-pointer">Bảo mật</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
