import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

// shadcn/ui の Button と同じ構成（cva + cn）
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
  {
    variants: {
      variant: {
        gold: "bg-gradient-to-b from-gold-soft via-gold to-gold-deep text-navy-950 shadow-[0_8px_24px_-8px_rgba(212,175,55,0.6)] hover:brightness-110",
        primary: "bg-gradient-to-b from-sky to-[#3b6fd9] text-white shadow-[0_8px_24px_-10px_rgba(91,157,255,0.7)] hover:brightness-110",
        outline: "border border-line bg-white/[0.03] text-text hover:bg-white/[0.07]",
        ghost: "text-muted hover:text-text hover:bg-white/[0.05]",
        danger: "border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-5 text-[0.95rem]",
        lg: "h-14 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = "Button";
