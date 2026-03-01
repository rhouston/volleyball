-- Initial PostgreSQL schema baseline for Volleyball Season Manager
-- Generated from product spec v1 (2026-03-01)

create extension if not exists "pgcrypto";

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email text not null unique,
  display_name text not null,
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null,
  provider_user_id text not null,
  created_at timestamptz not null default now(),
  unique(provider, provider_user_id)
);

create table seasons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  year int not null,
  start_date date not null,
  end_date date not null,
  mixed_night int not null,
  ladies_mens_night int not null,
  status text not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, year, name)
);

create table season_settings (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null unique references seasons(id) on delete cascade,
  points_win int not null default 3,
  points_draw int not null default 2,
  points_loss int not null default 1,
  points_forfeit int not null default 0,
  points_bye int not null default 3,
  penalty_missed_duty int not null default -2,
  tie_break_order text not null default 'points,percentage,for,head_to_head,admin_decision',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table grades (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  name text not null,
  category text not null,
  rank_order int not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(season_id, name)
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  grade_id uuid not null references grades(id) on delete restrict,
  name text not null,
  short_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(season_id, grade_id, name)
);

create table players (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table team_memberships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  player_id uuid not null references players(id) on delete cascade,
  role text not null,
  status text not null default 'PENDING',
  invited_by_user_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(team_id, player_id)
);

create table venues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table courts (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  name text not null,
  sort_order int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(venue_id, name)
);

create table timeslots (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  label text not null,
  starts_at text not null,
  sort_order int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(season_id, sort_order)
);

create table season_dates (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  match_date date not null,
  is_excluded boolean not null default false,
  exclusion_reason text,
  created_at timestamptz not null default now(),
  unique(season_id, match_date)
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  grade_id uuid not null references grades(id) on delete restrict,
  home_team_id uuid not null references teams(id) on delete restrict,
  away_team_id uuid not null references teams(id) on delete restrict,
  court_id uuid not null references courts(id) on delete restrict,
  timeslot_id uuid not null references timeslots(id) on delete restrict,
  match_date date not null,
  round_number int not null,
  stage_label text not null default 'REGULAR',
  status text not null default 'SCHEDULED',
  home_score int,
  away_score int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  event_type text not null,
  payload jsonb,
  created_by_user_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table duties (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  grade_id uuid not null references grades(id) on delete restrict,
  match_id uuid references matches(id) on delete set null,
  duty_date date not null,
  duty_type text not null,
  court_id uuid references courts(id) on delete set null,
  timeslot_id uuid references timeslots(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table duty_assignments (
  id uuid primary key default gen_random_uuid(),
  duty_id uuid not null references duties(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique(duty_id, team_id)
);

create table votes_best_fairest (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  voting_user_id uuid not null references users(id) on delete restrict,
  selected_player_id uuid not null references players(id) on delete restrict,
  selected_team_id uuid not null references teams(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(match_id, voting_user_id, selected_team_id)
);

create table ladder_snapshots (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  grade_id uuid not null references grades(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  round_number int not null,
  played int not null,
  won int not null,
  drawn int not null,
  lost int not null,
  forfeits int not null,
  byes int not null,
  points_for int not null,
  points_against int not null,
  deductions int not null,
  ladder_points int not null,
  percentage numeric(7,3) not null,
  position int not null,
  created_at timestamptz not null default now(),
  unique(season_id, grade_id, team_id, round_number)
);

create table fixture_generation_runs (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  run_type text not null,
  input_snapshot jsonb not null,
  fairness_report jsonb,
  conflict_report jsonb,
  created_by_user_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table grading_matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  grade_id uuid not null references grades(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  reference_team_name text not null,
  match_date date not null,
  score_for int,
  score_against int,
  recommendation text,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references users(id) on delete cascade,
  channel text not null,
  template_key text not null,
  payload jsonb not null,
  status text not null default 'QUEUED',
  scheduled_for timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table message_threads (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  grade_id uuid references grades(id) on delete set null,
  team_id uuid references teams(id) on delete set null,
  title text not null,
  created_by_user_id uuid not null references users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references message_threads(id) on delete cascade,
  author_user_id uuid not null references users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index idx_users_org on users(organization_id);
create index idx_seasons_org on seasons(organization_id);
create index idx_grades_season on grades(season_id);
create index idx_teams_season on teams(season_id);
create index idx_teams_grade on teams(grade_id);
create index idx_matches_season_grade on matches(season_id, grade_id);
create index idx_matches_slot on matches(match_date, timeslot_id, court_id);
create index idx_duties_lookup on duties(season_id, grade_id, duty_date);
create index idx_ladder_round on ladder_snapshots(season_id, grade_id, round_number);
create index idx_notifications_recipient_status on notifications(recipient_user_id, status);
create index idx_messages_thread_created on messages(thread_id, created_at);
create index idx_audit_entity on audit_logs(entity_type, entity_id);
