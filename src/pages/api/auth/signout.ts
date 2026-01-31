import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "@/db/supabase.client";

export const prerender = false;

export const GET: APIRoute = async ({ cookies, request, redirect }) => {
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // Sign out from Supabase
  const { error } = await supabase.auth.signOut();

  if (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to sign out",
        message: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  // Redirect to home page after successful logout
  return redirect("/", 302);
};
