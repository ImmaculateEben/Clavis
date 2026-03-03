-- ==========================================
-- VoteSphere 2.0 — Migration 001: Full Schema
-- ==========================================

-- Extensions
create extension if not exists pgcrypto;
create extension if not exists citext;

-- =========================
-- ENUMS
-- =========================
do $$ begin
  create type election_status as enum ('draft','scheduled','open','closed','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type anonymity_mode as enum ('anonymous','hybrid','transparent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type result_visibility as enum ('realtime','after_close','manual','admin_only');
exception when duplicate_object then null; end $$;

do $$ begin
  create type voting_method as enum ('single','multiple','ranked','weighted','referendum','score');
exception when duplicate_object then null; end $$;

do $$ begin
  create type org_role as enum ('super_admin','org_admin','election_officer','observer','voter');
exception when duplicate_object then null; end $$;

-- =========================
-- CORE TENANT TABLES
-- =========================
create table if not exists public.organizations (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  slug        citext      unique not null,
  logo_path   text,
  primary_color text      default '#6C63FF',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id    uuid        primary key references auth.users(id) on delete cascade,
  full_name  text,
  email      citext,
  phone      text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.org_members (
  id                  uuid        primary key default gen_random_uuid(),
  org_id              uuid        not null references public.organizations(id) on delete cascade,
  user_id             uuid        not null references auth.users(id) on delete cascade,
  role                org_role    not null,
  membership_id       text,
  branch_id           text,
  department          text,
  shareholder_weight  numeric(18,6) default 1,
  is_active           boolean     not null default true,
  invited_by          uuid        references auth.users(id),
  created_at          timestamptz not null default now(),
  unique (org_id, user_id)
);

-- =========================
-- ELECTION SETUP
-- =========================
create table if not exists public.elections (
  id                  uuid          primary key default gen_random_uuid(),
  org_id              uuid          not null references public.organizations(id) on delete cascade,
  title               text          not null,
  description         text,
  status              election_status not null default 'draft',
  voting_method       voting_method not null default 'single',
  anonymity           anonymity_mode not null default 'anonymous',
  result_visibility   result_visibility not null default 'after_close',
  start_at            timestamptz,
  end_at              timestamptz,
  allow_proxy         boolean       not null default false,
  quorum_percentage   numeric(5,2),
  quorum_min_votes    integer,
  approval_threshold  numeric(5,2)  default 50.00,
  results_released_at timestamptz,
  created_by          uuid          references auth.users(id),
  created_at          timestamptz   not null default now(),
  updated_at          timestamptz   not null default now(),
  constraint chk_time_range check (end_at is null or start_at is null or end_at > start_at)
);

create table if not exists public.positions (
  id           uuid        primary key default gen_random_uuid(),
  election_id  uuid        not null references public.elections(id) on delete cascade,
  org_id       uuid        not null references public.organizations(id) on delete cascade,
  title        text        not null,
  description  text,
  max_selections integer   not null default 1,
  sort_order   integer     not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists public.candidates (
  id           uuid        primary key default gen_random_uuid(),
  election_id  uuid        not null references public.elections(id) on delete cascade,
  position_id  uuid        not null references public.positions(id) on delete cascade,
  org_id       uuid        not null references public.organizations(id) on delete cascade,
  full_name    text        not null,
  manifesto    text,
  photo_path   text,
  campaign_video_url text,
  social_links jsonb       default '{}',
  approved     boolean     not null default false,
  approved_by  uuid        references auth.users(id),
  approved_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- =========================
-- VOTER REGISTRY & ELIGIBILITY
-- =========================
create table if not exists public.voter_registry (
  id                uuid        primary key default gen_random_uuid(),
  org_id            uuid        not null references public.organizations(id) on delete cascade,
  election_id       uuid        not null references public.elections(id) on delete cascade,
  user_id           uuid        references auth.users(id) on delete set null,
  email             citext,
  phone             text,
  external_voter_id text,
  branch_id         text,
  department        text,
  is_eligible       boolean     not null default true,
  invited_at        timestamptz,
  unique_token      text        unique,
  created_at        timestamptz not null default now(),
  unique (org_id, election_id, user_id),
  unique (org_id, election_id, email)
);

create table if not exists public.proxies (
  id                     uuid  primary key default gen_random_uuid(),
  org_id                 uuid  not null references public.organizations(id) on delete cascade,
  election_id            uuid  not null references public.elections(id) on delete cascade,
  principal_registry_id  uuid  not null references public.voter_registry(id) on delete cascade,
  proxy_registry_id      uuid  not null references public.voter_registry(id) on delete cascade,
  created_by             uuid  references auth.users(id),
  created_at             timestamptz not null default now(),
  unique (election_id, principal_registry_id)
);

-- =========================
-- VOTES
-- =========================
create table if not exists public.votes (
  id                uuid        primary key default gen_random_uuid(),
  org_id            uuid        not null references public.organizations(id) on delete cascade,
  election_id       uuid        not null references public.elections(id) on delete cascade,
  registry_id       uuid        references public.voter_registry(id) on delete set null,
  proxy_registry_id uuid        references public.voter_registry(id) on delete set null,
  voter_hash        text,       -- HMAC of voter token for anonymous dedup
  weight            numeric(18,6) not null default 1,
  encrypted_payload bytea       not null,
  receipt_code      text        not null unique,
  device_hash       text,
  ip_hash           text,
  created_at        timestamptz not null default now()
);

-- Index for fast duplicate checks
create unique index if not exists idx_votes_election_registry
  on public.votes (election_id, registry_id)
  where registry_id is not null;

create unique index if not exists idx_votes_election_voter_hash
  on public.votes (election_id, voter_hash)
  where voter_hash is not null;

-- Normalized selections (only written for hybrid/transparent elections)
create table if not exists public.vote_selections (
  id           uuid        primary key default gen_random_uuid(),
  org_id       uuid        not null references public.organizations(id) on delete cascade,
  election_id  uuid        not null references public.elections(id) on delete cascade,
  vote_id      uuid        not null references public.votes(id) on delete cascade,
  position_id  uuid        not null references public.positions(id) on delete cascade,
  candidate_id uuid        references public.candidates(id) on delete set null,
  rank         integer,
  score        numeric(10,2),
  created_at   timestamptz not null default now()
);

-- Results snapshot (written once at close)
create table if not exists public.election_results (
  id           uuid        primary key default gen_random_uuid(),
  org_id       uuid        not null references public.organizations(id) on delete cascade,
  election_id  uuid        not null references public.elections(id) on delete cascade,
  computed_at  timestamptz not null default now(),
  results_json jsonb       not null,
  results_hash text,       -- SHA-256 of results_json for tamper detection
  unique (election_id)
);

-- =========================
-- AUDIT LOGS
-- =========================
create table if not exists public.audit_logs (
  id            uuid        primary key default gen_random_uuid(),
  org_id        uuid        references public.organizations(id) on delete set null,
  actor_user_id uuid        references auth.users(id) on delete set null,
  action        text        not null,
  entity_type   text,
  entity_id     uuid,
  metadata      jsonb       not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

-- =========================
-- UPDATED_AT TRIGGERS
-- =========================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_org_updated on public.organizations;
create trigger trg_org_updated before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_elections_updated on public.elections;
create trigger trg_elections_updated before update on public.elections
for each row execute function public.set_updated_at();

-- Auto-create profile when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email)
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================
-- ROLE CHECK HELPERS
-- =========================
create or replace function public.current_user_id()
returns uuid language sql stable as $$
  select auth.uid();
$$;

create or replace function public.is_member_of_org(p_org_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
      and m.is_active = true
  );
$$;

create or replace function public.has_org_role(p_org_id uuid, p_role org_role)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
      and m.is_active = true
      and m.role = p_role
  );
$$;

create or replace function public.has_any_org_role(p_org_id uuid, p_roles org_role[])
returns boolean language sql stable as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
      and m.is_active = true
      and m.role = any(p_roles)
  );
$$;

-- =========================
-- RLS: ENABLE
-- =========================
alter table public.organizations  enable row level security;
alter table public.profiles       enable row level security;
alter table public.org_members    enable row level security;
alter table public.elections      enable row level security;
alter table public.positions      enable row level security;
alter table public.candidates     enable row level security;
alter table public.voter_registry enable row level security;
alter table public.proxies        enable row level security;
alter table public.votes          enable row level security;
alter table public.vote_selections enable row level security;
alter table public.election_results enable row level security;
alter table public.audit_logs     enable row level security;

-- =========================
-- RLS: POLICIES
-- =========================

-- Organizations
drop policy if exists org_select on public.organizations;
create policy org_select on public.organizations
  for select using (public.is_member_of_org(id));

drop policy if exists org_update on public.organizations;
create policy org_update on public.organizations
  for update using (public.has_org_role(id, 'org_admin'))
  with check (public.has_org_role(id, 'org_admin'));

-- Profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (user_id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Org Members
drop policy if exists members_select on public.org_members;
create policy members_select on public.org_members
  for select using (public.is_member_of_org(org_id));

drop policy if exists members_manage on public.org_members;
create policy members_manage on public.org_members
  for all using (public.has_org_role(org_id, 'org_admin'))
  with check (public.has_org_role(org_id, 'org_admin'));

-- Elections
drop policy if exists elections_select on public.elections;
create policy elections_select on public.elections
  for select using (public.is_member_of_org(org_id));

drop policy if exists elections_write on public.elections;
create policy elections_write on public.elections
  for insert with check (public.has_any_org_role(org_id, array['org_admin','election_officer']::org_role[]));

drop policy if exists elections_update on public.elections;
create policy elections_update on public.elections
  for update using (public.has_any_org_role(org_id, array['org_admin','election_officer']::org_role[]))
  with check (public.has_any_org_role(org_id, array['org_admin','election_officer']::org_role[]));

-- Positions
drop policy if exists positions_select on public.positions;
create policy positions_select on public.positions
  for select using (public.is_member_of_org(org_id));

drop policy if exists positions_write on public.positions;
create policy positions_write on public.positions
  for all using (public.has_any_org_role(org_id, array['org_admin','election_officer']::org_role[]))
  with check (public.has_any_org_role(org_id, array['org_admin','election_officer']::org_role[]));

-- Candidates
drop policy if exists candidates_select on public.candidates;
create policy candidates_select on public.candidates
  for select using (public.is_member_of_org(org_id));

drop policy if exists candidates_write on public.candidates;
create policy candidates_write on public.candidates
  for all using (public.has_any_org_role(org_id, array['org_admin','election_officer']::org_role[]))
  with check (public.has_any_org_role(org_id, array['org_admin','election_officer']::org_role[]));

-- Voter Registry
drop policy if exists registry_select on public.voter_registry;
create policy registry_select on public.voter_registry
  for select using (
    public.has_any_org_role(org_id, array['org_admin','election_officer','observer']::org_role[])
    or (user_id = auth.uid())
  );

drop policy if exists registry_write on public.voter_registry;
create policy registry_write on public.voter_registry
  for all using (public.has_any_org_role(org_id, array['org_admin','election_officer']::org_role[]))
  with check (public.has_any_org_role(org_id, array['org_admin','election_officer']::org_role[]));

-- Proxies
drop policy if exists proxies_select on public.proxies;
create policy proxies_select on public.proxies
  for select using (public.has_any_org_role(org_id, array['org_admin','election_officer']::org_role[]));

drop policy if exists proxies_write on public.proxies;
create policy proxies_write on public.proxies
  for all using (public.has_any_org_role(org_id, array['org_admin','election_officer']::org_role[]))
  with check (public.has_any_org_role(org_id, array['org_admin','election_officer']::org_role[]));

-- Votes: direct table inserts are blocked; only service role (cast_vote RPC) can write
drop policy if exists votes_insert on public.votes;
-- NOTE: Actual inserts go through the cast_vote RPC via service role — no direct insert policy needed.

drop policy if exists votes_select_admin on public.votes;
create policy votes_select_admin on public.votes
  for select using (public.has_any_org_role(org_id, array['org_admin','election_officer']::org_role[]));

-- Vote selections
drop policy if exists selections_select on public.vote_selections;
create policy selections_select on public.vote_selections
  for select using (public.has_any_org_role(org_id, array['org_admin','election_officer','observer']::org_role[]));

-- Election results
drop policy if exists results_select on public.election_results;
create policy results_select on public.election_results
  for select using (public.is_member_of_org(org_id));

-- Audit logs
drop policy if exists audit_select on public.audit_logs;
create policy audit_select on public.audit_logs
  for select using (public.has_any_org_role(org_id, array['org_admin','election_officer','observer']::org_role[]));

drop policy if exists audit_insert on public.audit_logs;
create policy audit_insert on public.audit_logs
  for insert with check (public.is_member_of_org(org_id));
