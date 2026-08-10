# Task: Add profile name editing to the "Me" dropdown

## Plan
- [x] Review current profile dropdown + data flow (ChatApp, useChat, chat-api, types)
- [x] Get plan approval from user

## Implementation
- [x] Add `updateProfileUsername` to `lib/chat-api.ts`
- [x] Add `setName` callback to `hooks/useChat.ts` (persist + update local state)
- [x] Add editable name field to the profile dropdown in `components/chat/ChatApp.tsx`

## Verify
- [x] Run `npx tsc --noEmit` (no type errors)
- [x] Confirm the profile dropdown lets the user edit and save their name
