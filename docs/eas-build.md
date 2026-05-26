# EAS Build

AuraLens uses [Expo Application Services (EAS)](https://expo.dev/eas) for managed native builds. Three profiles are defined in [`eas.json`](../eas.json):

| Profile       | Distribution | iOS                       | Android  | Channel       |
|---------------|--------------|---------------------------|----------|---------------|
| `development` | internal     | dev-client, simulator OK  | APK      | `development` |
| `preview`     | internal     | device build              | APK      | `preview`     |
| `production`  | store        | archive                   | AAB      | `production`  |

## Prerequisites

```bash
npm install -g eas-cli
eas login
eas init                # creates a project ID and writes it to .env
```

Set the project ID env var before any build:

```
EAS_PROJECT_ID=<id from `eas init`>
```

## Per-build env

Copy the right template before each build:

```bash
cp .env.development.example .env
# fill values, then:
eas build --platform ios --profile development
```

Production builds require **every** value in `.env.production.example`.

## Building

```bash
# Development (installable dev client for fast iteration)
eas build --platform ios     --profile development
eas build --platform android --profile development

# Internal testers (TestFlight + Play internal track candidate)
eas build --platform ios     --profile preview
eas build --platform android --profile preview

# Store-ready
eas build --platform ios     --profile production
eas build --platform android --profile production
```

## Submitting

```bash
eas submit --platform ios --profile production --latest
eas submit --platform android --profile production --latest
```

`submit.production` in `eas.json` has placeholder Apple and Play credentials — replace the `REPLACE_WITH_*` strings (and the Play service-account path) before submitting.

## Channels and updates

Every profile sets a `channel` so over-the-air updates can be targeted independently. OTA updates aren't enabled in Phase 2.5 — see Phase 2.6 if/when you wire `expo-updates`.

## Troubleshooting

- **`Cannot resolve plugin "expo-camera"`** — run `npx expo install --check` and re-run.
- **Asset paths fail in build** — re-run `node scripts/generate-store-placeholders.js`.
- **`appleId` not set** — submit profile placeholders are intentional; fill them and re-submit.
- **Android `versionCode` collision** — bump `ANDROID_VERSION_CODE` in `.env` (or let `autoIncrement` handle it on production).
