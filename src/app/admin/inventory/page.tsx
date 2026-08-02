"use client";

import React, { useState, useTransition } from "react";
import useSWR from "swr";
import { MenuDTO } from "@/types/menu";
import { updateStockAction, adjustStockAction } from "@/actions/inventory-actions";
import { Package, Plus, Minus, AlertTriangle, CheckCircle, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminInventoryPage() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inputStock, setInputStock] = useState<number>(0);
  const [isPending, startTransition] = useTransition();

  // 3s polling for menus stock
  const { data, error, isLoading, mutate } = useSWR<{ menus: MenuDTO[] }>(
    "/api/admin/orders",
    fetcher,
    { refreshInterval: 3000 }
  );

  const menus = data?.menus || [];

  const handleAdjust = (menuId: string, delta: number) => {
    startTransition(async () => {
      const res = await adjustStockAction(menuId, delta);
      if (res && "error" in res) {
        toast.error("재고 증감 실패");
        return;
      }
      toast.success(`재고가 ${delta > 0 ? `+${delta}` : delta}개 변경되었습니다.`);
      mutate();
    });
  };

  const handleSaveInput = (menuId: string) => {
    if (inputStock < 0 || isNaN(inputStock)) {
      toast.error("0 이상의 올바른 정수를 입력하세요.");
      return;
    }
    startTransition(async () => {
      const res = await updateStockAction({ menuId, newStock: Number(inputStock) });
      if (res && "error" in res) {
        toast.error("재고 수정 실패");
        return;
      }
      toast.success("재고가 성공적으로 반영되었습니다!");
      setEditingId(null);
      mutate();
    });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-100 flex items-center gap-2.5">
            <Package className="w-7 h-7 text-amber-400" />
            <span>실시간 재고 관제 및 수치 제어 대시보드</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            실시간으로 품절 임박 및 잔여 재고를 직관적으로 파악하고 버튼이나 직접 숫자 입력으로 즉시 수정할 수 있습니다.
          </p>
        </div>
      </div>

      {/* Inventory Grid / Table */}
      {isLoading ? (
        <div className="h-96 rounded-3xl bg-slate-900/40 border border-slate-800 animate-pulse" />
      ) : (
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-4 pl-6">메뉴 명 및 정보</th>
                  <th className="p-4">카테고리</th>
                  <th className="p-4">초기 기준값</th>
                  <th className="p-4">현재 잔여 재고</th>
                  <th className="p-4">상태 인디케이터</th>
                  <th className="p-4 pr-6 text-right">빠른 증감 및 직접 입력 수정</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-sm font-medium">
                {menus.map((menu) => {
                  const isOutOfStock = menu.stock <= 0;
                  const isLowStock = menu.stock > 0 && menu.stock <= menu.lowStockThreshold;
                  const isEditing = editingId === menu.id;

                  return (
                    <tr key={menu.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Name & Image */}
                      <td className="p-4 pl-6 flex items-center gap-3">
                        <img
                          src={menu.imageUrl || "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80"}
                          alt={menu.name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                        />
                        <div>
                          <span className="font-extrabold text-slate-100 text-base block">{menu.name}</span>
                          <span className="text-xs font-mono text-amber-400 font-bold">
                            {menu.price.toLocaleString()}원
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold">
                          {menu.category === "COFFEE" ? "☕ 커피" : menu.category === "NON_COFFEE" ? "🥤 논커피" : "🍰 디저트"}
                        </span>
                      </td>

                      {/* Initial stock */}
                      <td className="p-4 font-mono text-slate-400">
                        {menu.initialStock}개 (임계: {menu.lowStockThreshold}개)
                      </td>

                      {/* Current stock display/edit */}
                      <td className="p-4">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={inputStock}
                              onChange={(e) => setInputStock(parseInt(e.target.value) || 0)}
                              className="w-20 bg-slate-950 border border-amber-500 rounded-xl px-3 py-1.5 font-mono text-base text-amber-400 font-bold focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveInput(menu.id)}
                              disabled={isPending}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer"
                            >
                              저장
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditingId(menu.id);
                              setInputStock(menu.stock);
                            }}
                            className="font-mono text-xl font-extrabold text-amber-400 cursor-pointer hover:underline inline-flex items-center gap-1.5 px-2 py-1 bg-slate-950/60 rounded-xl border border-slate-800 hover:border-amber-500/50 transition-colors"
                            title="클릭하여 숫자 직접 입력 수정"
                          >
                            <span>{menu.stock}개</span>
                            <span className="text-[10px] text-slate-500 font-sans font-normal">(수정)</span>
                          </div>
                        )}
                      </td>

                      {/* Status indicator badge (FR-A02) */}
                      <td className="p-4">
                        {isOutOfStock ? (
                          <span className="px-3 py-1 bg-red-600/20 text-red-400 border border-red-500/40 font-black text-xs rounded-full inline-flex items-center gap-1.5 animate-pulse">
                            <AlertTriangle className="w-4 h-4" />
                            [품절] 0개 소진
                          </span>
                        ) : isLowStock ? (
                          <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black text-xs rounded-full inline-flex items-center gap-1.5 animate-bounce">
                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                            [품절 임박] 잔여 {menu.stock}개
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-green-600/20 text-green-300 border border-green-500/40 font-bold text-xs rounded-full inline-flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            여유
                          </span>
                        )}
                      </td>

                      {/* Quick adjustment buttons */}
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleAdjust(menu.id, -5)}
                            disabled={isPending || menu.stock < 5}
                            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/40 font-bold text-xs flex items-center justify-center disabled:opacity-30 transition-all cursor-pointer active:scale-95"
                            title="5개 차감"
                          >
                            -5
                          </button>
                          <button
                            onClick={() => handleAdjust(menu.id, -1)}
                            disabled={isPending || menu.stock < 1}
                            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/40 font-bold text-xs flex items-center justify-center disabled:opacity-30 transition-all cursor-pointer active:scale-95"
                            title="1개 차감"
                          >
                            -1
                          </button>
                          <button
                            onClick={() => handleAdjust(menu.id, 1)}
                            disabled={isPending}
                            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-green-500/20 text-slate-300 hover:text-green-400 border border-slate-700 hover:border-green-500/40 font-bold text-xs flex items-center justify-center transition-all cursor-pointer active:scale-95"
                            title="1개 추가"
                          >
                            +1
                          </button>
                          <button
                            onClick={() => handleAdjust(menu.id, 5)}
                            disabled={isPending}
                            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-green-500/20 text-slate-300 hover:text-green-400 border border-slate-700 hover:border-green-500/40 font-bold text-xs flex items-center justify-center transition-all cursor-pointer active:scale-95"
                            title="5개 추가"
                          >
                            +5
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
