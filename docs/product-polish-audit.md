# Product polish audit — Phase 3A

Honest screen-by-screen assessment of AuraLens as of the SDK 56 / live-backend milestone. The architecture is sound; what's missing is the **felt premium quality** that converts a working app into something investor-presentable. This document captures what's weak, what's strong, and what gets touched in Phase 3A.

## Do not touch in this pass

- Supabase schema or RLS
- Edge function logic (`ai-buddy/index.ts`) unless a UI rendering bug forces it
- Public-config security guards
- RevenueCat architecture
- Migrations
- Test scaffolding

## Highest-impact improvements (ranked)

1. **Copy polish across `constants/copy.ts`** — current strings have leftover "credits" language and inconsistent voice. Single biggest wins for "feels premium" come from sentence-level edits, not pixels.
2. **Hero hierarchy** — orb position pulls focus from the hero question. Eyebrow + title + sub block needs tighter rhythm.
3. **Result screen** — too much information at once. Score, label, four meta cells, zone block, guidance bullets all stacked. Needs progressive disclosure or sectioning.
4. **Empty states** — `/timeline`, `/reading/[id]` (when id not found), Buddy first visit — currently functional but cold.
5. **Buddy intro warmth** — generic "Hi I'm Aura Buddy" lacks the brand voice. Should reference the actual reading or invite a calm opener.
6. **Settings dev panel** — useful for us, intrusive for any other reviewer. Should collapse behind a tap.
7. **Pricing copy** — "no tokens, no credits" reads defensive. Rephrase positively.
8. **Privacy screen formatting** — wall of glass cards reads dense. Tighten.

---

## Screen-by-screen

### Hero (`app/index.tsx`)

**What works**
- Question framing ("Good Aura or Bad Aura") is sharp.
- Particle field + orb behind glass card is on-brand.

**What's weak**
- Eyebrow "Symbolic aura reflection" disappears against the orb glow at small sizes.
- The hero question and sub are too vertically close.
- "Try Now" CTA could carry more weight — currently same visual size as the restore subtle button.
- The restore subtle ("Already purchased? Restore") sits orphaned at the bottom; users without a purchase will never need it on the hero.

**Phase 3A fix**
- Tighten typography rhythm (eyebrow → title → 24px gap → sub → bigger gap → CTA).
- Make "Try Now" CTA visually dominant.
- Drop the orphan "Restore" — there's a Restore in Settings; the hero shouldn't carry it.
- Add a single line of trust copy under the CTA: *"For reflection and wellbeing. Not medical or diagnostic advice."*

### Technology (`app/technology.tsx`)

**What works**
- Four feature cards lay the value cleanly.
- Privacy First card reads as a credibility flag, not an apology.

**What's weak**
- Card titles are uppercase eyebrow style — visually identical to body labels elsewhere — easy to miss.
- "Ancient face reading rebuilt for the AI age" can land harder with a thinner sub.

**Phase 3A fix**
- Light typography re-rhythm; no structural changes.

### Pricing (`app/pricing.tsx`)

**What works**
- Two clear tiers, prices visible, RC live-prices when configured.
- Dev banner is honest.

**What's weak**
- "One scan. One reading. No confusing tokens. No hidden credit systems." — defensive. Reads as if competing against tokenised apps. The user doesn't know that's a thing.
- "Recommended" badge appears on the monthly tier but there's no real reason offered — "why monthly?" answer is missing.
- Feature lists are dense — 6 lines each, all the same weight.

**Phase 3A fix**
- Rewrite the descriptive copy positively: *"One reading. £1.99. Pay once."* — kill the "no tokens" line.
- Add a single-line "why monthly" under the recommended badge.
- Highlight 2 features per tier as bold, fade the rest.

### Auth (`app/auth.tsx`)

**What works**
- Optional sign-in framing — "an account is optional" — protects local-first promise.
- Sign-in / sign-up / magic-link toggles in one place.

**What's weak**
- Three-way mode switcher is fiddly. Most users won't know what "magic link" means.
- Error messages are stock Supabase pass-throughs — not branded.

**Phase 3A fix**
- Defer the magic-link rework; keep current layout.
- Add one line of brand reassurance: *"We never sell your data. Local readings remain on this device."*

### Settings (`app/settings.tsx`)

**What works**
- Dev "Integrations" panel is genuinely useful during integration.
- Clear sub-cards for account / cloud / purchases / privacy.

**What's weak**
- Dev panel is always visible — overwhelms anyone reviewing the build.
- "Manage Subscription" → opens a generic App Store URL even when no subscription exists; users without purchases hit a confused screen.
- Cloud sync toggle copy is verbose.

**Phase 3A fix**
- Collapse the dev "Integrations" panel behind a tap (default closed).
- Hide "Manage Subscription" link until `hasMonthly` is true.
- Trim cloud-sync sub-text.

### Scan (`app/scan.tsx`)

**What works**
- Camera framing guides + corner markers feel intentional.
- Permission denial flow falls back to upload cleanly.

**What's weak**
- No live face-quality feedback (lighting, centering) before capture — user shoots blind.
- "Begin Scan" only enables when camera is ready, but no UI cue that face is detected.

**Phase 3A fix (limited scope)**
- Polish copy under the title: *"Hold steady. Soft, even light. Face centred."*
- Skip live face-detection overlay (out of scope for polish phase — that's a Phase 2.1.x revisit).

### Upload (`app/upload.tsx`)

**What works**
- Three slots make the requirement physical.
- Per-slot hints make the variety explicit.

**What's weak**
- Slot plus icons are big and aggressive; once filled, the slot's a tiny thumbnail.
- "Three photos needed" alert is friction.

**Phase 3A fix**
- Replace the alert with a button-state change ("Add 1 more photo" → "Generate Reading").

### Processing (`app/processing.tsx`)

**What works**
- Aura orb + status text feels appropriate to the brand.
- Real engine work happens here, not just a delay.

**What's weak**
- Step text is small. Status updates feel like they're whispering.
- Four steps but no sense of progress through them.

**Phase 3A fix**
- Add a tiny progress ring or dots under the orb to indicate position.
- Larger, slightly bolder step text.
- Tighten the four step labels per the brief.

### Result (`app/result.tsx`)

**What works**
- The aura orb tinted to the user's dominant colour is a powerful brand moment.
- Zone breakdown bars communicate at a glance.
- Disclaimer is calm and unmissable.

**What's weak**
- Too much to absorb in one scroll. The score (74/100), four meta cells, three guidance blocks, seven zones, action buttons, sync tag, disclaimer — all in one screen.
- The aura label ("RISING AURA") is in small eyebrow caps — it should be the biggest text on the screen.
- "Ask Aura Buddy about this reading" is the CTA we want users to take but it sits below three other buttons.

**Phase 3A fix**
- Reorder: hero (orb + label + score) → AI Buddy CTA → guidance summary → expandable details (zones + maintain/release).
- Bump aura label typography.
- Group action buttons (Compare, Share, Start Another) into a secondary row, not a stack.

### Timeline (`app/timeline.tsx`)

**What works**
- Tappable rows are clear.
- Compare CTA appears when there are 2+ readings.

**What's weak**
- Empty state (no readings yet) shows just text and a "Start Scan" button — cold.
- Sync status row uses uppercase + dots — hard to read at a glance.

**Phase 3A fix**
- Add a soft illustration treatment for the empty state (orb + warm copy).
- Convert sync status from `SUCCESS · pushed 0 · pulled 0` to a friendlier `Last synced just now · 0 new` sentence.

### Compare (`app/compare.tsx`)

**What works**
- Then/Now side-by-side with two orbs is genuinely beautiful.
- Zone delta bars communicate change instantly.

**What's weak**
- Picker chips are dense — hard to scan when many readings exist.
- "Then" vs "Now" labels are small — users may select two readings in wrong order.

**Phase 3A fix (deferred)**
- Skip — current design is good enough for the polish pass. Will revisit when there's real timeline data to test against.

### Aura Buddy (`app/buddy.tsx`)

**What works**
- Reading-context card at the top grounds the conversation.
- Crisis copy is unmissable and grounded.
- Practice chips + reflection card are unique to the brand.

**What's weak**
- Intro message is generic boilerplate. Doesn't reference the user's actual reading even when one exists.
- Typing indicator (small orb + "reflecting…") is tiny.
- "Local guidance (offline)" tag is technical jargon; users won't understand the implication.
- Send button shows "Sending…" but doesn't indicate the user can't keep typing.

**Phase 3A fix**
- Rewrite the intro to reference the last reading by label + colour when one exists.
- Soften "Local guidance (offline)" to *"Offline mode — Aura Buddy is using a local reflection"*.
- Disable the input visibly when sending (we already do; just confirm visual).

### Privacy (`app/privacy.tsx`)

**What works**
- Seven sections cover the privacy story honestly.
- "What we never do" section is a brand differentiator.

**What's weak**
- All seven sections render at the same visual weight. Important things (delete + opt-in photos) get lost.
- Wall of glass cards reads heavy.

**Phase 3A fix**
- Bump the two highest-impact sections ("Photo uploads are opt-in" + "Your control") to `strong` glass.

### Delete Data (`app/delete-data.tsx`)

**What works**
- Five granular paths with separate confirmations is responsible.
- "Full delete request" carries a real warning.

**What's weak**
- Five buttons in a row is intimidating.
- No undo affordance for local-only deletions (they're instant).

**Phase 3A fix (deferred)**
- Skip — confirmation dialogs already exist. Reduction in friction here is risky for a privacy-critical screen.

---

## Mobile vs web layout risks

| Screen | Mobile (393×852) | Web (1280×800) | Action |
|---|---|---|---|
| Hero | OK | OK | None |
| Pricing | OK | Two cards stretch full width — looks weird beyond 600px | Add max-width container |
| Result | Long scroll | Same scroll | Apply max-width container |
| Buddy | Composer at bottom OK | Composer floats mid-screen | Apply max-width container |
| Timeline | OK | Row width is full-screen — chunky | Apply max-width container |

**Phase 3A fix**: add a soft 720px max-width to `ScreenContainer` content for desktop viewports; mobile unchanged.

## Backend / live-state clarity issues

- Settings dev panel surfaces this well already; nothing to change for the dev path.
- For end users (no `__DEV__`), Settings doesn't currently say whether the app is in "offline-only" or "cloud-synced" mode. The Account card implies it but doesn't state it.

**Phase 3A fix**: add a small status pill under the Account card showing "Offline only" / "Cloud sync on" / "Cloud sync ready (enable in toggle)".

## Forbidden-copy compliance recheck

`npm run verify:release` already greps for affirmative claims; will re-run after all edits.

## Out of scope (deferred to later)

- Reduced motion / reduced transparency support
- Localisation infrastructure
- Tab navigation refactor
- Share-card image generation
- Onboarding consent gate (covered by current Privacy + permission flow)
- AAA colour contrast audit

These remain in the outstanding-work panel on the live preview.
