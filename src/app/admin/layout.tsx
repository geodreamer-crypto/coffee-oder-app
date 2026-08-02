"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { logoutAdminAction } from "@/actions/auth-actions";
import { toggleStoreStatusAction, resetTestSystemAction } from "@/actions/store-actions";
import { Coffee, Shield, LayoutDashboard, Package, Utensils, LogOut, Power, RefreshCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Polling for global store operational state
  const { data, mutate } = useSWR<{ isOpen: boolean }>("/api/admin/orders", fetcher, { refreshInterval: 5000 });
  const isOpen = data ? data.isOpen : true;

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const handleToggleStore = () => {
    startTransition(async () => {
      const res = await toggleStoreStatusAction(!isOpen);
      if (res && "error" in res) {
        toast.error("영업 상태 변경 실패");
        return;
      }
      toast.success(res.isOpen ? "🟢 매장 영업이 개시(주문 접수 시작)되었습니다!" : "🔴 매장 영업이 마감(주문 차단)되었습니다!");
      mutate();
    });
  };

  const handleReset = (type: "STOCK" | "ORDERS") => {
    startTransition(async () => {
      const res = await resetTestSystemAction(type);
      if (res && "error" in res) {
        toast.error("초기화 실패", { description: res.message || "오류 발생" });
        return;
      }
      toast.success(type === "STOCK" ? "📦 모든 메뉴 재고가 초기 설정값으로 복구되었습니다!" : "🧹 모든 테스트 주문 내역이 100% 삭제되었습니다!");
      mutate();
    });
  };

  const navLinks = [
    { href: "/admin", label: "POS 주문 대기열", icon: LayoutDashboard },
    { href: "/admin/inventory", label: "실시간 재고 관리", icon: Package },
    { href: "/admin/menus", label: "메뉴 마스터 관리", icon: Utensils },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Admin Bar */}
      <header className="sticky top-0 z-40 w-full bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
                <Shield className="w-6 h-6 text-slate-950 font-black" />
              </div>
              <div>
                <h1 className="text-lg font-black bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                  POS Admin
                </h1>
                <span className="text-[11px] text-slate-400 font-medium">Smart Coffee Dashboard</span>
              </div>
            </Link>

            {/* Nav Tabs */}
            <nav className="hidden md:flex items-center gap-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                      isActive
                        ? "bg-amber-500/20 border border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/10"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Global Open/Close Toggle (FR-A01) */}
            <button
              type="button"
              onClick={handleToggleStore}
              disabled={isPending}
              className={`px-4 py-2.5 rounded-2xl border font-black text-xs transition-all flex items-center gap-2 shadow-lg cursor-pointer ${
                isOpen
                  ? "bg-green-600/20 border-green-500/60 text-green-300 hover:bg-green-600/30 shadow-green-950/40"
                  : "bg-red-600/20 border-red-500/60 text-red-300 hover:bg-red-600/30 shadow-red-950/40 animate-pulse"
              }`}
            >
              <Power className={`w-4 h-4 ${isOpen ? "text-green-400" : "text-red-400"}`} />
              <span>{isOpen ? "🟢 매장 영업 중" : "🔴 주문 마감됨"}</span>
            </button>

            {/* Test Reset Tools (FR-D01 / FR-D02) */}
            {process.env.NODE_ENV !== "production" && (
              <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 p-1.5 rounded-2xl">
                <span className="text-[10px] text-slate-500 font-bold px-2 flex items-center gap-1">
                  <RefreshCcw className="w-3 h-3" />
                  개발 툴
                </span>
                <button
                  type="button"
                  onClick={() => handleReset("STOCK")}
                  disabled={isPending}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-amber-600/20 text-slate-300 hover:text-amber-300 text-[11px] font-bold rounded-xl transition-colors cursor-pointer"
                  title="모든 메뉴 재고 초기화"
                >
                  📦 재고 리셋
                </button>
                <button
                  type="button"
                  onClick={() => handleReset("ORDERS")}
                  disabled={isPending}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-red-600/20 text-slate-300 hover:text-red-300 text-[11px] font-bold rounded-xl transition-colors cursor-pointer"
                  title="모든 주문 데이터 삭제"
                >
                  🧹 주문 비우기
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => startTransition(() => logoutAdminAction())}
              className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
              title="로그아웃"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav Tabs */}
      <div className="md:hidden flex items-center justify-around bg-slate-900 border-b border-slate-800 p-2">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                isActive ? "text-amber-400 font-extrabold bg-amber-500/10" : "text-slate-400"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
