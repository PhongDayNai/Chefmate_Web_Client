import { Suspense } from "react";
import ChatPage from "~/routes/chat";

export default function ChatRoutePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-400">Đang tải chat...</div>}>
      <ChatPage />
    </Suspense>
  );
}
