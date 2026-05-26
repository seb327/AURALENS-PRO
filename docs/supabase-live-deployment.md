# Supabase live deployment

Goal: move AuraLens from local-first-only to real cloud sync. Estimated time: 25 minutes.

## 0. Prerequisites
- Supabase account
- Supabase CLI installed: `npm i -g supabase`
- Optional but recommended: `psql` for ad-hoc queries

## 1. Create the project
1. https://app.supabase.com → **New project** → choose a region near your users
2. Set a strong DB password — save it in your password manager
3. Wait ~2 min for the project to provision

## 2. Add env vars locally
Copy the URL and `anon` key from *Project Settings → API*:

```bash
cd auralens
cp .env.development.example .env
# edit .env and set:
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Verify shape (does not require live secrets to be filled):
```bash
npm run smoke:config
```

## 3. Link the CLI
```bash
supabase login
supabase link --project-ref <project-ref>
```

## 4. Run migrations
```bash
supabase db push
# applies supabase/migrations/001_initial_schema.sql then 002_rls_policies.sql
```

Sanity check in the SQL editor:
```sql
select count(*) from public.profiles;          -- expect 0
select count(*) from public.readings;          -- expect 0
select count(*) from public.entitlement_snapshots;
select count(*) from public.ai_buddy_messages;
```

## 5. Create the private storage bucket
Dashboard → **Storage** → **New bucket**:
- Name: `reading-images`
- Public: **off**
- File size limit: 10 MB
- Allowed mime types: `image/*`

The RLS storage policies in `002_rls_policies.sql` already restrict object reads/writes to the owner's `auth.uid()` folder.

## 6. Deploy edge functions
```bash
supabase functions deploy reconcile-entitlements --no-verify-jwt
supabase functions deploy ai-buddy
```

## 7. Add function secrets

LLM provider — pick one:
```bash
# Anthropic
supabase secrets set AI_PROVIDER=anthropic ANTHROPIC_API_KEY=sk-ant-... AI_MODEL=claude-3-5-sonnet-latest

# OR OpenAI
supabase secrets set AI_PROVIDER=openai OPENAI_API_KEY=sk-... AI_MODEL=gpt-4o-mini
```

Leaving both unset is fine — the function will return the deterministic local fallback shape.

## 8. Test auth from the app
1. `npx expo start`
2. Settings → *Sign In / Create Account*
3. Create a test account with a real email — confirm via the magic link
4. Settings should now show `Signed in as <email>`

## 9. Test reading sync
1. Sign in
2. Settings → toggle *Cloud sync* on
3. Tap *Try Now* → Pricing → Unlock one reading (mock in dev)
4. Take a reading
5. Settings → *Sync Now* — expect *pushed N · pulled 0*
6. Verify in Supabase:
   ```sql
   select id, aura_label, aura_score, created_at from public.readings;
   ```

## 10. Test photo upload (opt-in)
1. Settings → toggle *Upload photos* (this auto-enables cloud sync if it wasn't already)
2. Take a new reading
3. Verify in Supabase:
   ```sql
   select id, storage_path, consent_given from public.reading_images;
   ```
   Also check the `reading-images` bucket has the file under `<user-id>/<reading-id>/<timestamp>.jpg`.

## 11. Test delete data
1. Settings → Delete My Data → *Delete cloud account data*
2. Verify in Supabase:
   ```sql
   select count(*) from public.readings where deleted_at is null and user_id = '<your-id>';
   select count(*) from public.reading_images where user_id = '<your-id>';
   ```
   Both should be 0.

## 12. Smoke-test AI Buddy reachability
```bash
# get a JWT from the dashboard (Auth → Users → … → "Send magic link" then copy token)
# OR use the in-app session storage
curl -X POST "https://<ref>.functions.supabase.co/ai-buddy" \
  -H "Authorization: Bearer <user-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"message":"how is my aura today?","context":{"reading":{"label":"Clear Aura","score":80,"dominantColour":"Gold"}}}'
```

Expected envelopes:
- `{"reply":"...","tone":"...","crisisDetected":false,"disclaimer":"..."}` → success
- `{"ok":false,"error":"Aura Buddy is part of AuraLens Monthly...","requiresMonthly":true}` → entitlement check working; add a monthly snapshot for the user via the in-app sandbox purchase

## 13. Final structural check
```bash
npm run verify:integrations -- --live=development
```

Should report PASS with the live env values present.
