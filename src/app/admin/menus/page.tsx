"use client";

import React, { useState, useTransition } from "react";
import useSWR from "swr";
import { MenuDTO } from "@/types/menu";
import { createMenuAction, toggleMenuActiveAction } from "@/actions/menu-actions";
import { getErrorMessage } from "@/lib/errors";
import { Utensils, Plus, Eye, EyeOff, X, Image as ImageIcon, Sparkles, Sliders } from "lucide-react";
import { toast } from "sonner";
import { parseAvailableOptions } from "@/lib/options";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminMenusPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("4500");
  const [category, setCategory] = useState("COFFEE");
  const [initialStock, setInitialStock] = useState("15");
  const [imageUrl, setImageUrl] = useState("https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80");
  
  // Custom option configuration states
  const [tempConfig, setTempConfig] = useState<"BOTH" | "ICE_ONLY" | "NONE">("BOTH");
  const [allowShots, setAllowShots] = useState(true);
  const [allowSyrup, setAllowSyrup] = useState(true);
  const [allowMilk, setAllowMilk] = useState(true);
  const [allowWhipping, setAllowWhipping] = useState(false);

  const [isPending, startTransition] = useTransition();

  const { data, error, isLoading, mutate } = useSWR<{ menus: MenuDTO[] }>(
    "/api/admin/orders",
    fetcher,
    { refreshInterval: 5000 }
  );

  const menus = data?.menus || [];

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    if (newCat === "DESSERT") {
      setTempConfig("NONE");
      setAllowShots(false);
      setAllowSyrup(false);
      setAllowMilk(false);
      setAllowWhipping(false);
    } else if (newCat === "COFFEE") {
      setTempConfig("BOTH");
      setAllowShots(true);
      setAllowSyrup(true);
      setAllowMilk(true);
      setAllowWhipping(false);
    } else if (newCat === "NON_COFFEE") {
      setTempConfig("BOTH");
      setAllowShots(false);
      setAllowSyrup(false);
      setAllowMilk(true);
      setAllowWhipping(true);
    }
  };

  const handleToggleActive = (menuId: string, current: boolean) => {
    startTransition(async () => {
      const res = await toggleMenuActiveAction(menuId, current);
      if (res && "error" in res && res.error) {
        toast.error("판매 상태 변경 실패");
        return;
      }
      toast.success(current ? "⛔ 메뉴가 판매 중단(숨김) 처리되었습니다." : "🟢 메뉴가 판매 중(공개)으로 전환되었습니다.");
      mutate();
    });
  };

  const handleCreateMenu = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("메뉴명을 입력해주세요.");
      return;
    }
    startTransition(async () => {
      let availableOptionsJson = null;
      if (category !== "DESSERT") {
        availableOptionsJson = JSON.stringify({
          temperatures: tempConfig === "BOTH" ? ["ICE", "HOT"] : tempConfig === "ICE_ONLY" ? ["ICE"] : [],
          shots: allowShots,
          syrup: allowSyrup,
          milk: allowMilk,
          whippedCream: allowWhipping,
        });
      }

      const payload = {
        name: name.trim(),
        price: Number(price) || 0,
        category,
        initialStock: Number(initialStock) || 0,
        lowStockThreshold: 3,
        imageUrl: imageUrl.trim() || undefined,
        availableOptions: availableOptionsJson,
        isActive: true,
      };

      const res = await createMenuAction(payload);
      if (res && "error" in res) {
        toast.error("메뉴 생성 실패", { description: "잘못된 입력이거나 중복 오류입니다." });
        return;
      }
      toast.success(`🎉 신규 메뉴 [${name}] 등록이 완료되었습니다!`);
      setIsModalOpen(false);
      setName("");
      mutate();
    });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-100 flex items-center gap-2.5">
            <Utensils className="w-7 h-7 text-amber-400" />
            <span>메뉴 마스터 관리 및 옵션 제어</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            신규 메뉴 및 음료별 차별화된 커스텀 옵션을 설정하거나 판매 중단 처리를 관리하세요.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-amber-500/20 transition-all transform active:scale-95 flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-5 h-5 font-bold" />
          <span>➕ 신규 메뉴 등록</span>
        </button>
      </div>

      {/* Menus Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 rounded-3xl bg-slate-900/40 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {menus.map((menu) => (
            <div
              key={menu.id}
              className={`rounded-3xl border overflow-hidden bg-slate-900/70 transition-all shadow-xl flex flex-col justify-between ${
                menu.isActive ? "border-slate-800/80 hover:border-slate-700" : "border-red-500/30 bg-slate-950/90 opacity-60"
              }`}
            >
              <div>
                <div className="relative h-40 w-full overflow-hidden bg-slate-800">
                  <img
                    src={menu.imageUrl || "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80"}
                    alt={menu.name}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-3 left-3 bg-slate-950/80 text-amber-300 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-700">
                    {menu.category}
                  </span>

                  {!menu.isActive && (
                    <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
                      <span className="px-3 py-1.5 bg-red-600 text-white text-xs font-extrabold rounded-xl">
                        ⛔ 판매 중단됨
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <h3 className="font-bold text-lg text-slate-100 truncate">{menu.name}</h3>
                  <div className="flex items-center justify-between mt-2 text-sm">
                    <span className="font-mono font-bold text-amber-400">{menu.price.toLocaleString()}원</span>
                    <span className="text-slate-400 text-xs">초기재고: {menu.initialStock}개</span>
                  </div>

                  {menu.category !== "DESSERT" && (
                    <div className="mt-3.5 pt-3 border-t border-slate-800/70 flex items-center gap-1.5 flex-wrap">
                      {(() => {
                        const cfg = parseAvailableOptions(menu.availableOptions, menu.category);
                        return (
                          <>
                            {cfg.temperatures?.includes("ICE") && cfg.temperatures?.includes("HOT") && <span className="text-[10px] font-extrabold bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">ICE/HOT</span>}
                            {cfg.temperatures?.length === 1 && cfg.temperatures[0] === "ICE" && <span className="text-[10px] font-extrabold bg-blue-600/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30">ICE전용</span>}
                            {cfg.shots && <span className="text-[10px] font-extrabold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">+샷</span>}
                            {cfg.syrup && <span className="text-[10px] font-extrabold bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded border border-orange-500/30">+시럽</span>}
                            {cfg.milk && <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">+우유</span>}
                            {cfg.whippedCream && <span className="text-[10px] font-extrabold bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30">+휘핑</span>}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5 pt-0 mt-2">
                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => handleToggleActive(menu.id, menu.isActive)}
                    disabled={isPending}
                    className={`w-full py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      menu.isActive
                        ? "bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/40"
                        : "bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/40"
                    }`}
                  >
                    {menu.isActive ? (
                      <>
                        <EyeOff className="w-4 h-4 text-red-400" />
                        <span>판매 중단 처리 (숨김)</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 text-green-400" />
                        <span>판매 중으로 재게시</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Menu Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md animate-fade-in p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-slate-100 flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>신규 메뉴 및 커스텀 옵션 등록</span>
            </h3>

            <form onSubmit={handleCreateMenu} className="space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">메뉴 이름</label>
                <input
                  type="text"
                  required
                  placeholder="예: 아이스 캬라멜 크림 라떼"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:border-amber-500 focus:outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">가격 (원)</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-amber-400 font-mono font-bold focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">초기 설정 재고 (개)</label>
                  <input
                    type="number"
                    required
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 font-mono font-bold focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">카테고리</label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:border-amber-500 focus:outline-none font-bold"
                >
                  <option value="COFFEE">☕ 커피 (Coffee)</option>
                  <option value="NON_COFFEE">🥤 논커피 (Non-Coffee)</option>
                  <option value="DESSERT">🍰 디저트 (Dessert)</option>
                </select>
              </div>

              {category !== "DESSERT" && (
                <div className="p-4 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-3 shadow-inner">
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <Sliders className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-wide">커스텀 옵션 허용 규칙 (스타벅스 스타일)</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block mb-1.5">온도 선택 허용</span>
                    <div className="grid grid-cols-3 gap-2">
                      <button type="button" onClick={() => setTempConfig("BOTH")} className={`py-2 text-xs font-extrabold rounded-xl border transition-all cursor-pointer ${tempConfig === "BOTH" ? "bg-amber-500/20 text-amber-300 border-amber-500 shadow-sm" : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"}`}>ICE / HOT 모두</button>
                      <button type="button" onClick={() => setTempConfig("ICE_ONLY")} className={`py-2 text-xs font-extrabold rounded-xl border transition-all cursor-pointer ${tempConfig === "ICE_ONLY" ? "bg-blue-600/20 text-blue-300 border-blue-500 shadow-sm" : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"}`}>❄️ ICE 전용</button>
                      <button type="button" onClick={() => setTempConfig("NONE")} className={`py-2 text-xs font-extrabold rounded-xl border transition-all cursor-pointer ${tempConfig === "NONE" ? "bg-slate-800 text-slate-200 border-slate-600 shadow-sm" : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"}`}>온도 없음</button>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-900 grid grid-cols-2 gap-2.5">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer p-2 rounded-lg bg-slate-900/50 border border-slate-800/80 hover:bg-slate-900">
                      <input type="checkbox" checked={allowShots} onChange={(e) => setAllowShots(e.target.checked)} className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer" />
                      <span>☕ 샷 추가 허용</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer p-2 rounded-lg bg-slate-900/50 border border-slate-800/80 hover:bg-slate-900">
                      <input type="checkbox" checked={allowSyrup} onChange={(e) => setAllowSyrup(e.target.checked)} className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer" />
                      <span>💧 시럽 옵션 허용</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer p-2 rounded-lg bg-slate-900/50 border border-slate-800/80 hover:bg-slate-900">
                      <input type="checkbox" checked={allowMilk} onChange={(e) => setAllowMilk(e.target.checked)} className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer" />
                      <span>🥛 우유 변경 허용</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer p-2 rounded-lg bg-slate-900/50 border border-slate-800/80 hover:bg-slate-900">
                      <input type="checkbox" checked={allowWhipping} onChange={(e) => setAllowWhipping(e.target.checked)} className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer" />
                      <span>✨ 휘핑 크림 허용</span>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">이미지 URL (선택)</label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-300 font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-2 w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-2xl transition-transform active:scale-95 shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                >
                  등록 완수하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

