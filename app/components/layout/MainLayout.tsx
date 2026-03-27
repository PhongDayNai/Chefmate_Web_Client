import Footer from "./Footer";
import Navbar from "./Navbar";
import AiChatBubble from "~/components/AiChatBubble";
import PendingRecipeDialog from "~/features/chat/components/PendingRecipeDialog";
import { ChatFlowProvider } from "~/features/chat/state/ChatFlowProvider";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatFlowProvider>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />

        <div className="flex-grow">{children}</div>

        <Footer />
        <AiChatBubble />
        <PendingRecipeDialog />
      </div>
    </ChatFlowProvider>
  );
}
