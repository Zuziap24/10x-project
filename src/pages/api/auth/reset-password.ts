import type { APIRoute } from "astro";
import { z } from "zod";
import { forgotPasswordSchema } from "@/lib/validators/auth.validator";
import { createSupabaseServerInstance } from "@/db/supabase.client";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = forgotPasswordSchema.parse(body);

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(validatedData.email, {
      redirectTo: `${new URL(request.url).origin}/auth/update-password`,
    });

    if (error) {
      return new Response(
        JSON.stringify({
          error: "Failed to send reset email",
          message: error.message,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Always return success to prevent email enumeration
    return new Response(
      JSON.stringify({
        success: true,
        message: "If an account exists with that email, a reset link has been sent",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          message: error.errors[0].message,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
