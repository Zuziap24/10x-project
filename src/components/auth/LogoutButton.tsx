import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

// ------------------------------------------------------------------
// Component Props
// ------------------------------------------------------------------

interface LogoutButtonProps {
  variant?: "ghost" | "default" | "destructive" | "outline" | "secondary" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

// ------------------------------------------------------------------
// Main Component
// ------------------------------------------------------------------

export function LogoutButton({ variant = "ghost", size = "default", className }: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/signout", {
        method: "GET",
        credentials: "same-origin",
      });

      if (response.ok) {
        // Server-side reload after successful logout
        window.location.href = "/";
      } else {
        // Logout failed - reset loading state
        setIsLoading(false);
      }
    } catch {
      // Error during logout - reset loading state
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleLogout}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={className}
      aria-label="Sign out"
    >
      <LogOut className="h-4 w-4 mr-2" />
      {isLoading ? "Signing out..." : "Sign out"}
    </Button>
  );
}
