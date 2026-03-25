// app/features/auth/components/RegisterForm.tsx
import { useState } from "react";
import { authService } from "../api/authService";
import toast from "react-hot-toast";

interface Props {
  onSwitch: () => void;
}

export default function RegisterForm({ onSwitch }: Props) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !email || !password) {
      toast.error("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.register(fullName, phone, email, password);
      // Giả sử API trả về success (hoặc xử lý theo cấu trúc response thực tế của bạn)
      toast.success("Đăng ký thành công!");
      // Chuyển sang form Đăng nhập
      setTimeout(() => {
        onSwitch();
      }, 1000);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Đăng ký thất bại. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-4">
         <input 
            type="text" 
            placeholder="Họ và tên" 
            className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)} 
         />
         <input 
            type="text" 
            placeholder="Số điện thoại" 
            className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
         />
         <input 
            type="email" 
            placeholder="Email" 
            className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
         />
         <input 
            type="password" 
            placeholder="Mật khẩu" 
            className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      
      <button 
        type="submit"
        disabled={loading}
        className={`w-full py-3 text-white font-bold rounded-lg shadow-lg ${loading ? "bg-gray-400" : "bg-[#f59127cc] hover:bg-[#f59127]"}`}
      >
        {loading ? "Đang xử lý..." : "Đăng Ký"}
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