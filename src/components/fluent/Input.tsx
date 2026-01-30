import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, description, error, ...props }, ref) => {
    return (
      <div className="grid w-full items-center gap-1.5">
        {label && (
          <label
            className={cn(
              "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              error ? "text-destructive" : "text-foreground"
            )}
          >
            {label}
          </label>
        )}
        <div className="relative group">
          <input
            type={type}
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
              // Fluent style: Accent border at the bottom on focus.
              // We simulate this or just use a strong border color change.
              // For strict Fluent "Accent Border" mock:
              "border-b-2 border-b-transparent focus-visible:border-b-primary",
              // Actually, standard input usually has full border, but focus state emphasizes bottom or uses a ring.
              // Let's stick to a clean border change that feels precise.
              "focus-visible:ring-0 focus-visible:border-primary",
              error && "border-destructive focus-visible:border-destructive",
              className
            )}
            ref={ref}
            {...props}
          />
          {/* Optional: The "Accent Border" effect could be an absolute div at the bottom if we wanted to animate it separately, 
              but changing border color is cleaner for maintenance. */}
        </div>

        {description && !error && <p className="text-xs text-muted-foreground">{description}</p>}
        {error && <p className="text-xs text-destructive font-medium">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "FluentInput";

export { Input };
