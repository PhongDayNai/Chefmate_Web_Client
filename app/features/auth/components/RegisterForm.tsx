// app/features/auth/components/RegisterForm.tsx
interface Props {
  onSwitch: () => void;
}

export default function RegisterForm({ onSwitch }: Props) {
  // Bạn có thể thêm useState cho fullName, phone, email, password tương tự LoginForm
  return (
    <form className="space-y-4">
      {/* Các ô Input tương tự... */}
      <div className="space-y-4">
         <input type="text" placeholder="Họ và tên" className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none" />
         <input type="text" placeholder="Số điện thoại" className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none" />
         <input type="email" placeholder="Email" className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none" />
         <input type="password" placeholder="Mật khẩu" className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none" />
      </div>
      
      <button className="w-full py-3 bg-[#f59127cc] hover:bg-[#f59127] text-white font-bold rounded-lg shadow-lg">
        Đăng Ký
      </button>
      <p className="text-center text-sm text-gray-600">
        Đã có tài khoản?{" "}
        <button type="button" onClick={onSwitch} className="text-[#f59127] font-semibold hover:underline">
          Đăng nhập
        </button>
      </p>
    </form>
  );
}