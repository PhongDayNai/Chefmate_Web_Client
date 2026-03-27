// app/components/layout/MainLayout.tsx
import { Outlet } from "react-router";
import Navbar from "./Navbar";
import Footer from "./Footer"; // Import Footer mới
import AiChatBubble from "../AiChatBubble";

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      {/* flex-grow giúp Main chiếm hết chỗ trống để đẩy Footer xuống đáy trang */}
      <div className="flex-grow">
        <Outlet />
      </div>

      <Footer />

      <AiChatBubble />
    </div>
  );
}