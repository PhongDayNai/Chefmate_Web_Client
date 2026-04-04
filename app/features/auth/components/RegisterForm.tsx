// app/features/auth/components/RegisterForm.tsx
import { useState } from "react";
import { authService } from "../api/authService";
import toast from "react-hot-toast";
import type { Gender } from "~/utils/authUtils";

const GENDER_OPTIONS: Array<{ value: Gender; label: string }> = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
  { value: "other", label: "Khác" },
  { value: "unknown", label: "Không muốn nêu" },
];

interface Props {
  onSwitch: () => void;
}

export default function RegisterForm({ onSwitch }: Props) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !email || !password || !gender) {
      toast.error("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    setLoading(true);
    try {
      await authService.register(fullName, phone, email, password, gender);
      toast.success("Đăng ký thành công!");
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
         <select
            className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none bg-white"
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender)}
         >
            <option value="" disabled>
              Chọn giới tính
            </option>
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
         </select>
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
