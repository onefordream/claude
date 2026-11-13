"use client";
import { useEffect, useState } from "react";

/** 一文字ずつ表示するセリフ。skip=true で即時全文表示 */
export function Typewriter({ text, speed = 38, skip = false, onDone }: { text: string; speed?: number; skip?: boolean; onDone?: () => void }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
  }, [text]);
  useEffect(() => {
    if (skip || n >= text.length) {
      if (n < text.length) setN(text.length);
      else onDone?.();
      return;
    }
    const t = setTimeout(() => setN((v) => v + 1), speed);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, text, skip, speed]);
  return (
    <span>
      {text.slice(0, n)}
      {n < text.length && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-gold-soft" />}
    </span>
  );
}
