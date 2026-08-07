-- ============================================================
-- Cindel — Test data seed
-- Run this in the Supabase SQL Editor AFTER schema.sql.
-- Creates two real auth users (phone-confirmed, known password)
-- plus a conversation and a few messages between them, so you
-- can test real chat without needing an SMS provider.
--
-- Test accounts (password for both: CindelTest123!)
--   User A: phone +233 55 000 0001  -> 233550000001
--   User B: phone +233 55 000 0002  -> 233550000002
-- ============================================================

-- Fixed UUIDs so the two users are stable across re-runs.
-- (Use a different pair if these ever conflict.)
insert into auth.users (
  instance_id, id, aud, role, phone,
  encrypted_password,
  email_confirmed_at, phone_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', '233550000001',
    crypt('CindelTest123!', gen_salt('bf')),
    now(), now(),
    '{"provider":"phone","providers":["phone"]}',
    '{"username":"Alice"}',
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', '233550000002',
    crypt('CindelTest123!', gen_salt('bf')),
    now(), now(),
    '{"provider":"phone","providers":["phone"]}',
    '{"username":"Bob"}',
    now(), now()
  )
on conflict (id) do nothing;

-- The profile trigger auto-creates rows; give them friendly names.
update public.profiles
set username = 'Alice'
where id = 'aaaaaaaa-0000-0000-0000-000000000001';

update public.profiles
set username = 'Bob'
where id = 'aaaaaaaa-0000-0000-0000-000000000002';

-- A 1:1 conversation between Alice and Bob.
insert into public.conversations (id, created_at)
values ('cccccccc-0000-0000-0000-000000000001', now() - interval '2 days')
on conflict (id) do nothing;

insert into public.conversation_participants (conversation_id, user_id, joined_at)
values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '2 days'),
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', now() - interval '2 days')
on conflict (conversation_id, user_id) do nothing;

-- A few sample messages.
insert into public.messages (id, conversation_id, sender_id, content, created_at)
values
  (
    'dddddddd-0000-0000-0000-000000000001',
    'cccccccc-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Hey Bob! 👋',
    now() - interval '2 days'
  ),
  (
    'dddddddd-0000-0000-0000-000000000002',
    'cccccccc-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000002',
    'Hey Alice! How is the Cindel chat working?',
    now() - interval '2 days' + interval '1 minute'
  ),
  (
    'dddddddd-0000-0000-0000-000000000003',
    'cccccccc-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'It looks real now — sending through Supabase realtime! 🎉',
    now()
  )
on conflict (id) do nothing;
