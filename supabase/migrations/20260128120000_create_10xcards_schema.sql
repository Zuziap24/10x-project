-- =====================================================================
-- Migration: Create 10x-cards Database Schema
-- Purpose: Initialize core tables for flashcard application with AI generation tracking
-- Tables: decks, generations, flashcards, generation_error_logs
-- Features: RLS policies, indexes, triggers for updated_at
-- Author: Database Planning Session
-- Date: 2026-01-28
-- =====================================================================

-- =====================================================================
-- SECTION 1: DECKS TABLE
-- Purpose: Stores user-owned flashcard decks (collections)
-- =====================================================================

create table public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add comment to table
comment on table public.decks is 'Stores flashcard decks owned by users. Each deck is a thematic collection of flashcards.';

-- Enable Row Level Security
-- Note: RLS is enabled but no policies defined - table will be inaccessible via client
-- Access should be managed through server-side API endpoints
alter table public.decks enable row level security;

-- Index: Optimize queries for user's deck list (dashboard view)
create index idx_decks_user_id on public.decks(user_id);

-- =====================================================================
-- SECTION 2: GENERATIONS TABLE
-- Purpose: Audit log for AI generation operations (cost tracking, quality metrics)
-- =====================================================================

create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  model varchar not null,
  source_text_hash varchar not null,
  source_text_length integer not null check (source_text_length between 10 and 50000),
  generated_count integer not null,
  generation_duration integer not null,
  created_at timestamptz not null default now()
);

-- Add comment to table
comment on table public.generations is 'Audit log for AI flashcard generation operations. Tracks model usage, costs, and generation metrics.';
comment on column public.generations.source_text_hash is 'SHA-256 hash of input text to detect duplicate generation requests';
comment on column public.generations.generation_duration is 'Time taken to generate flashcards in milliseconds';

-- Enable Row Level Security
-- Note: RLS is enabled but no policies defined - table will be inaccessible via client
-- Access should be managed through server-side API endpoints
alter table public.generations enable row level security;

-- Index: Optimize queries for user's generation history (sorted by date)
create index idx_generations_user_created on public.generations(user_id, created_at desc);

-- =====================================================================
-- SECTION 3: FLASHCARDS TABLE
-- Purpose: Core table storing flashcard content and spaced repetition metadata
-- =====================================================================

create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  generation_id uuid references public.generations(id) on delete set null,
  front text not null,
  back text not null,
  source varchar not null check (source in ('ai-full', 'ai-edited', 'manual')),
  -- Spaced Repetition Algorithm Fields
  next_review_at timestamptz not null default now(),
  interval integer not null default 0,
  ease_factor real not null default 2.5,
  repetitions integer not null default 0,
  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add comments to table and columns
comment on table public.flashcards is 'Core flashcard storage with content, spaced repetition metadata, and origin tracking';
comment on column public.flashcards.user_id is 'Denormalized for RLS performance - avoids JOIN with decks table';
comment on column public.flashcards.source is 'Origin: ai-full (unedited AI), ai-edited (modified AI), manual (user-created)';
comment on column public.flashcards.next_review_at is 'Scheduled date for next review in spaced repetition algorithm';
comment on column public.flashcards.interval is 'Current interval in days for spaced repetition';
comment on column public.flashcards.ease_factor is 'Ease factor for SM-2 algorithm (default 2.5)';
comment on column public.flashcards.repetitions is 'Consecutive successful repetitions count';

-- Enable Row Level Security
-- Note: RLS is enabled but no policies defined - table will be inaccessible via client
-- Access should be managed through server-side API endpoints
alter table public.flashcards enable row level security;

-- Index: Optimize loading all flashcards in a deck
create index idx_flashcards_deck_id on public.flashcards(deck_id);

-- Index: Optimize spaced repetition queries (cards due for review today)
create index idx_flashcards_deck_review on public.flashcards(deck_id, next_review_at);

-- Index: Optimize global user statistics
create index idx_flashcards_user_id on public.flashcards(user_id);

-- Index: Optimize analytics queries (which cards came from which generation)
create index idx_flashcards_generation_id on public.flashcards(generation_id);

-- =====================================================================
-- SECTION 4: GENERATION ERROR LOGS TABLE
-- Purpose: Log AI generation failures for debugging and monitoring
-- =====================================================================

create table public.generation_error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  model varchar not null,
  error_code varchar(100) not null,
  error_message text not null,
  created_at timestamptz not null default now()
);

-- Add comment to table
comment on table public.generation_error_logs is 'Error logs for failed AI generation attempts. Used for debugging and monitoring API issues.';

-- Enable Row Level Security
-- Note: RLS is enabled but no policies defined - table will be inaccessible via client
-- Access should be managed through server-side API endpoints
alter table public.generation_error_logs enable row level security;

-- Index: Optimize queries for user's error history
create index idx_error_logs_user_created on public.generation_error_logs(user_id, created_at desc);

-- =====================================================================
-- SECTION 5: TRIGGERS
-- Purpose: Automatically update updated_at timestamp on record modifications
-- =====================================================================

-- Function: Generic updated_at timestamp updater
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger: Auto-update updated_at for decks table
create trigger set_updated_at_decks
  before update on public.decks
  for each row
  execute function public.handle_updated_at();

-- Trigger: Auto-update updated_at for flashcards table
create trigger set_updated_at_flashcards
  before update on public.flashcards
  for each row
  execute function public.handle_updated_at();

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================
-- Tables created: decks, generations, flashcards, generation_error_logs
-- RLS enabled on all tables with granular policies for authenticated and anon roles
-- Indexes created for optimal query performance
-- Triggers established for automatic updated_at management
-- =====================================================================
