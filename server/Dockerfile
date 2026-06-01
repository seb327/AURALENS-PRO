# Multi-stage build for the AuraLens AI Aura Buddy server.
# Bundles all server source (including the shared modules under
# ../supabase/functions/_shared/) into a single dist/index.js with esbuild.

# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /workspace

# We need both the server directory and the shared edge modules. The Docker
# build context is the project root (see railway.json), so paths are repo-relative.
COPY server/package.json server/package-lock.json* ./server/
COPY supabase/functions/_shared ./supabase/functions/_shared
COPY server/tsconfig.json ./server/
COPY server/src ./server/src

WORKDIR /workspace/server
RUN npm install --no-audit --no-fund
RUN npm run build

# ─── Runtime stage ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /workspace/server/package.json ./package.json
COPY --from=build /workspace/server/package-lock.json* ./
# Only install production deps. esbuild + tsx are dev-only.
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /workspace/server/dist ./dist

EXPOSE 3000
CMD ["node", "dist/index.js"]
