import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "aevix-button group relative inline-flex h-12 min-w-max items-center justify-center overflow-hidden rounded-full px-6 text-sm font-semibold transition-[transform,box-shadow,background-color,border-color,color] duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/45 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-px active:scale-[0.975]",
  {
    variants: {
      variant: {
        primary:
          "bg-ink text-porcelain shadow-[0_12px_30px_rgba(9,8,7,0.16)] before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-white/40 hover:shadow-[0_22px_52px_rgba(62,51,96,0.24)]",
        glass:
          "border border-ink/10 bg-white/64 text-ink shadow-[0_8px_24px_rgba(18,22,27,0.05)] backdrop-blur-xl hover:border-violet/24 hover:bg-white/90 hover:shadow-[0_20px_44px_rgba(72,61,108,0.14)]",
        ghost: "text-ink/72 hover:bg-ink/5 hover:text-ink",
      },
      size: {
        default: "h-12 px-6",
        sm: "h-10 px-4 text-xs",
        icon: "h-11 w-11 px-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
