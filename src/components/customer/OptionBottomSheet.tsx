"use client";

import React, { useState, useEffect, useMemo } from "react";
import { MenuDTO } from "@/types/menu";
import { useCartStore } from "@/store/use-cart-store";
import { X, Minus, Plus, Flame, Snowflake, ShoppingBag, Coffee, Droplets, Sparkles, Layers, Check } from "lucide-react";
import { toast } from "sonner";
import { parseAvailableOptions, OPTION_DEFINITIONS, calculateOptionPrice } from "@/lib/options";

interface OptionBottomSheetProps {
  menu: MenuDTO | null;
  onClose: () => void;
}

export const OptionBottomSheet: React.FC<OptionBottomSheetProps> = ({ menu, onClose }) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [tempOption, setTempOption] = useState<string | undefined>("ICE");
  const [shotOption, setShotOption] = useState<string>("기본 샷");
  const [syrupOption, setSyrupOption] = useState<string>("시럽 없음");
  const [milkOption, setMilkOption] = useState<string>("기본 우유");
  const [whippingOption, setWhippingOption] = useState<string>("휘핑 없음");

  const addItem = useCartStore((state) => state.addItem);

  // Parse allowed options from Menu DTO
  const optionConfig = useMemo(() => {
    if (!menu) return null;
    return parseAvailableOptions(menu.availableOptions, menu.category);
  }, [menu]);

  useEffect(() => {
    if (menu && optionConfig) {
      setQuantity(1);
      // Temperature default setup
      if (optionConfig.temperatures && optionConfig.temperatures.length > 0) {
        if (optionConfig.temperatures.includes("ICE") || optionConfig.temperatures.includes("ICE_ONLY")) {
          setTempOption("ICE");
        } else if (optionConfig.temperatures.includes("HOT")) {
          setTempOption("HOT");
        } else {
          setTempOption(optionConfig.temperatures[0]);
        }
      } else {
        setTempOption(undefined);
      }

      setShotOption("기본 샷");
      setSyrupOption("시럽 없음");
      setMilkOption("기본 우유");
      setWhippingOption("휘핑 없음");
    }
  }, [menu, optionConfig]);

  // Build combined option string for cart submission (Must be called before any conditional return!)
  const combinedOptionString = useMemo(() => {
    if (!optionConfig) return null;
    const parts: string[] = [];
    if (tempOption) parts.push(tempOption);
    if (optionConfig.shots && shotOption !== "기본 샷") parts.push(shotOption);
    if (optionConfig.syrup && syrupOption !== "시럽 없음") parts.push(syrupOption);
    if (optionConfig.milk && milkOption !== "기본 우유") parts.push(milkOption);
    if (optionConfig.whippedCream && whippingOption !== "휘핑 없음") parts.push(whippingOption);

    return parts.length > 0 ? parts.join(" | ") : null;
  }, [tempOption, shotOption, syrupOption, milkOption, whippingOption, optionConfig]);

  if (!menu || !optionConfig) return null;

  const optionExtraPrice = calculateOptionPrice(combinedOptionString);
  const currentUnitPrice = menu.price + optionExtraPrice;
  const totalOrderPrice = currentUnitPrice * quantity;

  const handleQuantityChange = (delta: number) => {
    const nextQty = quantity + delta;
    if (nextQty < 1) return;
    if (nextQty > menu.stock) {
      toast.warning(`남은 재고가 최대 ${menu.stock}개입니다. 더 이상 수량을 늘릴 수 없습니다.`);
      return;
    }
    setQuantity(nextQty);
  };

  const handleAddToCart = () => {
    addItem({
      menuId: menu.id,
      menuName: menu.name,
      option: combinedOptionString || undefined,
      quantity,
      unitPrice: currentUnitPrice,
      imageUrl: menu.imageUrl,
      stock: menu.stock,
    });

    const optionDesc = combinedOptionString ? ` (${combinedOptionString})` : "";
    toast.success(`장바구니에 [${menu.name}]${optionDesc} ${quantity}개를 담았습니다!`, {
      icon: "🛒",
      duration: 2500,
    });
    onClose();
  };

  const isIceOnly = optionConfig.temperatures?.length === 1 && (optionConfig.temperatures[0] === "ICE" || optionConfig.temperatures[0] === "ICE_ONLY");
  const hasTempOption = optionConfig.temperatures && optionConfig.temperatures.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/85 backdrop-blur-md animate-fade-in p-0 sm:p-4">
      <div
        className="w-full sm:max-w-xl bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-amber-950/30 transform transition-all duration-300 relative flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="p-6 pb-4 border-b border-slate-800 flex items-center justify-between relative shrink-0 bg-slate-900/90 z-10">
          <div className="flex items-center gap-4">
            <img
              src={menu.imageUrl || "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80"}
              alt={menu.name}
              className="w-20 h-20 rounded-2xl object-cover border border-slate-700 shadow-md"
            />
            <div>
              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 block w-max mb-1">
                {menu.category === "COFFEE" ? "☕ COFFEE" : menu.category === "NON_COFFEE" ? "🥤 BEVERAGE" : "🍰 DESSERT"}
              </span>
              <h2 className="text-2xl font-black text-slate-100">{menu.name}</h2>
              <div className="flex items-center gap-3 mt-1 text-sm">
                <span className="text-amber-400 font-extrabold font-mono text-base">
                  {menu.price.toLocaleString()}원 <span className="text-xs font-normal text-slate-400">(기본)</span>
                </span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400 text-xs">
                  재고: <strong className="text-emerald-400 font-semibold">{menu.stock}개</strong>
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer self-start"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Custom Options Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 divide-y divide-slate-800/60">
          {/* Temperature Section */}
          {hasTempOption && (
            <div className="pt-2 first:pt-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Snowflake className="w-4 h-4 text-blue-400" />
                  <span>온도 옵션 (Temperature)</span>
                </h3>
                {isIceOnly && (
                  <span className="text-[11px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 font-bold">
                    ICE 전용 음료
                  </span>
                )}
              </div>

              {isIceOnly ? (
                <div className="p-4 rounded-2xl border bg-blue-600/15 border-blue-500/40 text-blue-300 flex items-center justify-center gap-2 font-black text-base shadow-sm">
                  <Snowflake className="w-5 h-5 text-blue-400 animate-spin-slow" />
                  <span>ICE (아이스 전용) - 변경 불가</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTempOption("ICE")}
                    className={`h-14 rounded-2xl border flex items-center justify-center gap-2 font-black text-base transition-all duration-200 cursor-pointer ${
                      tempOption === "ICE"
                        ? "bg-blue-600/25 border-blue-500 text-blue-200 shadow-lg shadow-blue-600/20 scale-[1.02]"
                        : "bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800/80"
                    }`}
                  >
                    <Snowflake className={`w-5 h-5 ${tempOption === "ICE" ? "text-blue-400 animate-pulse" : ""}`} />
                    ICE (아이스)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempOption("HOT")}
                    className={`h-14 rounded-2xl border flex items-center justify-center gap-2 font-black text-base transition-all duration-200 cursor-pointer ${
                      tempOption === "HOT"
                        ? "bg-red-600/25 border-red-500 text-red-200 shadow-lg shadow-red-600/20 scale-[1.02]"
                        : "bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800/80"
                    }`}
                  >
                    <Flame className={`w-5 h-5 ${tempOption === "HOT" ? "text-red-500 animate-pulse" : ""}`} />
                    HOT (핫)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Espresso Shot Section */}
          {optionConfig.shots && (
            <div className="pt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Coffee className="w-4 h-4 text-amber-500" />
                  <span>에스프레소 샷 옵션</span>
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {OPTION_DEFINITIONS.shots.map((opt) => {
                  const isSelected = shotOption === opt.label;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setShotOption(opt.label)}
                      className={`py-3.5 px-4 rounded-xl border flex items-center justify-between font-bold text-sm transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? "bg-amber-500/20 border-amber-500 text-amber-200 shadow-md shadow-amber-500/15"
                          : "bg-slate-950/40 border-slate-800/80 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                      }`}
                    >
                      <span className="truncate">{opt.label.split("(")[0]}</span>
                      {opt.price > 0 ? (
                        <span className={`text-xs font-mono font-extrabold ${isSelected ? "text-amber-300" : "text-amber-400/80"}`}>
                          +{opt.price}원
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-normal">기본</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Syrup Section */}
          {optionConfig.syrup && (
            <div className="pt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-orange-400" />
                  <span>시럽 옵션 (Syrup)</span>
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {OPTION_DEFINITIONS.syrups.map((opt) => {
                  const isSelected = syrupOption === opt.label;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setSyrupOption(opt.label)}
                      className={`py-3.5 px-4 rounded-xl border flex items-center justify-between font-bold text-sm transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? "bg-orange-500/20 border-orange-500 text-orange-200 shadow-md"
                          : "bg-slate-950/40 border-slate-800/80 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                      }`}
                    >
                      <span className="truncate">{opt.label.split("(")[0]}</span>
                      {opt.price > 0 ? (
                        <span className="text-xs font-mono font-extrabold text-orange-300">
                          +{opt.price}원
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-normal">기본</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Milk Option Section */}
          {optionConfig.milk && (
            <div className="pt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>우유 변경 (Milk)</span>
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {OPTION_DEFINITIONS.milks.map((opt) => {
                  const isSelected = milkOption === opt.label;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setMilkOption(opt.label)}
                      className={`py-3.5 px-4 rounded-xl border flex items-center justify-between font-bold text-sm transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-200 shadow-md"
                          : "bg-slate-950/40 border-slate-800/80 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                      }`}
                    >
                      <span className="truncate">{opt.label.split("(")[0]}</span>
                      {opt.price > 0 ? (
                        <span className="text-xs font-mono font-extrabold text-emerald-300">
                          +{opt.price}원
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-normal">0원</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Whipping Cream Section */}
          {optionConfig.whippedCream && (
            <div className="pt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>휘핑 크림 옵션</span>
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {OPTION_DEFINITIONS.whippedCreams.map((opt) => {
                  const isSelected = whippingOption === opt.label;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setWhippingOption(opt.label)}
                      className={`py-3 px-2.5 rounded-xl border flex flex-col items-center justify-center font-bold text-xs transition-all duration-200 cursor-pointer gap-1 ${
                        isSelected
                          ? "bg-purple-500/20 border-purple-500 text-purple-200 shadow-md"
                          : "bg-slate-950/40 border-slate-800/80 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                      }`}
                    >
                      <span>{opt.label.split("(")[0]}</span>
                      {opt.price > 0 ? (
                        <span className="text-[11px] font-mono font-extrabold text-purple-300">
                          +{opt.price}원
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-normal">기본</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity Section */}
          <div className="pt-5 flex items-center justify-between p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
            <div>
              <span className="font-bold text-slate-200 block">주문 수량</span>
              <span className="text-xs text-slate-400 block mt-0.5">남은 수량: {menu.stock}개</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
                className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center text-xl font-black font-mono text-amber-400">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= menu.stock}
                className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Fixed Footer CTA */}
        <div className="p-6 bg-slate-950/95 border-t border-slate-800 shrink-0 z-10 space-y-3">
          {optionExtraPrice > 0 && (
            <div className="flex items-center justify-between px-2 text-xs font-semibold text-slate-400">
              <span>옵션 추가 금액</span>
              <span className="text-amber-400 font-mono font-bold">+{optionExtraPrice.toLocaleString()}원 / 개당</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleAddToCart}
            className="w-full h-14 bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-lg rounded-2xl transition-all duration-200 transform active:scale-[0.98] shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <ShoppingBag className="w-5 h-5 font-black" />
            <span className="font-mono">{totalOrderPrice.toLocaleString()}원</span>
            <span>• 장바구니 담기</span>
          </button>
        </div>
      </div>
    </div>
  );
};

