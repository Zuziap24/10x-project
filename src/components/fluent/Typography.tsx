import * as React from "react";
import { cn } from "@/lib/utils";

const Title = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h1 ref={ref} className={cn("text-2xl font-semibold tracking-tight text-foreground", className)} {...props}>
      {children}
    </h1>
  )
);
Title.displayName = "Title";

const Subtitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h2 ref={ref} className={cn("text-lg font-medium text-foreground/90", className)} {...props}>
      {children}
    </h2>
  )
);
Subtitle.displayName = "Subtitle";

const Body = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-base font-normal text-foreground", className)} {...props} />
  )
);
Body.displayName = "Body";

const Caption = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-xs text-muted-foreground", className)} {...props} />
  )
);
Caption.displayName = "Caption";

export { Title, Subtitle, Body, Caption };
