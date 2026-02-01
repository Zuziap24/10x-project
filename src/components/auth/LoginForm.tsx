import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { loginSchema, type LoginFormData } from "@/lib/validators/auth.validator";
import { isFeatureEnabled } from "@/features";

// ------------------------------------------------------------------
// Component Props
// ------------------------------------------------------------------

interface LoginFormProps {
  onSubmit?: (data: LoginFormData) => Promise<void>;
}

// ------------------------------------------------------------------
// Main Component
// ------------------------------------------------------------------

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleFormSubmit = useCallback(
    async (data: LoginFormData) => {
      setError(null);
      setIsLoading(true);

      try {
        const response = await fetch("/api/auth/signin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
          credentials: "same-origin",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Failed to sign in");
        }

        // Call custom onSubmit if provided
        if (onSubmit) {
          await onSubmit(data);
        }

        // Server-side reload to update session
        window.location.href = "/";
      } catch (err) {
        const message = err instanceof Error ? err.message : "An error occurred during sign in";
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
          <CardTitle>Log In Disabled</CardTitle>
          <CardDescription>Authentication features are currently unavailable.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your account to continue</CardDescription>
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <a
                href="/forgot-password"
                className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
              >
                Forgot password?
              </a>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
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
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <div className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <a href="/register" className="text-primary underline-offset-4 hover:underline">
            Sign up
          </a>
        </div>
      </CardFooter>
    </Card>
  );
}
