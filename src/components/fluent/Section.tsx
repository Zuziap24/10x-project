import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  count?: number;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ className, title, description, count, badge, actions, children, ...props }, ref) => (
    <section ref={ref} className={cn("space-y-4", className)} {...props}>
      {(title || actions) && (
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {title && (
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {title}
                {count !== undefined && <span className="ml-2 text-muted-foreground font-normal">({count})</span>}
              </h2>
            )}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          <div className="flex items-center gap-2">
            {badge}
            {actions}
          </div>
        </div>
      )}
      {children}
    </section>
  )
);
Section.displayName = "Section";

export { Section };
