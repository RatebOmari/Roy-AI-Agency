import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft hover:shadow-card hover:translate-y-[-1px]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:translate-y-[-1px]",
        outline: "border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground hover:translate-y-[-1px]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:translate-y-[-1px]",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-accent underline-offset-4 hover:underline",
        // Smart green CTA buttons with enhanced animations
        hero: "gradient-accent text-accent-foreground font-bold shadow-card hover:shadow-elevated hover:scale-[1.02] hover:translate-y-[-2px] active:scale-[0.98] active:translate-y-0",
        heroOutline: "border-2 border-primary-foreground/30 bg-primary-foreground/5 text-primary-foreground hover:bg-primary-foreground/10 hover:border-primary-foreground/50 backdrop-blur-sm hover:translate-y-[-1px]",
        cta: "gradient-accent text-accent-foreground font-bold shadow-card hover:shadow-elevated hover:scale-[1.02] hover:translate-y-[-2px] active:scale-[0.98] active:translate-y-0",
        ctaSecondary: "bg-card text-foreground border border-border shadow-soft hover:shadow-card hover:border-accent/40 hover:translate-y-[-1px]",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-lg px-4 text-sm",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-base font-bold",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
