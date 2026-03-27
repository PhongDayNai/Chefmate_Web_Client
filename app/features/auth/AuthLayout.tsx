// app/features/auth/AuthLayout.tsx
import React from "react";
import authBgImage from "~/assets/images/hoc-nau-an-gia-dinh-o-dau-tot.jpg"; 

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function AuthLayout({ children, title }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Phần bên trái: Hình ảnh nền sạch & Chữ màu cam */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden bg-white">
        
        {/* CHÈN ẢNH NỀN: Tối ưu độ nét */}
        <img 
          src={authBgImage.src} 
          alt="BEPTROLY Background" 
          className="absolute inset-0 w-full h-full object-cover z-0 brightness-110"
          style={{ 
            imageRendering: 'auto', // Giúp ảnh mượt hơn
            filter: 'contrast(1.05) saturate(1.1)' // Tăng nhẹ độ tương phản để ảnh trông "sâu" và nét hơn
          }}
        />

        {/* LỚP PHỦ TRẮNG MỜ (Tùy chọn): Giúp ảnh trông sang trọng và làm nổi chữ cam */}
        <div className="absolute inset-0 bg-white/20 z-10 backdrop-blur-[1px]"></div>

        {/* CHÈN CHỮ MÀU CAM: rgba(245, 145, 39, 0.8) */}
        <div className="relative z-20 max-w-md p-12 text-[#f59127cc]">
          <h1 className="text-6xl font-black mb-6 leading-tight tracking-tight drop-shadow-sm">
            BEPTROLY
          </h1>
          <p className="text-xl font-bold leading-relaxed text-gray-800/90 drop-shadow-sm">
            Trợ lý đắc lực cho căn bếp của bạn. <br/>
            <span className="text-[#f59127cc]">Nấu ăn ngon hơn, quản lý thông minh hơn mỗi ngày.</span>
          </p>
        </div>

        {/* Trang trí góc */}
        <div className="absolute z-15 bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white/40 to-transparent"></div>
      </div>

      {/* Phần bên phải: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-50">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{title}</h2>
            <div className="w-12 h-1 bg-[#f59127cc] mx-auto mt-3 rounded-full"></div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
