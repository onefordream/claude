import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-xl border border-line bg-navy-950/70 px-4 py-3 text-[16px] text-text placeholder:text-muted/70 outline-none transition focus:border-sky/60 focus:ring-2 focus:ring-sky/20";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(base, className)} {...p} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(base, "resize-none leading-relaxed", className)} {...p} />
));
Textarea.displayName = "Textarea";

export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={cn("mb-1.5 block text-xs font-semibold tracking-wide text-muted", className)}>{children}</label>;
}
