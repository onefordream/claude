import type { ReactNode } from "react";
import { GoldRule } from "./ui";

export function MemberTitle({ en, title, children }: { en: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-8">
      <p className="text-xs tracking-[0.3em] text-gold">{en}</p>
      <h1 className="mt-1 font-serif text-2xl md:text-3xl">{title}</h1>
      <GoldRule className="mt-3" />
      {children ? <div className="mt-4 text-sm text-mute">{children}</div> : null}
    </div>
  );
}
