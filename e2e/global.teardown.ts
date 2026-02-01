/**
 * Global Teardown for E2E Tests
 * Cleans up test data created during test sessions
 *
 * This teardown authenticates with the same E2E user account that creates data
 * during tests, which ensures proper permissions with Row-Level Security.
 */

/* eslint-disable no-console */
import { test as teardown } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/db/database.types";

teardown("cleanup test data", async () => {
  console.log("🧹 Starting test data cleanup...");

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
    // Get all decks created by the E2E user
    const { data: decks, error: decksError } = await supabase.from("decks").select("id, name");

    if (decksError) {
      console.error("❌ Error fetching decks:", decksError);
      throw decksError;
    }

    if (decks && decks.length > 0) {
      console.log(`📦 Found ${decks.length} deck(s) to clean up`);

      // Delete flashcards first (foreign key constraint)
      for (const deck of decks) {
        const { error: flashcardsDeleteError, count } = await supabase
          .from("flashcards")
          .delete({ count: "exact" })
          .eq("deck_id", deck.id);

        if (flashcardsDeleteError) {
          console.error(`❌ Error deleting flashcards from deck "${deck.name}":`, flashcardsDeleteError);
        } else {
          console.log(`🗑️  Deleted ${count ?? 0} flashcard(s) from deck "${deck.name}"`);
        }
      }

      // Delete all decks
      const { error: decksDeleteError, count: decksCount } = await supabase
        .from("decks")
        .delete({ count: "exact" })
        .in(
          "id",
          decks.map((d) => d.id)
        );

      if (decksDeleteError) {
        console.error("❌ Error deleting decks:", decksDeleteError);
      } else {
        console.log(`🗑️  Deleted ${decksCount ?? 0} deck(s)`);
      }
    } else {
      console.log("📦 No decks found to clean up");
    }

    // Clean up generations
    const { error: generationsDeleteError, count: generationsCount } = await supabase
      .from("generations")
      .delete({ count: "exact" })
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all (dummy condition for RLS)

    if (generationsDeleteError) {
      console.error("❌ Error deleting generations:", generationsDeleteError);
    } else {
      console.log(`🗑️  Deleted ${generationsCount ?? 0} generation(s)`);
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

    console.log("✅ Test data cleanup completed successfully");
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    throw error;
  } finally {
    // Sign out
    await supabase.auth.signOut();
    console.log("👋 Signed out from E2E user");
  }
});
