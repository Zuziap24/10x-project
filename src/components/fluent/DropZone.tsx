import * as React from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DropZoneProps extends React.HTMLAttributes<HTMLDivElement> {
  onFilesSelected?: (files: FileList) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
}

const DropZone = React.forwardRef<HTMLDivElement, DropZoneProps>(
  ({ className, onFilesSelected, accept, multiple = true, disabled = false, children, ...props }, ref) => {
    const [isDragOver, setIsDragOver] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (!disabled && e.dataTransfer.files.length > 0) {
        onFilesSelected?.(e.dataTransfer.files);
      }
    };

    const handleClick = () => {
      if (!disabled) inputRef.current?.click();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onFilesSelected?.(e.target.files);
      }
    };

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={cn(
          "relative flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-background p-6 text-center transition-colors",
          isDragOver && "border-primary bg-primary/5",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        {...props}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          disabled={disabled}
        />
        {children || (
          <>
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drag & drop files here or <span className="font-medium text-primary hover:underline">browse</span>
            </p>
          </>
        )}
      </div>
    );
  }
);
DropZone.displayName = "DropZone";

export { DropZone };
