// app/routes/chat.tsx
import { useEffect, useState, useRef } from "react";
import { chatService } from "~/features/chat/api/chatService";
import { Send, Plus, MessageSquare, Trash2, Bot, User as UserIcon, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function ChatPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const userId = typeof window !== "undefined" ? Number(localStorage.getItem("userId")) : 0;

  // 1. Load danh sách sessions (Đổi getSessions -> listSessions)
  const loadSessions = async () => {
    try {
      const res = await chatService.listSessions(userId);
      if (res.success) setSessions(res.data);
    } catch (error) {
      console.error("Lỗi load sessions:", error);
    }
  };

  useEffect(() => { loadSessions(); }, []);

  // 2. Tự động cuộn xuống cuối
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // 3. Chọn một session để xem lịch sử (Đổi getHistory -> getSessionHistory)
  const handleSelectSession = async (id: number) => {
    setCurrentSessionId(id);
    try {
      const res = await chatService.getSessionHistory(id, userId);
      if (res.success) setMessages(res.data || []);
    } catch (error) {
      toast.error("Không thể lấy lịch sử cuộc trò chuyện");
    }
  };

  // 4. Gửi tin nhắn
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput("");
    setLoading(true);

    // Hiển thị tin nhắn user tạm thời
    setMessages(prev => [...prev, { role: "user", message: userMsg }]);

    try {
      const res = await chatService.sendMessage({
        userId,
        chatSessionId: currentSessionId || undefined,
        message: userMsg
      });

      if (res.success) {
        // Cập nhật ID nếu là session mới
        if (!currentSessionId && res.data?.session?.chatSessionId) {
          setCurrentSessionId(res.data.session.chatSessionId);
          loadSessions();
        }
        
        // Lấy tin nhắn AI từ đúng trường assistantMessage
        const aiReply = res.data?.assistantMessage;
        if (aiReply) {
          setMessages(prev => [...prev, { role: "assistant", message: aiReply }]);
        } else if (res.data?.history) {
          setMessages(res.data.history);
        }
      }
    } catch (error) {
      toast.error("AI đang bận, thử lại sau nhé!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white overflow-hidden">
      {/* Sidebar: Lịch sử Chat */}
      <div className="w-80 border-r border-gray-100 flex flex-col bg-gray-50/50">
        <button 
          onClick={() => { setCurrentSessionId(null); setMessages([]); }}
          className="m-4 p-4 border-2 border-dashed border-gray-200 rounded-2xl flex items-center gap-2 font-bold text-gray-500 hover:border-[#f59127] hover:text-[#f59127] transition-all bg-white shadow-sm"
        >
          <Plus size={20} /> Hội thoại mới
        </button>
        
        <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
          {sessions.map((s) => (
            <div 
              key={s.chatSessionId}
              onClick={() => handleSelectSession(s.chatSessionId)}
              className={`p-4 rounded-2xl cursor-pointer flex items-center gap-3 transition-all ${currentSessionId === s.chatSessionId ? 'bg-white shadow-md text-[#f59127] border border-orange-50' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <MessageSquare size={18} className={currentSessionId === s.chatSessionId ? "text-[#f59127]" : "text-gray-400"} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{s.title || "Cuộc hội thoại mới"}</p>
                <p className="text-[10px] text-gray-400 font-medium">Session #{s.chatSessionId}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main: Khung Chat */}
      <div className="flex-1 flex flex-col relative bg-white">
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-700">
              <div className="w-24 h-24 bg-orange-100 rounded-[2rem] flex items-center justify-center text-[#f59127] shadow-inner border-4 border-white">
                <Bot size={48} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-gray-800 tracking-tighter">Chào Sơn! Tôi là Bepes</h2>
                <p className="text-gray-400 max-w-xs mx-auto font-medium mt-2">Hôm nay bạn muốn biến những nguyên liệu trong tủ lạnh thành món gì ngon nào?</p>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse animate-in slide-in-from-right-2' : 'animate-in slide-in-from-left-2'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border-2 border-white shadow-sm ${msg.role === 'user' ? 'bg-gray-800 text-white' : 'bg-orange-100 text-[#f59127]'}`}>
                {msg.role === 'user' ? <UserIcon size={20} /> : <Bot size={20} />}
              </div>
              <div className={`max-w-[75%] p-4 rounded-2xl font-medium leading-relaxed shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-gray-900 text-white rounded-tr-none' : 'bg-gray-50 text-gray-800 rounded-tl-none border border-gray-100'}`}>
                {msg.message}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex gap-4 animate-pulse">
               <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#f59127] flex items-center justify-center border-2 border-white shadow-sm">
                  <Loader2 size={20} className="animate-spin" />
               </div>
               <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl rounded-tl-none text-gray-400 italic text-sm font-medium">
                  Bepes đang tìm công thức tốt nhất...
               </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input Form */}
        <div className="p-8 bg-white border-t border-gray-50">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto relative group">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Bạn đang có nguyên liệu gì? Hỏi Bepes ngay..."
              className="w-full p-5 pr-16 bg-gray-50 rounded-[2.5rem] outline-none border-2 border-transparent focus:border-orange-200 focus:bg-white transition-all font-medium shadow-inner"
            />
            <button 
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-2 top-2 bottom-2 px-6 bg-[#f59127] text-white rounded-full font-black hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-30"
            >
              <Send size={20} />
            </button>
          </form>
          <p className="text-center text-[10px] text-gray-300 mt-4 font-black uppercase tracking-[0.2em]">ChefMate Intelligence Systems</p>
        </div>
      </div>
    </div>
  );
}