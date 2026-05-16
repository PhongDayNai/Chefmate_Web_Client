// app/routes/pantry.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pantryService } from "~/features/pantry/api/pantryService";
import PantryItem from "~/features/pantry/components/PantryItem";
import AddIngredientModal from "~/features/pantry/components/AddIngredientModal";
import TodayEatCard from "~/features/pantry/components/TodayEatCard";
import { useAuthGuard } from "~/hooks/useAuthGuard";
import { Plus, Refrigerator, ChevronLeft, ChevronDown, Share2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { PantryItemType, PantryType, ShareType } from "~/features/pantry/types";
import { checkAuth } from "~/utils/authUtils";

const DEFAULT_PAGE_SIZE = 20;

export default function PantryPage() {
  const router = useRouter();
  const { requireAuth } = useAuthGuard();

  const [pantries, setPantries] = useState<PantryType[]>([]);
  const [activePantry, setActivePantry] = useState<PantryType | null>(null);
  const [items, setItems] = useState<PantryItemType[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [showPantryMenu, setShowPantryMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shares, setShares] = useState<ShareType[]>([]);

  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const fetchPantries = async () => {
    if (!checkAuth()) {
      setIsInitialLoading(false);
      return;
    }
    try {
      const res = await pantryService.getPantries();
      if (res.success && res.data.length > 0) {
        setPantries(res.data);
        if (!activePantry) {
          setActivePantry(res.data[0]);
        }
      }
    } catch (error) {
      console.error("fetchPantries error:", error);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const fetchItems = useCallback(
    async (reset = false, page = 1) => {
      if (!activePantry) return;
      if (loadingRef.current && !reset) return;

      loadingRef.current = true;
      if (reset) {
        setIsInitialLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const res = await pantryService.getItems(activePantry.pantryId, page, DEFAULT_PAGE_SIZE);
        if (res.success) {
          // Backend returns { data: [...items], meta: { page, limit, total, hasMore } }
          const newItems = Array.isArray(res.data) ? res.data : [];
          const pagination = res.meta;

          setItems((prev) => {
            const base = reset ? [] : prev;
            const existingIds = new Set(base.map((i) => i.pantryItemId));
            const filtered = newItems.filter((i: PantryItemType) => !existingIds.has(i.pantryItemId));
            return [...base, ...filtered];
          });

          const nextHasMore = pagination ? Boolean(pagination.hasMore) : newItems.length >= DEFAULT_PAGE_SIZE;
          hasMoreRef.current = nextHasMore;
          setHasMore(nextHasMore);
          pageRef.current = page + 1;
        }
      } catch (error) {
        console.error("fetchItems error:", error);
      } finally {
        loadingRef.current = false;
        setIsInitialLoading(false);
        setIsLoadingMore(false);
      }
    },
    [activePantry?.pantryId],
  );

  useEffect(() => {
    void fetchPantries();
  }, []);

  useEffect(() => {
    if (!activePantry) return;
    pageRef.current = 1;
    hasMoreRef.current = true;
    setHasMore(true);
    setItems([]);
    void fetchItems(true, 1);
  }, [activePantry?.pantryId]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (!hasMoreRef.current || loadingRef.current) return;
        void fetchItems(false, pageRef.current);
      },
      { root: null, rootMargin: "200px 0px", threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchItems]);

  const handleSelectPantry = (p: PantryType) => {
    setActivePantry(p);
    setShowPantryMenu(false);
  };

  const handleCreatePantry = async () => {
    const name = prompt("Tên tủ lạnh mới:");
    if (!name?.trim()) return;
    try {
      const res = await pantryService.createPantry(name.trim());
      if (res.success) {
        toast.success("Đã tạo tủ lạnh mới!");
        void fetchPantries();
      }
    } catch {
      toast.error("Không tạo được tủ lạnh mới!");
    }
  };

  const handleOpenModal = () => {
    if (!requireAuth()) return;
    setModalOpen(true);
  };

  const handleAddIngredient = async (payload: any) => {
    if (!activePantry) return;
    try {
      const res = await pantryService.upsertItem(activePantry.pantryId, payload);
      if (res.success) {
        toast.success("Đã thêm vào tủ lạnh!");
        pageRef.current = 1;
        hasMoreRef.current = true;
        setItems([]);
        void fetchItems(true, 1);
        void fetchPantries();
        setModalOpen(false);
      }
    } catch {
      toast.error("Không thêm được đồ, thử lại nhé!");
    }
  };

  const handleDelete = async (itemId: number) => {
    if (!activePantry || !requireAuth()) return;
    if (!confirm("Bạn có chắc muốn bỏ nguyên liệu này?")) return;

    try {
      const res = await pantryService.deleteItem(activePantry.pantryId, itemId);
      if (res.success) {
        toast.success("Đã xóa khỏi tủ lạnh");
        setItems((prev) => prev.filter((i) => i.pantryItemId !== itemId));
        void fetchPantries();
      }
    } catch {
      toast.error("Lỗi khi xóa!");
    }
  };

  const handleDeletePantry = async () => {
    if (!activePantry || !confirm("Xóa tủ lạnh này? Tất cả đồ bên trong sẽ bị xóa.")) return;
    try {
      const res = await pantryService.deletePantry(activePantry.pantryId);
      if (res.success) {
        toast.success("Đã xóa tủ lạnh");
        setActivePantry(null);
        setPantries([]);
        void fetchPantries();
      }
    } catch {
      toast.error("Không xóa được!");
    }
  };

  const handleLoadShares = async () => {
    if (!activePantry) return;
    try {
      const res = await pantryService.getShares(activePantry.pantryId);
      if (res.success) setShares(res.data);
      setShowShareModal(true);
    } catch {
      toast.error("Không tải được danh sách chia sẻ!");
    }
  };

  const canEdit = activePantry?.userRole === "owner" || activePantry?.userRole === "editor";
  const showLoadMoreButton = hasMore;

  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-32">
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 p-4">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <button onClick={() => router.push("/")} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowPantryMenu(!showPantryMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-2xl hover:bg-orange-100 transition-colors"
              >
                <Refrigerator className="w-5 h-5 text-[#f59127]" />
                <span className="font-black text-gray-800 text-sm">
                  {activePantry?.name || "Chọn tủ lạnh"}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {showPantryMenu && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 min-w-[220px] z-50">
                  {pantries.map((p) => (
                    <button
                      key={p.pantryId}
                      onClick={() => handleSelectPantry(p)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between ${
                        activePantry?.pantryId === p.pantryId ? "bg-orange-50" : ""
                      }`}
                    >
                      <div>
                        <p className="font-bold text-gray-800 text-sm">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.itemCount} items · {p.userRole}</p>
                      </div>
                      {p.userRole === "owner" && (
                        <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold">Owner</span>
                      )}
                    </button>
                  ))}
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={handleCreatePantry}
                      className="w-full px-4 py-3 text-left text-[#f59127] font-bold text-sm hover:bg-orange-50 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Tạo tủ lạnh mới
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {canEdit && (
                <button onClick={handleLoadShares} className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-colors" title="Chia sẻ tủ lạnh">
                  <Share2 className="w-5 h-5 text-gray-600" />
                </button>
              )}
              {activePantry?.userRole === "owner" && (
                <button onClick={handleDeletePantry} className="p-2.5 hover:bg-red-50 rounded-2xl transition-colors" title="Xóa tủ lạnh">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </button>
              )}
            </div>
          </div>

          {activePantry && (
            <div className="max-w-4xl mx-auto mt-2 px-1">
              <p className="text-xs text-gray-400">
                {canEdit ? "✏️ Có thể chỉnh sửa" : "👁️ Chỉ xem"} · {items.length} nguyên liệu
                {hasMore ? " · Còn thêm" : ""}
              </p>
            </div>
          )}
        </header>

        <main className="max-w-4xl mx-auto p-4 mt-6">
          {isInitialLoading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#f59127]" />
            </div>
          ) : !activePantry || pantries.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
              <Refrigerator className="w-20 h-20 text-gray-100 mx-auto mb-6" />
              <p className="text-gray-400 font-bold text-lg">Bạn chưa có tủ lạnh nào!</p>
              <button onClick={handleCreatePantry} className="mt-4 text-[#f59127] font-bold hover:underline">
                Tạo tủ lạnh đầu tiên ngay
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
              <Refrigerator className="w-20 h-20 text-gray-100 mx-auto mb-6" />
              <p className="text-gray-400 font-bold text-lg">Tủ lạnh này đang trống!</p>
              {canEdit && (
                <button onClick={handleOpenModal} className="mt-4 text-[#f59127] font-bold hover:underline">
                  Thêm món đầu tiên ngay
                </button>
              )}
            </div>
          ) : (
            <>
              {activePantry && (
                <TodayEatCard pantryId={activePantry.pantryId} />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {items.map((item) => (
                  <PantryItem key={item.pantryItemId} item={item} onDelete={handleDelete} canDelete={canEdit} />
                ))}
              </div>

              <div ref={loadMoreRef} className="py-8 text-center">
                {isLoadingMore && <p className="text-gray-500 font-medium">Đang tải thêm...</p>}
                {showLoadMoreButton && !isLoadingMore && (
                  <button
                    onClick={() => void fetchItems(false, pageRef.current)}
                    className="rounded-full bg-[#f59127] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#e07d16]"
                  >
                    Tải thêm nguyên liệu
                  </button>
                )}
                {!hasMore && items.length > 0 && (
                  <p className="text-gray-400 text-sm">Đã hiển thị hết nguyên liệu trong tủ lạnh.</p>
                )}
              </div>
            </>
          )}
        </main>

        {canEdit && activePantry && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xs px-4">
            <button
              onClick={handleOpenModal}
              className="w-full py-5 bg-[#f59127cc] text-white rounded-[2rem] shadow-2xl font-black hover:bg-[#f59127] transition-all flex items-center justify-center gap-3"
            >
              <Plus className="w-5 h-5" /> THÊM NGUYÊN LIỆU
            </button>
          </div>
        )}
      </div>

      <AddIngredientModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} onSuccess={handleAddIngredient} />

      {showShareModal && activePantry && (
        <ShareModal
          pantryId={activePantry.pantryId}
          shares={shares}
          onClose={() => setShowShareModal(false)}
          onRefresh={handleLoadShares}
        />
      )}
    </>
  );
}

function ShareModal({ pantryId, shares, onClose, onRefresh }: {
  pantryId: number;
  shares: ShareType[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("editor");
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    try {
      const res = await pantryService.sharePantry(pantryId, Number(phone), role);
      if (res.success) {
        toast.success("Đã chia sẻ tủ lạnh!");
        setPhone("");
        void onRefresh();
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Không chia sẻ được!");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveShare = async (userId: number) => {
    if (!confirm("Bỏ chia sẻ người này?")) return;
    try {
      await pantryService.removeShare(pantryId, userId);
      toast.success("Đã bỏ chia sẻ");
      void onRefresh();
    } catch {
      toast.error("Không bỏ được!");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-gray-800">Chia sẻ tủ lạnh</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">✕</button>
        </div>

        <div className="mb-6">
          <p className="text-sm font-bold text-gray-400 mb-3">ĐANG CHIA SẺ</p>
          {shares.length === 0 ? (
            <p className="text-gray-300 text-sm italic">Chưa có ai được chia sẻ</p>
          ) : (
            <div className="space-y-2">
              {shares.map((s) => (
                <div key={s.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{s.fullName}</p>
                    <p className="text-xs text-gray-400">{s.role}</p>
                  </div>
                  <button onClick={() => void handleRemoveShare(s.userId)} className="text-red-400 hover:text-red-600 text-sm font-bold">Bỏ</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <input
            type="tel"
            placeholder="Số điện thoại người dùng"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl outline-none font-medium"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setRole("viewer")}
              className={`flex-1 py-3 rounded-2xl font-bold transition-colors ${role === "viewer" ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"}`}
            >
              👁️ Viewer
            </button>
            <button
              onClick={() => setRole("editor")}
              className={`flex-1 py-3 rounded-2xl font-bold transition-colors ${role === "editor" ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"}`}
            >
              ✏️ Editor
            </button>
          </div>
          <button
            onClick={() => void handleShare()}
            disabled={loading}
            className="w-full py-4 bg-[#f59127cc] text-white font-black rounded-2xl disabled:opacity-50"
          >
            {loading ? "Đang chia sẻ..." : "Chia sẻ ngay"}
          </button>
        </div>
      </div>
    </div>
  );
}