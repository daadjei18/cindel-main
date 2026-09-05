-- ============================================================
-- Cindel Chat — Supabase schema
-- Run this in the Supabase SQL Editor (Table Editor > New query).
-- Fully idempotent: safe to re-run as many times as you like.
-- ============================================================

-- ---------- GRANTS ----------
-- Make sure anon/authenticated can actually reach the tables.
-- RLS still gates every row — these grants only remove
-- "permission denied" errors.
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to anon, authenticated;

-- ---------- PROFILES ----------
-- Mirrors auth.users so we can store a display name + avatar + status.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text unique,
  email text unique,
  username text,
  avatar_url text,
  status text default 'Very busy',
  last_seen timestamptz default now() not null,
  created_at timestamptz default now() not null
);

-- Add the status column to existing databases (no-op if already present).
alter table public.profiles add column if not exists status text default 'Very busy';

-- Email is the login identity (phone auth is gone). No-op if already present.
alter table public.profiles add column if not exists email text unique;

-- Usernames are how users find each other; enforce uniqueness (case-insensitive).
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

-- Auto-create a profile row when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, phone, email, username)
  values (
    new.id,
    new.phone,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'username',
      'user-' || substr(md5(random()::text), 1, 6)
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- CONVERSATIONS ----------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now() not null
);

-- ---------- CONVERSATION PARTICIPANTS ----------
create table if not exists public.conversation_participants (
  conversation_id uuid references public.conversations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  joined_at timestamptz default now() not null,
  primary key (conversation_id, user_id)
);

-- ---------- MESSAGES ----------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations (id) on delete cascade not null,
  sender_id uuid references auth.users (id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now() not null
);

create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at);

-- Needed so Realtime receives the full row payload for messages.
alter table public.messages replica identity full;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- ---------- RLS HELPER ----------
-- Security-definer check: "is uid a participant of conv?".
-- Runs as the function owner, so it bypasses RLS and therefore
-- cannot trigger infinite recursion (a policy must never read the
-- same table it is defined on).
create or replace function public.is_participant(conv_id uuid, uid uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = conv_id and cp.user_id = uid
  );
$$;

-- ---------- POLICIES ----------
-- Profiles: anyone authenticated can read others; only owner can update.
drop policy if exists profiles_select on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_insert on public.profiles;
create policy "profiles_insert" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists profiles_update on public.profiles;
create policy "profiles_update" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- Conversations: only participants can read a conversation.
drop policy if exists conversations_select on public.conversations;
create policy "conversations_select" on public.conversations
  for select to authenticated
  using (public.is_participant(id, auth.uid()));

drop policy if exists conversations_insert on public.conversations;
create policy "conversations_insert" on public.conversations
  for insert to authenticated with check (true);

-- Participants: a user can read all participants of any conversation they
-- belong to (so the chat list can resolve the "other" participant).
drop policy if exists participants_select on public.conversation_participants;
create policy "participants_select" on public.conversation_participants
  for select to authenticated
  using (public.is_participant(conversation_id, auth.uid()));

drop policy if exists participants_select_own on public.conversation_participants;
create policy "participants_select_own" on public.conversation_participants
  for select to authenticated using (user_id = auth.uid());

drop policy if exists participants_insert on public.conversation_participants;
create policy "participants_insert" on public.conversation_participants
  for insert to authenticated with check (user_id = auth.uid());

-- Messages: a user can select messages of any conversation they participate in.
drop policy if exists messages_select_own on public.messages;
create policy "messages_select_own" on public.messages
  for select to authenticated
  using (public.is_participant(messages.conversation_id, auth.uid()));

drop policy if exists messages_select on public.messages;
create policy "messages_select" on public.messages
  for select to authenticated
  using (public.is_participant(conversation_id, auth.uid()));

drop policy if exists messages_insert on public.messages;
create policy "messages_insert" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_participant(conversation_id, auth.uid())
  );

-- ---------- HELPER: resolve a uuid from a username ----------
create or replace function public.user_id_by_username(p_username text)
returns uuid
language sql
security definer set search_path = public
stable
as $$
  select id from public.profiles where lower(profiles.username) = lower(p_username) limit 1;
$$;

-- ---------- HELPER: create or get a 1:1 conversation ----------
create or replace function public.create_conversation(other_username text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  other uuid;
  conv uuid;
begin
  if me is null then
    raise exception 'Not authenticated';
  end if;

  select user_id_by_username(other_username) into other;
  if other is null then
    raise exception 'No user with that username';
  end if;
  if other = me then
    raise exception 'You cannot chat with yourself';
  end if;

  -- Reuse an existing 1:1 conversation between these two users.
  select cp.conversation_id into conv
  from public.conversation_participants me_cp
  join public.conversation_participants other_cp
    on other_cp.conversation_id = me_cp.conversation_id
  where me_cp.user_id = me and other_cp.user_id = other
  limit 1;

  if conv is null then
    insert into public.conversations default values returning id into conv;
    insert into public.conversation_participants (conversation_id, user_id)
    values (conv, me), (conv, other);
  end if;

  return conv;
end;
$$;

-- ---------- HELPER: one row per conversation (last message, no duplicate "Me" row) ----------
-- Used by lib/chat-api.ts fetchConversations(). Returns ONE row per conversation
-- with the *other* participant and the last message — no full-history download,
-- no phone numbers, and no second row for your own participant entry.
create or replace function public.get_conversation_previews(p_uid uuid)
returns table (
  conversation_id uuid,
  other_id uuid,
  other_username text,
  other_avatar_url text,
  other_status text,
  other_last_seen timestamptz,
  last_message text,
  last_time timestamptz,
  last_sender_id uuid,
  unread_count bigint
)
language sql
stable
as $$
  select
    c.id as conversation_id,
    other_p.id as other_id,
    other_p.username as other_username,
    other_p.avatar_url as other_avatar_url,
    other_p.status as other_status,
    other_p.last_seen as other_last_seen,
    last_m.content as last_message,
    last_m.created_at as last_time,
    last_m.sender_id as last_sender_id,
    0::bigint as unread_count
  from public.conversation_participants mine
  join public.conversations c on c.id = mine.conversation_id
  left join lateral (
    select cp.user_id
    from public.conversation_participants cp
    where cp.conversation_id = c.id and cp.user_id <> p_uid
    limit 1
  ) other on true
  left join public.profiles other_p on other_p.id = other.user_id
  left join lateral (
    select m.content, m.created_at, m.sender_id
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc, m.id desc
    limit 1
  ) last_m on true
  where mine.user_id = p_uid
$$;

-- ---------- HIVE POSITIONS (saved hive order per user) ----------
-- Used by lib/chat-api.ts fetchHiveOrder() / saveHiveOrder().
create table if not exists public.hive_positions (
  user_id uuid references auth.users (id) on delete cascade not null,
  conversation_id uuid references public.conversations (id) on delete cascade not null,
  position integer not null,
  primary key (user_id, conversation_id)
);

alter table public.hive_positions enable row level security;

drop policy if exists hive_positions_select on public.hive_positions;
create policy "hive_positions_select" on public.hive_positions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists hive_positions_insert on public.hive_positions;
create policy "hive_positions_insert" on public.hive_positions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists hive_positions_update on public.hive_positions;
create policy "hive_positions_update" on public.hive_positions
  for update to authenticated using (user_id = auth.uid());

drop policy if exists hive_positions_delete on public.hive_positions;
create policy "hive_positions_delete" on public.hive_positions
  for delete to authenticated using (user_id = auth.uid());