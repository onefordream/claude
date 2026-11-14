"use client";

import { useEffect, useState } from "react";

/** 会員証のスクリーンショット流用を防ぐための現在時刻表示 */
export function LiveClock() {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const f = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const tick = () => setNow(f.format(new Date()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="font-mono tabular-nums">{now}</span>;
}
