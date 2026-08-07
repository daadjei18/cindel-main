-- ============================================================
-- Cindel Chat — Supabase schema
-- Run this in the Supabase SQL Editor (Table Editor > New query).
-- ============================================================

-- ---------- PROFILES ----------
-- Mirrors auth.users so we can store a display name + avatar.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text unique,
  username text,
  avatar_url text,
  last_seen timestamptz default now() not null,
  created_at timestamptz default now() not null
);

-- Auto-create a profile row when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, phone, username)
  values (new.id, new.phone, coalesce(new.raw_user_meta_data->>'username', 'Guest'));
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

-- Profiles: anyone authenticated can read others; only owner can update.
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

create policy "profiles_insert" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

create policy "profiles_update" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- Conversations: only participants can read a conversation.
create policy "conversations_select" on public.conversations
  for select to authenticated
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = id and cp.user_id = auth.uid()
    )
  );

create policy "conversations_insert" on public.conversations
  for insert to authenticated with check (true);

-- Participants: a user can read all participants of any conversation they
-- belong to (so the chat list can resolve the "other" participant).
create policy "participants_select" on public.conversation_participants
  for select to authenticated
  using (
    exists (
      select 1 from public.conversation_participants mine
      where mine.conversation_id = conversation_id
        and mine.user_id = auth.uid()
    )
  );

create policy "participants_select_own" on public.conversation_participants
  for select to authenticated using (user_id = auth.uid());

create policy "participants_insert" on public.conversation_participants
  for insert to authenticated with check (user_id = auth.uid());

-- Messages: a user can select messages of any conversation they participate in.
create policy "messages_select_own" on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id
        and cp.user_id = auth.uid()
    )
  );

-- Messages: only participants of the conversation can read/insert.
create policy "messages_select" on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
    )
  );

create policy "messages_insert" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
    )
  );

-- ---------- HELPER: resolve a uuid from a phone number ----------
create or replace function public.user_id_by_phone(phone text)
returns uuid
language sql
security definer set search_path = public
stable
as $$
  select id from public.profiles where profiles.phone = phone limit 1;
$$;

-- ---------- HELPER: create or get a 1:1 conversation ----------
create or replace function public.create_conversation(other_phone text)
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

  select user_id_by_phone(other_phone) into other;
  if other is null then
    raise exception 'No user with that phone number';
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
