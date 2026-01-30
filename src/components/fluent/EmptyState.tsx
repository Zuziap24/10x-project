import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, action, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background p-8 text-center",
        className
      )}
      {...props}
    >
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      {title && <h3 className="mb-1 text-sm font-medium text-foreground">{title}</h3>}
      {description && <p className="mb-4 text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action}
    </div>
  )
);
EmptyState.displayName = "EmptyState";

export { EmptyState };
