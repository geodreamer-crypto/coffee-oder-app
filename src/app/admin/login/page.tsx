"use client";

import React, { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAdminAction } from "@/actions/auth-actions";
import { Coffee, Lock, ShieldCheck, ArrowRight, Delete } from "lucide-react";

function LoginContent() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/admin";

  const handleNumberClick = (num: string) => {
    if (pin.length < 8) {
      setPin((prev) => prev + num);
      setError(null);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) {
      setError("PIN 번호를 입력해주세요.");
      return;
    }
    startTransition(async () => {
      const res = await loginAdminAction(pin, callbackUrl);
      if (res && "error" in res && res.error) {
        setError(res.error);
        setPin("");
      }
    });
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-orange-700/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-amber-500/20 rounded-3xl p-8 shadow-2xl shadow-amber-950/30 transition-all duration-300 hover:border-amber-500/30">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-400 flex items-center justify-center shadow-lg shadow-amber-600/30 mb-4 transform transition-transform hover:scale-105">
            <Coffee className="w-8 h-8 text-slate-950 font-bold" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400 bg-clip-text text-transparent">
            Smart Coffee POS Admin
          </h1>
          <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            매장 관리를 위한 관리자 인증 (PIN Gate)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center">
            <div className="w-full h-14 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-center tracking-widest text-2xl font-mono text-amber-400 px-4 shadow-inner relative overflow-hidden">
              {pin ? (
                <span className="animate-fade-in">{"•".repeat(pin.length)}</span>
              ) : (
                <span className="text-sm tracking-normal text-slate-600 font-sans flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-600" />
                  PIN 번호를 입력하세요 (기본: 1234)
                </span>
              )}
            </div>
            {error && (
              <p className="text-red-400 text-xs mt-2.5 font-medium animate-bounce text-center">
                ⚠️ {error}
              </p>
            )}
          </div>

          {/* Keypad Grid */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleNumberClick(num.toString())}
                className="h-14 bg-slate-800/60 hover:bg-amber-600/20 active:bg-amber-600/30 border border-slate-700/50 hover:border-amber-500/50 rounded-2xl font-semibold text-lg text-slate-200 transition-all duration-150 transform active:scale-95 shadow-sm flex items-center justify-center cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleBackspace}
              className="h-14 bg-slate-800/40 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700/30 hover:border-red-500/40 rounded-2xl transition-all duration-150 transform active:scale-95 flex items-center justify-center cursor-pointer"
              aria-label="지우기"
            >
              <Delete className="w-5 h-5" />
            </button>
            <button
              key={0}
              type="button"
              onClick={() => handleNumberClick("0")}
              className="h-14 bg-slate-800/60 hover:bg-amber-600/20 active:bg-amber-600/30 border border-slate-700/50 hover:border-amber-500/50 rounded-2xl font-semibold text-lg text-slate-200 transition-all duration-150 transform active:scale-95 shadow-sm flex items-center justify-center cursor-pointer"
            >
              0
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="h-14 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-2xl transition-all duration-150 transform active:scale-95 shadow-lg shadow-amber-500/25 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>입장</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-amber-400 flex items-center justify-center font-bold font-sans">
        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mr-3" />
        로그인 화면 로딩 중...
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
