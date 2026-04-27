-- ============================================================================
-- AlgoMart — Sessions & Session Products schema
-- ============================================================================
--
-- Apply against your Postgres / Supabase database (e.g. via Supabase SQL editor
-- or `psql "$DATABASE_URL" -f db/migrations/001_init_sessions.sql`).
--
-- The mobile app NEVER connects to this database directly. All access goes
-- through the Express server, which:
--   1. Authenticates the caller via `Authorization: Bearer <API_TOKEN>` and
--      then uses that same token as the per-user "owner" key on every row
--      (`api_token` column).
--   2. Connects to Postgres with the credentials in `DATABASE_URL`.
--
-- RLS NOTE
-- --------
-- The `postgres` (owner) and Supabase `service_role` roles BYPASS RLS, so the
-- policies below act as a hard fence around the `anon` and `authenticated`
-- roles — the Supabase-exposed REST/realtime entrypoints. We deliberately
-- grant ZERO access to those roles so even if the anon/public Supabase URL
-- and key are leaked, no session data can be read or written from outside
-- your server.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── sessions ─────────────────────────────────────────────────────────────────
create table if not exists public.sessions (
    id           uuid        primary key default gen_random_uuid(),
    api_token    text        not null,
    title        text        not null,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

create index if not exists sessions_api_token_idx
    on public.sessions (api_token, updated_at desc);

-- ── session_products ────────────────────────────────────────────────────────
create table if not exists public.session_products (
    id                       uuid        primary key default gen_random_uuid(),
    session_id               uuid        not null references public.sessions(id) on delete cascade,
    asin                     text        not null,
    barcode                  text        not null default '',
    barcode_type             text        not null default '',
    title                    text        not null default 'Unknown Product',
    image                    text        not null default '',
    rating                   numeric     not null default 0,
    review_count             integer     not null default 0,
    category                 text        not null default '',
    price                    numeric     not null default 0,
    found_price              numeric     not null default 0,
    seller_popularity        text        not null default 'Low',
    seller_popularity_score  integer     not null default 0,
    estimated_shipping       numeric     not null default 0,
    amazon_fees              numeric     not null default 0,
    profit_margin            numeric     not null default 0,
    requires_approval        boolean     not null default false,
    competition_level        text        not null default 'Low',
    bsr                      integer     not null default 0,
    dimensions               text        not null default '',
    weight                   text        not null default '',
    restrictions             jsonb       not null default '[]'::jsonb,
    monthly_sales_estimate   integer     not null default 0,
    estimated_quantity       integer     not null default 1,
    created_at               timestamptz not null default now()
);

create index if not exists session_products_session_idx
    on public.session_products (session_id, created_at desc);

-- ── Row-Level Security ───────────────────────────────────────────────────────
alter table public.sessions          enable row level security;
alter table public.session_products  enable row level security;

-- Force RLS even for table owners reached through Supabase (defence in depth).
-- The role used by `DATABASE_URL` (`postgres`) still bypasses RLS because it
-- is a superuser; force_rls is redundant for that connection but cheap to set.
alter table public.sessions          force row level security;
alter table public.session_products  force row level security;

-- Strip every default privilege from the Supabase-exposed roles. Without an
-- explicit GRANT, RLS is moot — the role can't execute the query at all.
revoke all on public.sessions          from anon, authenticated;
revoke all on public.session_products  from anon, authenticated;

-- Drop any pre-existing policies (idempotent re-runs).
drop policy if exists "sessions_block_anon"          on public.sessions;
drop policy if exists "session_products_block_anon"  on public.session_products;

-- Explicit deny-all policies for anon + authenticated. With no GRANT and a
-- USING(false) policy, neither Supabase's REST API nor the JS client can
-- read or write these tables. Server-side `postgres` connections continue
-- to work because superusers bypass RLS.
create policy "sessions_block_anon"
    on public.sessions
    as restrictive
    for all
    to anon, authenticated
    using (false)
    with check (false);

create policy "session_products_block_anon"
    on public.session_products
    as restrictive
    for all
    to anon, authenticated
    using (false)
    with check (false);
