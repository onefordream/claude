import { ReactNode } from "react";

export default function PhoneFrame({
  children,
  className = "",
  time = "9:41",
}: {
  children: ReactNode;
  className?: string;
  time?: string;
}) {
  return (
    <div
      className={`relative mx-auto w-[280px] sm:w-[300px] rounded-phone bg-ink p-[10px] shadow-phone ${className}`}
      aria-hidden="true"
    >
      <div className="relative w-full aspect-[9/19.5] rounded-[34px] overflow-hidden bg-white flex flex-col">
        {/* status bar */}
        <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-semibold text-ink shrink-0">
          <span>{time}</span>
          <div className="flex items-center gap-1">
            <span className="block w-3.5 h-2 rounded-[2px] border border-ink/70" />
          </div>
        </div>
        {/* notch */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-28 h-6 bg-ink rounded-b-2xl" />
        {/* screen content */}
        <div className="flex-1 overflow-y-auto no-scrollbar">{children}</div>
      </div>
    </div>
  );
}
