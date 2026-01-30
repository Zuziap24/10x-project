import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { FlashcardDto, CreateFlashcardCommand } from "../../types";

// ------------------------------------------------------------------
// Validation Schema
// ------------------------------------------------------------------

const flashcardSchema = z.object({
  front: z
    .string()
    .min(1, "Front side is required")
    .max(1000, "Front side must be less than 1000 characters")
    .transform((val) => val.trim()),
  back: z
    .string()
    .min(1, "Back side is required")
    .max(2000, "Back side must be less than 2000 characters")
    .transform((val) => val.trim()),
});

type FlashcardFormData = z.infer<typeof flashcardSchema>;

// ------------------------------------------------------------------
// Component Props
// ------------------------------------------------------------------

interface ManualFlashcardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: FlashcardDto | null;
  onSubmit: (data: CreateFlashcardCommand) => Promise<void>;
  isSubmitting: boolean;
}

// ------------------------------------------------------------------
// Main Component
// ------------------------------------------------------------------

export function ManualFlashcardDialog({
  open,
  onOpenChange,
  mode,
  initialData,
  onSubmit,
  isSubmitting,
}: ManualFlashcardDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FlashcardFormData>({
    resolver: zodResolver(flashcardSchema),
    defaultValues: {
      front: "",
      back: "",
    },
  });

  // Reset form when dialog opens/closes or initialData changes
  useEffect(() => {
    if (open) {
      reset({
        front: initialData?.front ?? "",
        back: initialData?.back ?? "",
      });
    }
  }, [open, initialData, reset]);

  const handleFormSubmit = async (data: FlashcardFormData) => {
    await onSubmit(data);
  };

  const handleOpenChange = (newOpen: boolean) => {
    // Prevent closing while submitting
    if (isSubmitting) return;
    onOpenChange(newOpen);
  };

  const isEdit = mode === "edit";
  const title = isEdit ? "Edit Flashcard" : "Add New Flashcard";
  const description = isEdit
    ? "Update the content of this flashcard."
    : "Create a new flashcard by filling in the front and back sides.";
  const submitLabel = isEdit ? "Save Changes" : "Create Flashcard";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Front Field */}
          <div className="space-y-2">
            <Label htmlFor="front">
              Front <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="front"
              placeholder="Enter the question or prompt..."
              className="min-h-[100px] resize-none"
              {...register("front")}
              disabled={isSubmitting}
              aria-invalid={!!errors.front}
              aria-describedby={errors.front ? "front-error" : undefined}
            />
            {errors.front && (
              <p id="front-error" className="text-sm text-destructive">
                {errors.front.message}
              </p>
            )}
          </div>

          {/* Back Field */}
          <div className="space-y-2">
            <Label htmlFor="back">
              Back <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="back"
              placeholder="Enter the answer or explanation..."
              className="min-h-[100px] resize-none"
              {...register("back")}
              disabled={isSubmitting}
              aria-invalid={!!errors.back}
              aria-describedby={errors.back ? "back-error" : undefined}
            />
            {errors.back && (
              <p id="back-error" className="text-sm text-destructive">
                {errors.back.message}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || (!isDirty && isEdit)}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEdit ? "Saving..." : "Creating..."}
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
