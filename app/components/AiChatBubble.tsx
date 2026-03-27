// app/components/AiChatBubble.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Bot, X, Send, User as UserIcon, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { chatService } from "~/features/chat/api/chatService";

export default function AiChatBubble() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  // 1. Tự động cuộn xuống cuối
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages, isOpen]);

  // 2. Load lịch sử chat (Sửa lỗi map: lấy res.data.messages)
  const loadHistory = async () => {
    if (!userId || !currentSessionId) return;
    try {
      const res = await chatService.getSessionHistory(currentSessionId, parseInt(userId));
      if (res.success) {
        // QUAN TRỌNG: Lấy đúng mảng messages từ data
        setMessages(res.data?.messages || []);
      }
    } catch (error) {
      console.error("Lỗi load lịch sử:", error);
    }
  };

  useEffect(() => {
    if (isOpen && currentSessionId) {
      loadHistory();
    }
  }, [isOpen, currentSessionId]);

  // 3. Logic mở/đóng cửa sổ Chat
  const toggleChat = () => {
    if (!userId) {
      toast.error("Vui lòng đăng nhập để chat với Bepes!");
      navigate("/auth");
      return;
    }
    setIsOpen(!isOpen);
    
    if (messages.length === 0 && !currentSessionId) {
      setMessages([
        { 
          role: "assistant", 
          content: "Chào Sơn! Tôi là Bepes. Bạn cần tôi trợ giúp công thức nấu ăn nào không?" 
        }
      ]);
    }
  };

  // 4. Logic gửi tin nhắn (Sửa lỗi hiển thị assistantMessage)
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !userId || loading) return;

    const userMsg = input;
    setInput("");
    setLoading(true);

    // Hiển thị tin nhắn User (dùng trường content cho đồng bộ)
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);

    try {
      const res = await chatService.sendMessage({
        userId: parseInt(userId),
        chatSessionId: currentSessionId || undefined,
        message: userMsg,
      });

      if (res.success) {
        if (!currentSessionId && res.data?.session?.chatSessionId) {
          setCurrentSessionId(res.data.session.chatSessionId);
        }

        const aiReply = res.data?.assistantMessage;
        if (aiReply) {
          setMessages((prev) => [...prev, { role: "assistant", content: aiReply }]);
        }
      }
    } catch (error: any) {
      toast.error("Bepes đang bận, Sơn thử lại sau nhé!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4">
      {isOpen && (
        <div className="w-[380px] md:w-[420px] h-[550px] bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 text-[#f59127] rounded-full flex items-center justify-center border-2 border-white">
                <Bot size={22} />
              </div>
              <div>
                <h4 className="font-black text-gray-800 leading-none">Bepes AI</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Trợ lý đầu bếp</p>
              </div>
            </div>
            <button onClick={toggleChat} className="p-2 text-gray-400 hover:text-red-500 transition-all">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-white custom-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center border ${msg.role === 'user' ? 'bg-gray-800 text-white border-gray-700' : 'bg-orange-50 text-[#f59127] border-orange-100'}`}>
                  {msg.role === 'user' ? <UserIcon size={14} /> : <Bot size={14} />}
                </div>
                <div className={`max-w-[80%] p-4 rounded-2xl font-medium leading-relaxed text-sm shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-gray-900 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
                  {/* Dùng msg.content để khớp với API */}
                  {msg.content}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center bg-orange-50 text-[#f59127] border border-orange-100">
                  <Loader2 size={14} className="animate-spin" />
                </div>
                <div className="max-w-[80%] p-4 rounded-2xl bg-gray-50 text-gray-400 font-medium italic text-sm rounded-tl-none border border-gray-100">
                  Bepes đang soạn câu trả lời...
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <form onSubmit={handleSend} className="relative group">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hỏi Bepes công thức nấu ăn..."
                className="w-full p-4 pr-14 bg-white rounded-2xl outline-none border-2 border-transparent focus:border-orange-200 shadow-sm font-medium text-sm transition-all"
              />
              <button 
                type="submit" 
                disabled={loading || !input.trim()}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-[#f59127] text-white rounded-xl font-black hover:scale-105 transition-all disabled:opacity-30"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      <button 
        onClick={toggleChat}
        className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 z-[101] relative ${isOpen ? 'bg-gray-900 rotate-180' : 'bg-[#f59127]'}`}
      >
        {isOpen ? <X size={28} /> : <Bot size={32} />}
        {!isOpen && !userId && (
          <span className="absolute -top-1 -right-1 flex h-6 w-6">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-6 w-6 bg-red-500 items-center justify-center text-[10px] font-black">!</span>
          </span>
        )}
      </button>
    </div>
  );
}