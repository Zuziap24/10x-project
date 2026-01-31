/// <reference types="astro/client" />

import type { SupabaseClient } from "./db/supabase.client.ts";
import type { User } from "@supabase/supabase-js";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
      user: User | null;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  readonly USE_MOCK_AI: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
