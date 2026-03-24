// app/features/auth/components/ForgotPasswordForm.tsx
interface Props {
  onBack: () => void;
}

export default function ForgotPasswordForm({ onBack }: Props) {
  return (
    <form className="space-y-5">
      <input type="text" placeholder="Số điện thoại của bạn" className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none" />
      <button className="w-full py-3 bg-[#f59127cc] hover:bg-[#f59127] text-white font-bold rounded-lg shadow-lg">
        Gửi yêu cầu
      </button>
      <button type="button" onClick={onBack} className="w-full text-sm text-gray-500 hover:text-gray-700">
        ← Quay lại đăng nhập
      </button>
    </form>
  );
}