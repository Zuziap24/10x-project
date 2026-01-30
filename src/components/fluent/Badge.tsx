import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline";
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(({ className, variant = "default", ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
      variant === "default" && "bg-primary/10 text-primary ring-primary/20",
      variant === "secondary" && "bg-muted text-muted-foreground ring-border",
      variant === "outline" && "bg-transparent text-foreground ring-border",
      className
    )}
    {...props}
  />
));
Badge.displayName = "Badge";

export { Badge };
