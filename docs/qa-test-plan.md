# QA test plan

Run before every preview / production build. Tick each item on a clean device, then again on a device with the previous build installed (covers hydration).

## Cold launch
- [ ] App opens on the hero screen within 3s of cold launch
- [ ] Particles drift smoothly without dropping frames
- [ ] Aura orb is centred and not clipped
- [ ] Brand line shows the correct `APP_DISPLAY_NAME`
- [ ] No console warnings about missing assets

## Hero + technology + pricing
- [ ] *Try Now* navigates to `/technology`
- [ ] Technology cards render with body text
- [ ] *See Pricing* navigates to `/pricing`
- [ ] Live RC prices appear (when configured); fallback `£0.99` / `£9.99/month` appears in dev
- [ ] *Recommended* badge on monthly card

## Purchases
- [ ] One-off purchase (£0.99) succeeds in dev (mock) and grants 1 credit
- [ ] Sandbox / Play test purchase succeeds in TestFlight / internal track
- [ ] Cancelling the iOS / Play sheet shows no error, credit unchanged
- [ ] Subscribing to monthly grants `hasMonthly = true`
- [ ] Restore Purchases returns *No purchases* in dev; restores monthly in sandbox

## Camera
- [ ] First scan asks for camera permission
- [ ] Denying permission shows the consent card and the *Use 3 Photos Instead* fallback
- [ ] Permission grant returns to the camera preview
- [ ] *Begin Scan* captures, navigates to `/processing`
- [ ] Low-light / blurry capture shows the rescan card with the credit still intact

## Photo upload
- [ ] First upload asks for photo library permission
- [ ] All three slots required before *Generate Reading* proceeds
- [ ] Selecting a non-face image still passes (heuristic analyzer), but lowest confidence wins
- [ ] Cancelling the picker leaves the slot empty

## Reading + result
- [ ] Processing screen cycles through the 4 status lines and orb breathes
- [ ] Successful reading lands on `/result` with aura label, score, zone bars, guidance
- [ ] Disclaimer visible at the bottom
- [ ] *Saved on this device* or *Synced to your account* tag shows correctly
- [ ] Monthly users see *Ask Aura Buddy about this reading* CTA
- [ ] Non-monthly users see the soft upgrade card
- [ ] *Start Another Reading* returns to `/scan` (or hits no-credit gate if all credits used)

## Timeline
- [ ] Non-monthly users see the locked card with *Upgrade to Monthly*
- [ ] Monthly users see all saved readings, newest first
- [ ] Cloud-sync row shows *Sync Now* when cloud sync is on
- [ ] Sync Now updates the *PUSHED · PULLED* status string

## Aura Buddy
- [ ] Non-monthly users see the locked card
- [ ] Monthly users see the intro card + reading context
- [ ] Sending a message shows the *reflecting…* indicator
- [ ] LLM-backed deploy returns within 5s under normal conditions
- [ ] Without Supabase configured, the local fallback message shows *Local guidance (offline)*
- [ ] Crisis test: typing *"I want to die"* returns the calm crisis response with regional resources and **does not** call the LLM
- [ ] Rate limit (after 40 messages in 24h) shows the friendly limit message
- [ ] Suggested practice chips render and don't overflow

## Auth + privacy
- [ ] Continue-without-account works (skip the auth flow entirely)
- [ ] Sign up creates a Supabase user and a `profiles` row
- [ ] Sign in re-uses the session after app restart
- [ ] Sign out clears the session, leaves local readings intact
- [ ] Privacy screen renders every section
- [ ] Cloud sync toggle requires sign-in (alert appears if not signed in)
- [ ] Photo upload toggle requires cloud sync (auto-enables it)

## Delete data
- [ ] *Delete local readings* removes them from the timeline immediately
- [ ] *Delete cloud readings* soft-deletes; subsequent Sync Now shows pulled = 0
- [ ] *Delete uploaded photos* clears the storage bucket and `reading_images` rows
- [ ] *Delete cloud account data* clears entitlement_snapshots
- [ ] *Delete Everything* wipes local + cloud and bounces to `/`

## Restart hydration
- [ ] Force quit then reopen — entitlement, readings, auth session, buddy history all restored
- [ ] Cloud sync state persists
- [ ] Last sync time persists

## Offline mode
- [ ] Airplane mode: app still launches and shows local readings
- [ ] Scan still works (engine is local)
- [ ] Buddy returns the local fallback without erroring
- [ ] Sync Now reports a friendly *Cloud sync is off or not signed in* (or network error if cloud sync is on)
- [ ] Re-enable network → Sync Now succeeds

## Build + install
- [ ] `eas build --profile development --platform ios` produces an installable artifact
- [ ] `eas build --profile development --platform android` produces an installable artifact
- [ ] Preview profile builds and installs on a real device
- [ ] Production profile builds, passes `npm run verify:release`, uploads via `eas submit`
- [ ] App icon appears correctly on the home screen (both platforms)
- [ ] Splash screen shows the obsidian + orb art (not a white screen)

## Final
- [ ] `npm test` — all green
- [ ] `npx tsc --noEmit` — clean
- [ ] `npx expo-doctor` — 17/17
- [ ] `npm run verify:release` — pass
