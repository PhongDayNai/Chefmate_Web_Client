// app/routes/profile.tsx
import { useEffect, useState } from "react";
import { userService } from "~/features/users/api/userService";
import { recipeService } from "~/features/recipes/api/recipeService";
import { dietNoteService } from "~/features/users/api/dietNoteService";
import RecipeCard from "~/features/recipes/components/RecipeCard";
import { 
  User, 
  Lock, 
  History, 
  Save, 
  Utensils, 
  Plus, 
  X, 
  HeartPulse,
  Phone,
  Mail
} from "lucide-react";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("info");
  const [history, setHistory] = useState([]);
  const [myRecipes, setMyRecipes] = useState([]);
  const [dietNotes, setDietNotes] = useState([]);
  
  // State User bổ sung thêm trường phone
  const [user, setUser] = useState({ 
    fullName: "", 
    email: "", 
    phone: "" 
  });
  const [pass, setPass] = useState({ current: "", new: "" });
  const [newNote, setNewNote] = useState({ label: "", noteType: "allergy" });

  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  const loadAllData = async () => {
    if (!userId) return;
    const uId = parseInt(userId);

    const [historyRes, myRecipesRes, dietRes] = await Promise.all([
      userService.getViewHistory(uId),
      recipeService.getUserRecipes(uId),
      dietNoteService.getNotes(uId)
    ]);

    if (historyRes.success) setHistory(historyRes.data);
    if (myRecipesRes.success) setMyRecipes(myRecipesRes.data);
    if (dietRes.success) setDietNotes(dietRes.data);
  };

  useEffect(() => {
    loadAllData();
    // Khởi tạo dữ liệu từ localStorage
    setUser({
      fullName: localStorage.getItem("userName") || "",
      email: localStorage.getItem("userEmail") || "sontest@gmail.com", 
      phone: localStorage.getItem("userPhone") || "0123456789"
    });
  }, []);

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    try {
      const res = await userService.updateInfo({ 
        userId: parseInt(userId), 
        fullName: user.fullName,
        phone: user.phone,
        email: user.email
      });

      if (res.success) {
        // Cập nhật lại bộ nhớ tạm để các trang khác (Navbar) nhận diện tên mới
        localStorage.setItem("userName", res.data.fullName);
        localStorage.setItem("userPhone", res.data.phone);
        localStorage.setItem("userEmail", res.data.email);
        
        toast.success("Cập nhật thông tin thành công!");
      }
    } catch (error) {
      toast.error("Lỗi cập nhật thông tin");
    }
  };

  const handleChangePass = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await userService.changePassword({ 
      phone: user.phone, 
      currentPassword: pass.current, 
      newPassword: pass.new 
    });
    if (res.success) {
      toast.success("Đổi mật khẩu thành công!");
      setPass({ current: "", new: "" });
    } else {
      toast.error("Mật khẩu hiện tại không đúng");
    }
  };

  const handleAddDietNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.label.trim()) return;
    const res = await dietNoteService.upsertNote({
      userId: parseInt(userId!),
      noteType: newNote.noteType,
      label: newNote.label,
      keywords: [newNote.label],
      isActive: true
    });
    if (res.success) {
      toast.success("Đã thêm ghi chú");
      setNewNote({ ...newNote, label: "" });
      loadAllData();
    }
  };

  const handleDeleteDietNote = async (noteId: number) => {
    const res = await dietNoteService.deleteNote(parseInt(userId!), noteId);
    if (res.success) {
      toast.success("Đã xóa ghi chú");
      loadAllData();
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 mt-6 pb-20">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <div className="w-full md:w-72 space-y-3">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 mb-4 text-center">
             <div className="w-20 h-20 bg-[#f59127cc] text-white rounded-full flex items-center justify-center font-black text-2xl mx-auto mb-3 border-4 border-orange-50">
                {user.fullName.charAt(0).toUpperCase()}
             </div>
             <h2 className="font-black text-gray-800 truncate">{user.fullName}</h2>
             <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Thành viên Premium</p>
          </div>

          <button onClick={() => setActiveTab("info")} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${activeTab === 'info' ? 'bg-[#f59127] text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-orange-50'}`}>
            <User size={20} /> Thông tin cá nhân
          </button>
          <button onClick={() => setActiveTab("diet")} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${activeTab === 'diet' ? 'bg-[#f59127] text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-orange-50'}`}>
            <HeartPulse size={20} /> Chế độ ăn uống
          </button>
          <button onClick={() => setActiveTab("my-recipes")} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${activeTab === 'my-recipes' ? 'bg-[#f59127] text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-orange-50'}`}>
            <Utensils size={20} /> Món ăn của tôi
          </button>
          <button onClick={() => setActiveTab("history")} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${activeTab === 'history' ? 'bg-[#f59127] text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-orange-50'}`}>
            <History size={20} /> Lịch sử xem món
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {activeTab === "info" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <h3 className="text-xl font-black mb-6">Cập nhật tài khoản</h3>
                <form onSubmit={handleUpdateInfo} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-gray-400 ml-2">Họ và tên</label>
                      <input type="text" value={user.fullName} onChange={e => setUser({...user, fullName: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-[#f59127cc]" placeholder="Nguyễn Văn A"/>
                    </div>
                    
                    {/* Ô NHẬP SỐ ĐIỆN THOẠI MỚI THÊM */}
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-gray-400 ml-2">Số điện thoại</label>
                      <div className="relative">
                        <Phone size={18} className="absolute left-4 top-4 text-gray-300" />
                        <input type="text" value={user.phone} onChange={e => setUser({...user, phone: e.target.value})} className="w-full p-4 pl-12 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-[#f59127cc]" placeholder="0123..."/>
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-black uppercase text-gray-400 ml-2">Địa chỉ Email</label>
                      <div className="relative">
                        <Mail size={18} className="absolute left-4 top-4 text-gray-300" />
                        <input type="email" value={user.email} onChange={e => setUser({...user, email: e.target.value})} className="w-full p-4 pl-12 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-[#f59127cc]" placeholder="email@example.com"/>
                      </div>
                    </div>
                  </div>
                  <button type="submit" className="flex items-center justify-center gap-2 px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg">
                    <Save size={18}/> Lưu thay đổi
                  </button>
                </form>
              </div>

              {/* Đổi mật khẩu */}
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <h3 className="text-xl font-black mb-6 text-red-500">Bảo mật & Mật khẩu</h3>
                <form onSubmit={handleChangePass} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="password" value={pass.current} onChange={e => setPass({...pass, current: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-[#f59127cc]" placeholder="Mật khẩu hiện tại"/>
                    <input type="password" value={pass.new} onChange={e => setPass({...pass, new: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-[#f59127cc]" placeholder="Mật khẩu mới"/>
                  </div>
                  <button type="submit" className="w-full py-4 bg-orange-100 text-[#f59127] rounded-2xl font-bold hover:bg-orange-200 transition-all">
                    Xác nhận đổi mật khẩu
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ... (Các tab khác giữ nguyên như cũ) */}
          {activeTab === "diet" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                  <h3 className="text-2xl font-black text-gray-800 mb-2">Chế độ ăn uống</h3>
                  <form onSubmit={handleAddDietNote} className="flex flex-col md:flex-row gap-3 mb-10 p-4 bg-orange-50 rounded-[2rem]">
                    <select value={newNote.noteType} onChange={(e) => setNewNote({...newNote, noteType: e.target.value})} className="p-4 bg-white rounded-2xl outline-none font-bold text-sm text-[#f59127]">
                      <option value="allergy">⚠️ Dị ứng</option>
                      <option value="preference">❤️ Sở thích</option>
                    </select>
                    <input type="text" value={newNote.label} onChange={(e) => setNewNote({...newNote, label: e.target.value})} placeholder="Ví dụ: Tôm, Đậu phộng..." className="flex-1 p-4 bg-white rounded-2xl outline-none font-medium"/>
                    <button type="submit" className="p-4 bg-[#f59127] text-white rounded-2xl font-black hover:scale-105 transition-transform"><Plus /></button>
                  </form>
                  <div className="flex flex-wrap gap-4">
                    {dietNotes.map((note: any) => (
                      <div key={note.noteId} className={`flex items-center gap-3 px-6 py-3 rounded-full border-2 font-bold ${note.noteType === 'allergy' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-green-50 border-green-100 text-green-600'}`}>
                        <span>{note.label}</span>
                        <button onClick={() => handleDeleteDietNote(note.noteId)}><X size={16} /></button>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          )}

          {activeTab === "my-recipes" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4">
              {myRecipes.map((item: any) => <RecipeCard key={item.recipeId} recipe={item} />)}
            </div>
          )}

          {activeTab === "history" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4">
              {history.map((item: any) => <RecipeCard key={item.recipeId} recipe={item} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}