import React from "react";

interface OptionBadgeProps {
  optionStr?: string | null;
  size?: "sm" | "md";
}

export const OptionBadge: React.FC<OptionBadgeProps> = ({ optionStr, size = "md" }) => {
  if (!optionStr) return null;

  const parts = optionStr.split(" | ").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {parts.map((part, index) => {
        let bgStyle = "bg-slate-800/80 text-slate-300 border-slate-700";
        if (part === "ICE" || part.includes("아이스")) {
          bgStyle = "bg-blue-600/20 text-blue-300 border-blue-500/30";
        } else if (part === "HOT" || part.includes("핫")) {
          bgStyle = "bg-red-600/20 text-red-300 border-red-500/30";
        } else if (part.includes("샷") || part.includes("연하게")) {
          bgStyle = "bg-amber-500/20 text-amber-300 border-amber-500/30";
        } else if (part.includes("시럽")) {
          bgStyle = "bg-orange-500/20 text-orange-300 border-orange-500/30";
        } else if (part.includes("우유") || part.includes("오트") || part.includes("아몬드") || part.includes("밀크")) {
          bgStyle = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
        } else if (part.includes("휘핑")) {
          bgStyle = "bg-purple-500/20 text-purple-300 border-purple-500/30";
        }

        const sizeStyle = size === "sm" ? "text-[10px] px-1.5 py-0.5 font-extrabold" : "text-xs px-2 py-0.5 font-bold";

        return (
          <span
            key={index}
            className={`${sizeStyle} rounded-md border ${bgStyle} inline-block`}
          >
            {part}
          </span>
        );
      })}
    </div>
  );
};
