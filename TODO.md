# TODO — Fix infinite "Loading..." in Cindel

- [x] Plan approved
- [x] 1. Rewrite `init()` in `hooks/useChat.ts`
  - [x] Use `supabase.auth.getUser()` to get current user id
  - [x] Log `user.id` to console to verify login
  - [x] If no user id → set conversations=[], stop loading
  - [x] 1s safety timeout to force `loading=false`
  - [x] Error handling: console.log + "Failed to load chats"
- [x] 2. Update `components/chat/ChatApp.tsx` (ensure overlay resolves)
- [x] 3. Add RLS policies to `supabase/schema.sql`
  - [x] participants self-select policy (`user_id = auth.uid()`)
  - [x] messages select policy (conversation in participant list)
- [x] 4. Run `npm run dev` and verify loading screen is gone

