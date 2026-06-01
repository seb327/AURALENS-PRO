# Multi-stage build for AuraLens.
# - Stage 1 (web-build): exports the Expo web bundle to /workspace/dist
# - Stage 2 (server-build): bundles the Node API to server/dist/index.js
# - Stage 3 (runtime): node:20-alpine running the server, which also serves
#   the web bundle as static files. One Railway URL = full app + API.

# ─── Stage 1: Expo web export ────────────────────────────────────────────────
FROM node:22-alpine AS web-build
WORKDIR /workspace

# Native deps that expo image processing sometimes needs.
RUN apk add --no-cache python3 make g++ libc6-compat

# Install root deps (with legacy-peer-deps for SDK 56 transitives).
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund --legacy-peer-deps

# Copy the rest of the project (app code, config, assets).
COPY . .

# EXPO_PUBLIC_* values are baked into the JS bundle at export time, so they
# must be available as ARGs during this stage. Railway passes any project
# variable that matches an ARG name into the build automatically.
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY
ARG EXPO_PUBLIC_AI_BUDDY_URL
ARG EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG APP_DISPLAY_NAME=AuraLens
ARG APP_SLUG=auralens
ARG EAS_PROJECT_ID

ENV EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL \
    EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY \
    EXPO_PUBLIC_AI_BUDDY_URL=$EXPO_PUBLIC_AI_BUDDY_URL \
    EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=$EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY \
    APP_DISPLAY_NAME=$APP_DISPLAY_NAME \
    APP_SLUG=$APP_SLUG \
    EAS_PROJECT_ID=$EAS_PROJECT_ID \
    CI=1

# Produce /workspace/dist with index.html + JS bundle.
RUN npx expo export --platform web --output-dir dist

# ─── Stage 2: Server bundle ──────────────────────────────────────────────────
FROM node:22-alpine AS server-build
WORKDIR /workspace

COPY server/package.json server/package-lock.json* ./server/
COPY supabase/functions/_shared ./supabase/functions/_shared
COPY server/tsconfig.json ./server/
COPY server/src ./server/src

WORKDIR /workspace/server
RUN npm install --no-audit --no-fund
RUN npm run build

# ─── Stage 3: Runtime ────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Server runtime deps only.
COPY --from=server-build /workspace/server/package.json ./package.json
COPY --from=server-build /workspace/server/package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

# Server bundle.
COPY --from=server-build /workspace/server/dist ./dist

# Web bundle — served by Express as static files at the root URL.
COPY --from=web-build /workspace/dist ./web

EXPOSE 3000
CMD ["node", "dist/index.js"]
