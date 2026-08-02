"use client";

import React from "react";
import { MenuDTO } from "@/types/menu";
import { Plus, AlertCircle } from "lucide-react";

interface MenuCardProps {
  menu: MenuDTO;
  onSelect: (menu: MenuDTO) => void;
  disabled?: boolean;
}

export const MenuCard: React.FC<MenuCardProps> = ({ menu, onSelect, disabled = false }) => {
  const isOutOfStock = menu.stock <= 0;
  const isLowStock = menu.stock > 0 && menu.stock <= menu.lowStockThreshold;

  return (
    <div
      onClick={() => (!isOutOfStock && !disabled ? onSelect(menu) : null)}
      className={`group relative rounded-3xl overflow-hidden bg-slate-900/70 border border-slate-800/80 backdrop-blur-md transition-all duration-300 transform ${
        isOutOfStock || disabled
          ? "opacity-60 cursor-not-allowed grayscale"
          : "hover:scale-[1.02] hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/10 cursor-pointer active:scale-95"
      }`}
    >
      {/* Image container */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-800">
        <img
          src={menu.imageUrl || "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80"}
          alt={menu.name}
          className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80" />

        {/* Category Badge */}
        <span className="absolute top-3 left-3 bg-slate-950/70 backdrop-blur-md text-amber-300 text-xs font-semibold px-3 py-1 rounded-full border border-amber-500/30">
          {menu.category === "COFFEE" ? "☕ 커피" : menu.category === "NON_COFFEE" ? "🥤 논커피" : "🍰 디저트"}
        </span>

        {/* Stock Badge */}
        {isOutOfStock ? (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
            <span className="px-4 py-2 bg-red-600/90 text-white text-sm font-bold tracking-wider rounded-xl border border-red-400 shadow-lg shadow-red-950/50 animate-pulse">
              [품절] SOLD OUT
            </span>
          </div>
        ) : isLowStock ? (
          <span className="absolute top-3 right-3 bg-amber-500/90 text-slate-950 font-bold text-xs px-2.5 py-1 rounded-full shadow animate-pulse flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            잔여 {menu.stock}개!
          </span>
        ) : (
          <span className="absolute bottom-3 right-3 bg-slate-900/80 text-slate-300 text-xs font-medium px-2.5 py-1 rounded-lg border border-slate-700">
            재고 {menu.stock}개
          </span>
        )}
      </div>

      {/* Content area */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-slate-100 group-hover:text-amber-300 transition-colors truncate">
          {menu.name}
        </h3>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xl font-extrabold font-mono text-amber-400">
            {menu.price.toLocaleString()}
            <span className="text-sm font-sans font-normal text-slate-400 ml-0.5">원</span>
          </span>
          {!isOutOfStock && !disabled && (
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:bg-gradient-to-tr group-hover:from-amber-500 group-hover:to-orange-500 group-hover:text-slate-950 transition-all duration-200 shadow-sm">
              <Plus className="w-5 h-5 font-bold" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
