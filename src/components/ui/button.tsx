import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-[13px] font-medium transition-[background,color,border,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-fg hover:opacity-90 shadow-[inset_0_-1px_0_rgb(0_0_0/0.15)]",
        secondary: "border border-border bg-transparent text-fg hover:bg-hover hover:border-border-strong",
        ghost: "text-muted hover:bg-hover hover:text-fg",
        danger: "border border-critical/40 bg-critical-soft text-critical hover:bg-critical/20",
        success: "border border-healthy/40 bg-healthy-soft text-healthy hover:bg-healthy/20",
        warning: "border border-warning/40 bg-warning-soft text-warning hover:bg-warning/20",
      },
      size: {
        sm: "h-7 px-2.5 text-xs",
        md: "h-8 px-3",
        lg: "h-9 px-4",
        icon: "size-8",
        iconSm: "size-7",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = "Button";

export { buttonVariants };
