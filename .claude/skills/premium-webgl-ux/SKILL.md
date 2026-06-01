---
name: premium-webgl-ux
description: Use when building or auditing premium web UX with WebGL shaders, GSAP motion, cinematic UI, scroll/swipe interaction, and screenshot-based visual QA.
---

# Premium WebGL UX Director

This skill is mandatory when upgrading Auralens or any web app that must look like a premium Awwwards-level interactive website.

## Core standard

Do not accept "nice UI" as good enough.

The output must feel like:
- premium web app
- top-tier studio build
- WebGL/shader-driven
- cinematic
- dark luxury
- responsive desktop and mobile
- expensive, not template-like

The output must not feel like:
- basic React page
- mobile app stretched to web
- static hero section
- dark gradient with one button
- white page
- yellow default button
- cheap SaaS template
- generic wellness app

## Required stack check

Before coding, inspect:
- package.json
- React version
- router/framework
- current CSS system
- existing screens
- whether Tailwind exists
- whether Three.js/R3F/GSAP/Lenis/Playwright exist

If React Three Fiber is installed, make sure it matches the React major version.

If Tailwind is not already in the project, do not install Tailwind just to copy a component library unless clearly justified.

## Required components

Build or upgrade these real components:

1. AuraWebGLScene
- Real canvas/WebGL background
- Animated shader-style aura field
- Pointer-responsive lighting
- Scroll/swipe velocity response
- Inertia after gesture
- Grain and vignette overlay
- Safe fallback if WebGL fails

2. KineticAuraController
- Captures wheel, scroll, pointer and touch velocity
- Smooths values with requestAnimationFrame
- Sends values to shader uniforms or CSS variables
- No React state updates every frame

3. PremiumButton
Variants:
- primary
- secondary
- ghost
- danger

Primary button must include:
- luxury dark/glass surface
- specular highlight
- inner glow
- outer aura shadow
- hover lift
- press compression
- loading state
- disabled state
- pointer-following light
- no default browser button styling

4. HeroScanMockup
The homepage must not have empty right-side space.

Build:
- glass phone/app mockup
- animated aura orb
- scan ring
- floating metric cards
- visual energy profile preview
- symbolic face reading labels
- premium depth and motion

5. CinematicReadingSequence
The reading/loading screen must not be a spinner.

It must include:
- 6–9 second minimum staged reading duration
- visual phases
- animated scan ring
- aura pulse
- progress copy
- result reveal build-up
- haptic vibration utility for supported mobile browsers

Suggested phases:
- Mapping facial energy points…
- Reading symbolic face zones…
- Building your visual energy profile…
- Balancing aura signal…
- Preparing your reflection…

6. GlassCard / PremiumPanel / PricingCard / ResultCard
Use:
- glass depth
- blur/fallback
- border light
- premium shadows
- strong typography
- hover lift on desktop

## Required screens

Upgrade the actual existing screens:
- Home
- Scan / Upload
- Processing / Reading
- Results
- Pricing / Upgrade
- Timeline
- Settings

Do not create a fake demo page.
Do not delete existing flows.
Do not replace the app with a landing page.

## Visual QA rule

Never claim the task is complete from code alone.

You must:
1. Run the app.
2. Open it in browser.
3. Capture screenshots with Playwright:
   - desktop homepage
   - mobile homepage
   - scan screen
   - reading screen
   - results screen
   - pricing screen
4. Review the screenshots.
5. If the homepage still looks like text plus one button, continue improving.

## Screenshot acceptance criteria

The app is not finished unless:
- Homepage has a visible premium WebGL/shader atmosphere
- Right side has a real product/scan scene
- Buttons look custom and expensive
- Swipe/scroll visibly energises the background
- Reading screen looks cinematic
- Results screen feels like a reveal
- Pricing screen feels valuable
- Desktop looks premium
- Mobile looks polished
- No white page remains
- No yellow default button remains
- No dead buttons remain

## Haptics

Use browser Vibration API safely:
- feature detect navigator.vibrate
- only after user action
- light pulse at scan start
- light pulse per phase change
- stronger pulse at result reveal
- fail silently when unsupported
- never vibrate aggressively

## Final response required

When finished, provide:
- files edited
- dependencies added
- what screenshots were captured
- what still looked weak and how it was fixed
- checks run
- exact command to run the app
- honest judgement against the premium brief
