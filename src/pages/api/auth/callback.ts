import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "@/db/supabase.client";

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies, request, redirect }) => {
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";

  if (!code) {
    return redirect("/signin?error=missing_code", 302);
  }

  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // Exchange the code for a session
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirect("/signin?error=invalid_code", 302);
  }

  // Redirect to the next page (dashboard by default)
  return redirect(next, 302);
};
