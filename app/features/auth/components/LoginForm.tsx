"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "../api/authService";
import { getAndClearRedirectUrl } from "~/utils/authUtils";
import toast from "react-hot-toast";

interface Props {
  onSwitch: () => void;
  onForgot: () => void;
}

export default function LoginForm({ onSwitch, onForgot }: Props) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authService.login(identifier, password);
      if (res.success) {
        localStorage.setItem("userId", res.data.userId.toString());
        localStorage.setItem("userName", res.data.fullName);

        toast.success(`Chào mừng ${res.data.fullName} trở lại!`);

        setTimeout(() => {
          const redirectUrl = getAndClearRedirectUrl();
          router.push(redirectUrl || "/");
        }, 1000);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Số điện thoại hoặc mật khẩu không đúng");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại / Email</label>
        <input
          type="text"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#f59127cc] outline-none transition-all"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#f59127cc] outline-none transition-all"
        />
      </div>
      <div className="flex justify-end">
        <button type="button" onClick={onForgot} className="text-sm text-[#f59127] hover:underline font-medium">
          Quên mật khẩu?
        </button>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-[#f59127cc] hover:bg-[#f59127] text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
      >
        {loading ? "Đang xác thực..." : "Đăng Nhập"}
      </button>
      <p className="text-center text-sm text-gray-600">
        Chưa có tài khoản?{" "}
        <button type="button" onClick={onSwitch} className="text-[#f59127] font-semibold hover:underline">
          Đăng ký ngay
        </button>
      </p>
    </form>
  );
}
