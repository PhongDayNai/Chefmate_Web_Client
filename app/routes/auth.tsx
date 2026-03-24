// app/routes/auth.tsx
import { useState } from "react";
import AuthLayout from "~/features/auth/AuthLayout";
import LoginForm from "~/features/auth/components/LoginForm";
import RegisterForm from "~/features/auth/components/RegisterForm";
import ForgotPasswordForm from "~/features/auth/components/ForgotPasswordForm";

type AuthMode = "login" | "register" | "forgot";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");

  // Hàm render dựa trên trạng thái mode
  const renderForm = () => {
    switch (mode) {
      case "login": 
        return <LoginForm onSwitch={() => setMode("register")} onForgot={() => setMode("forgot")} />;
      case "register": 
        return <RegisterForm onSwitch={() => setMode("login")} />;
      case "forgot": 
        return <ForgotPasswordForm onBack={() => setMode("login")} />;
      default:
        return <LoginForm onSwitch={() => setMode("register")} onForgot={() => setMode("forgot")} />;
    }
  };

  const getTitle = () => {
    if (mode === "login") return "Chào mừng quay lại";
    if (mode === "register") return "Tạo tài khoản mới";
    return "Khôi phục mật khẩu";
  };

  return (
    <AuthLayout title={getTitle()}>
      {renderForm()}
    </AuthLayout>
  );
}