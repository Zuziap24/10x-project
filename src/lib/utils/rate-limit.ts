import type { SupabaseClient } from "../../db/supabase.client";

/**
 * Checks if a user has exceeded the rate limit for flashcard generation.
 * Rate limit is based on the number of generation requests within the last hour.
 *
 * @param supabase - Supabase client instance
 * @param userId - UUID of the user to check
 * @param limitPerHour - Maximum number of generations allowed per hour (default: 10)
 * @returns True if the user is within the rate limit, false if exceeded
 *
 * @example
 * const canGenerate = await checkGenerationRateLimit(supabase, userId);
 * if (!canGenerate) {
 *   // Return 429 Too Many Requests
 * }
 */
export async function checkGenerationRateLimit(
  supabase: SupabaseClient,
  userId: string,
  limitPerHour = 10
): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("generations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", oneHourAgo);

  if (error) {
    // On error, allow the request to proceed (fail open)
    // Consider failing closed in production for stricter rate limiting
    // TODO: Add proper error logging service
    return true;
  }

  return (count ?? 0) < limitPerHour;
}
