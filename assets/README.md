# Assets

This folder needs `splash.png` and `icon.png` before you build for stores.

- `icon.png` — 1024×1024 PNG, no transparency, no rounded corners.
- `splash.png` — at least 2048×2048 PNG with the brand mark centred on a `#050507` background. Will be cover-resized at runtime.
- `adaptive-icon.png` (optional for Android) — 1024×1024 foreground PNG with transparent padding.

`app.config.ts` references `./assets/splash.png` and `./assets/icon.png` — drop your final art in here with those exact filenames.
