"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { MenuDTO, MenuCategory } from "@/types/menu";
import { useCartStore } from "@/store/use-cart-store";
import { MenuCard } from "@/components/customer/MenuCard";
import { OptionBottomSheet } from "@/components/customer/OptionBottomSheet";
import { CartDrawer } from "@/components/customer/CartDrawer";
import { Coffee, ShoppingBag, ShieldCheck, Sparkles, Clock, AlertTriangle, RefreshCcw } from "lucide-react";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CustomerHomePage() {
  const router = useRouter();
  const { items, activeOrderNo, guestToken } = useCartStore();
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | "ALL">("ALL");
  const [selectedMenu, setSelectedMenu] = useState<MenuDTO | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // 5 seconds polling for menus & store operating status
  const { data, error, isLoading, mutate } = useSWR<{ isOpen: boolean; menus: MenuDTO[] }>(
    "/api/menus",
    fetcher,
    { refreshInterval: 5000 }
  );

  const isStoreClosed = data ? !data.isOpen : false;

  const filteredMenus = data?.menus?.filter((m) => {
    if (selectedCategory === "ALL") return true;
    return m.category === selectedCategory;
  }) || [];

  const totalCartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 pb-28">
      {/* Ambient background blur */}
      <div className="fixed -top-40 -right-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/2 -left-40 w-96 h-96 bg-orange-700/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Coffee className="w-7 h-7 text-slate-950 font-bold" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                Antigravity Coffee
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Smart Order & POS System
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {/* Active Order Tracker Shortcut */}
            {activeOrderNo && guestToken && (
              <button
                onClick={() => router.push(`/order/${activeOrderNo}`)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/10 transition-colors flex items-center gap-1.5 animate-pulse cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>주문 상태 조회</span>
              </button>
            )}

            <Link
              href="/admin/login"
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>관리자</span>
            </Link>

            {/* Cart toggle trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              disabled={isStoreClosed}
              className="relative p-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:from-amber-400 hover:to-orange-400 font-extrabold transition-transform active:scale-95 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5 font-bold" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-600 text-white text-[11px] font-black border-2 border-slate-950 flex items-center justify-center animate-bounce">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-6">
        {/* Store Closed Banner (FR-A01) */}
        {isStoreClosed && (
          <div className="w-full bg-red-950/80 border border-red-500/60 rounded-3xl p-6 text-red-100 flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 backdrop-blur-md shadow-xl shadow-red-950/50">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="p-3 bg-red-600/30 rounded-2xl text-red-400 border border-red-500/30">
                <AlertTriangle className="w-8 h-8 animate-bounce" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-red-200">현재 매장 영업이 종료(주문 마감)되었습니다</h2>
                <p className="text-sm text-red-300/80 mt-1">
                  점주 또는 관리자가 주문 마감 상태로 변경하였습니다. 영업 시작 전까지 장바구니 결제가 전면 차단됩니다.
                </p>
              </div>
            </div>
            <button
              onClick={() => mutate()}
              className="px-4 py-2.5 bg-red-800 hover:bg-red-700 rounded-xl text-xs font-bold text-white transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <RefreshCcw className="w-4 h-4" />
              <span>영업 상태 새로고침</span>
            </button>
          </div>
        )}

        {/* Hero Section */}
        <div className="w-full bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-amber-950/40 border border-slate-800/80 rounded-3xl p-8 mb-8 backdrop-blur-md relative overflow-hidden shadow-2xl">
          <div className="max-w-2xl">
            <span className="text-amber-400 font-extrabold text-xs uppercase tracking-widest px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full inline-block mb-3">
              Near Real-Time Menu & Stock
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-100 leading-tight">
              신선한 원두와 특별한 음료, <br />
              <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
                지금 비회원으로 간편하게 주문하세요.
              </span>
            </h2>
            <p className="text-slate-400 text-sm mt-3 leading-relaxed">
              회원가입 없는 빠른 주문! 가상 결제 시뮬레이션으로 대기열 번호와 GuestToken을 발급받아 실시간으로 제조 단계를 추적할 수 있습니다.
            </p>
          </div>
        </div>

        {/* Category Filter Tabs (FR-C01) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none">
          {[
            { id: "ALL", label: "✨ 전체 메뉴" },
            { id: "COFFEE", label: "☕ 커피 (Coffee)" },
            { id: "NON_COFFEE", label: "🥤 논커피 (Non-Coffee)" },
            { id: "DESSERT", label: "🍰 디저트 (Dessert)" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id as any)}
              className={`px-6 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all duration-200 transform active:scale-95 cursor-pointer ${
                selectedCategory === tab.id
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20"
                  : "bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-80 rounded-3xl bg-slate-900/50 border border-slate-800/60 animate-pulse" />
            ))}
          </div>
        ) : filteredMenus.length === 0 ? (
          <div className="w-full h-72 rounded-3xl bg-slate-900/50 border border-slate-800 flex flex-col items-center justify-center text-center p-8 mt-6">
            <Coffee className="w-12 h-12 text-slate-700 mb-3" />
            <p className="text-lg font-bold text-slate-400">해당 카테고리에 판매 중인 메뉴가 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6">
            {filteredMenus.map((menu) => (
              <MenuCard
                key={menu.id}
                menu={menu}
                disabled={isStoreClosed}
                onSelect={(selected) => setSelectedMenu(selected)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Cart Banner for Mobile / Convenient Trigger */}
      {totalCartCount > 0 && !isCartOpen && !isStoreClosed && (
        <div className="fixed bottom-6 inset-x-4 max-w-lg mx-auto z-40">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full h-16 bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 text-slate-950 font-black text-base rounded-2xl shadow-2xl shadow-amber-500/30 flex items-center justify-between px-6 transform transition-all active:scale-98 animate-bounce cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-6 h-6 font-bold" />
              <span>장바구니 보기 ({totalCartCount}개)</span>
            </div>
            <span className="font-mono bg-slate-950 text-amber-400 px-3 py-1 rounded-xl text-sm font-extrabold">
              결제 진행 →
            </span>
          </button>
        </div>
      )}

      {/* Modals & Drawers */}
      <OptionBottomSheet menu={selectedMenu} onClose={() => setSelectedMenu(null)} />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}
