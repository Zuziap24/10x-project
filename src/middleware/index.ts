import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.client.ts";

export const onRequest = defineMiddleware(async (context, next) => {
  // Create Supabase client with SSR support
  const supabase = createSupabaseServerInstance({
    cookies: context.cookies,
    headers: context.request.headers,
  });

  // Store supabase instance in locals
  context.locals.supabase = supabase;

  // IMPORTANT: Always get user session first before any other operations
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Store user in locals
  context.locals.user = user;

  // Protected routes - require authentication
  const protectedRoutes = ["/generate", "/dashboard", "/decks"];
  const isProtectedRoute = protectedRoutes.some((route) => context.url.pathname.startsWith(route));

  if (isProtectedRoute && !user) {
    return context.redirect("/signin");
  }

  // Guest routes - redirect if already authenticated
  const guestRoutes = ["/signin", "/register"];
  const isGuestRoute = guestRoutes.some((route) => context.url.pathname === route);

  if (isGuestRoute && user) {
    return context.redirect("/dashboard");
  }

  return next();
});
