-- =====================================================================
-- Migration: Add RLS Policies for all tables
-- Purpose: Enable data access through Supabase client with proper security
-- Author: E2E Test Fix
-- Date: 2026-02-01
-- =====================================================================

-- =====================================================================
-- SECTION 1: DECKS TABLE POLICIES
-- =====================================================================

-- Policy: Users can view their own decks
create policy "Users can view own decks"
  on public.decks
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Policy: Users can create their own decks
create policy "Users can create own decks"
  on public.decks
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Policy: Users can update their own decks
create policy "Users can update own decks"
  on public.decks
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy: Users can delete their own decks
create policy "Users can delete own decks"
  on public.decks
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- =====================================================================
-- SECTION 2: FLASHCARDS TABLE POLICIES
-- =====================================================================

-- Policy: Users can view their own flashcards
create policy "Users can view own flashcards"
  on public.flashcards
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Policy: Users can create their own flashcards
create policy "Users can create own flashcards"
  on public.flashcards
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Policy: Users can update their own flashcards
create policy "Users can update own flashcards"
  on public.flashcards
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy: Users can delete their own flashcards
create policy "Users can delete own flashcards"
  on public.flashcards
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- =====================================================================
-- SECTION 3: GENERATIONS TABLE POLICIES
-- =====================================================================

-- Policy: Users can view their own generations
create policy "Users can view own generations"
  on public.generations
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Policy: Users can create their own generations
create policy "Users can create own generations"
  on public.generations
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- =====================================================================
-- SECTION 4: GENERATION ERROR LOGS TABLE POLICIES
-- =====================================================================

-- Policy: Users can view their own error logs
create policy "Users can view own error logs"
  on public.generation_error_logs
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Policy: Users can create their own error logs
create policy "Users can create own error logs"
  on public.generation_error_logs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================
-- RLS policies added for:
-- - decks: full CRUD for authenticated users on own records
-- - flashcards: full CRUD for authenticated users on own records
-- - generations: SELECT and INSERT for authenticated users on own records
-- - generation_error_logs: SELECT and INSERT for authenticated users on own records
-- =====================================================================
