# Privacy declarations

This is the source of truth for what AuraLens collects, where it goes, and what we never do with it. Both the App Store privacy nutrition labels and the Play Console Data Safety form must align with this document.

## Data collected

| Data                             | Collected?  | Stays local by default | Cloud sync requires        |
|----------------------------------|-------------|------------------------|----------------------------|
| Aura reading outputs             | Yes         | Yes                    | Cloud sync ON              |
| Mien Shiang zone scores          | Yes         | Yes                    | Cloud sync ON              |
| Reading photos                   | Only if you upload | Yes              | Cloud sync ON + photo upload consent |
| Email address                    | Only if you create an account | n/a     | Account creation           |
| RevenueCat customer ID           | Yes (anonymous device-scoped) | n/a     | App always                 |
| Purchase + entitlement state     | Yes         | Yes                    | Account creation (snapshot)|
| AI Buddy conversation history    | Yes         | Yes                    | Account + monthly active   |

## What is never collected
- Raw face landmarks beyond the in-memory analysis (not persisted, not transmitted).
- Health, biometric identity, fitness, financial info beyond IAP receipts.
- Contacts, location, advertising identifiers.
- Background camera or microphone.

## Where data goes

| Destination       | Receives                                              | When                          |
|-------------------|-------------------------------------------------------|-------------------------------|
| **Your device**   | Everything                                            | Always                        |
| **Supabase**      | Aura readings (symbolic outputs), photos (if opted in), entitlement snapshots, AI Buddy messages | Cloud sync ON + signed in     |
| **RevenueCat**    | Purchase events, entitlement state                    | Whenever a purchase happens   |
| **LLM provider (Anthropic or OpenAI)** | Symbolic reading context + your typed message + last 6 conversation turns | When you message Aura Buddy and your monthly is active |

## What is sent to the LLM

- Aura label, score, confidence (0–100)
- Dominant + secondary colour, element
- Mien Shiang zone scores (0–100 per zone)
- Engine-generated guidance summary
- Optional timeline summary string
- Last six conversation turns
- Your current message

## What is never sent to the LLM

- Photos, base64 images, thumbnails — rejected at both client (`stripForbiddenKeys`) and server (`rejectIfForbiddenKeys` in [`buddyTypes.ts`](../supabase/functions/_shared/buddyTypes.ts))
- Raw face landmarks, pose data, or pixel arrays
- Email, payment, device identifiers
- Anything under the forbidden-keys list

## Consent model

- **Local mode (default)**: everything stays on your device. No account required, no upload, no LLM calls (Aura Buddy uses a deterministic local fallback when not signed in).
- **Cloud sync (opt-in)**: reading outputs sync to your Supabase account, protected by Row Level Security. Photos are **still not** uploaded.
- **Photo upload (opt-in, requires cloud sync)**: reading photos upload to a private Supabase storage bucket. Access is signed-URL only with a default 10-minute expiry. You can delete every uploaded photo from *Settings → Delete My Data → Delete uploaded photos*.
- **Aura Buddy (Monthly only)**: when sending a message, the symbolic reading context + your message + last 6 turns are passed to the configured LLM via a Supabase Edge Function. Crisis phrases are intercepted before any LLM call.

## Row-Level Security

Every cloud table (`profiles`, `readings`, `reading_images`, `entitlement_snapshots`, `ai_buddy_messages`) is protected with RLS so users can only read or write their own rows. Storage objects in `reading-images` are restricted by user-id folder. SQL: [`supabase/migrations/002_rls_policies.sql`](../supabase/migrations/002_rls_policies.sql).

## Storage bucket

`reading-images` is a **private** bucket. There is no public URL. All reads happen via short-lived signed URLs generated server-side.

## Deletion

In-app: *Settings → Delete My Data* exposes:

1. Delete local readings only
2. Delete cloud readings (soft-delete)
3. Delete uploaded photos
4. Delete cloud account data (readings + photos + entitlement snapshots)
5. Full delete (local + cloud + everything we can remove)

Full account closure (auth.users) must be requested via support email until we add a self-serve close button.

## We never

- Sell face data.
- Train models on your photos without explicit opt-in.
- Share readings with third parties for marketing.
- Use AuraLens for biometric identity verification.
- Make medical, psychological, or diagnostic claims.
