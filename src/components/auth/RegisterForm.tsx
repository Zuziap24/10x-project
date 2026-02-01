import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { registerSchema, type RegisterFormData } from "@/lib/validators/auth.validator";
import { isFeatureEnabled } from "@/features";

// ------------------------------------------------------------------
// Component Props
// ------------------------------------------------------------------

interface RegisterFormProps {
  onSubmit?: (data: RegisterFormData) => Promise<void>;
}

// ------------------------------------------------------------------
// Main Component
// ------------------------------------------------------------------

export function RegisterForm({ onSubmit }: RegisterFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleFormSubmit = useCallback(
    async (data: RegisterFormData) => {
      setError(null);
      setIsLoading(true);

      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: data.email,
            password: data.password,
          }),
          credentials: "same-origin",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Failed to register");
        }

        // Check if email confirmation is needed
        if (result.needsConfirmation) {
          // User already exists or needs email confirmation
          // Redirect to signin page with a message
          window.location.href = "/signin?message=check_email";
          return;
        }

        // Call custom onSubmit if provided
        if (onSubmit) {
          await onSubmit(data);
        }

        // Server-side reload to update session
        window.location.href = "/";
      } catch (err) {
        const message = err instanceof Error ? err.message : "An error occurred during registration";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [onSubmit]
  );

  // Feature flag check must be AFTER all hooks to satisfy Rules of Hooks
  if (!isFeatureEnabled("auth")) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Registration Disabled</CardTitle>
          <CardDescription>New account registration is currently unavailable.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Create an account</CardTitle>
        <CardDescription>Enter your details to get started</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="grid gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              disabled={isLoading}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <p id="email-error" className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isLoading}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              {...register("password")}
            />
            {errors.password && (
              <p id="password-error" className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">Password must be at least 6 characters</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isLoading}
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p id="confirm-password-error" className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create account
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <div className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <a href="/signin" className="text-primary underline-offset-4 hover:underline">
            Sign in
          </a>
        </div>
      </CardFooter>
    </Card>
  );
}
