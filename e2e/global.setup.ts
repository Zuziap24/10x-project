/**
 * Global Setup for E2E Tests
 * Cleans up rate-limiting data before tests run to ensure clean state
 *
 * This setup authenticates with the same E2E user account that runs tests,
 * ensuring proper permissions with Row-Level Security.
 */

/* eslint-disable no-console */
import { test as setup } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/db/database.types";

setup("cleanup rate limit data before tests", async () => {
  console.log("🧹 Starting pre-test cleanup (rate limits)...");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const e2eUsername = process.env.E2E_USERNAME;
  const e2ePassword = process.env.E2E_PASSWORD;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_KEY environment variables");
    throw new Error("Missing Supabase configuration");
  }

  if (!e2eUsername || !e2ePassword) {
    console.error("❌ Missing E2E_USERNAME or E2E_PASSWORD environment variables");
    throw new Error("Missing E2E credentials");
  }

  // Create Supabase client
  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  // Sign in with E2E user to have proper RLS permissions
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: e2eUsername,
    password: e2ePassword,
  });

  if (signInError) {
    console.error("❌ Error signing in:", signInError);
    throw signInError;
  }

  console.log("✅ Authenticated as E2E user");

  try {
    // Clean up generations to reset rate limit
    const { error: generationsDeleteError, count: generationsCount } = await supabase
      .from("generations")
      .delete({ count: "exact" })
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all (dummy condition for RLS)

    if (generationsDeleteError) {
      console.error("❌ Error deleting generations:", generationsDeleteError);
    } else {
      console.log(`🗑️  Deleted ${generationsCount ?? 0} generation(s) to reset rate limit`);
    }

    // Clean up generation error logs
    const { error: errorLogsDeleteError, count: errorLogsCount } = await supabase
      .from("generation_error_logs")
      .delete({ count: "exact" })
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all (dummy condition for RLS)

    if (errorLogsDeleteError) {
      console.error("❌ Error deleting generation error logs:", errorLogsDeleteError);
    } else {
      console.log(`🗑️  Deleted ${errorLogsCount ?? 0} generation error log(s)`);
    }

    console.log("✅ Pre-test cleanup completed successfully");
  } catch (error) {
    console.error("❌ Pre-test cleanup failed:", error);
    throw error;
  } finally {
    // Sign out
    await supabase.auth.signOut();
    console.log("👋 Signed out from E2E user");
  }
});
