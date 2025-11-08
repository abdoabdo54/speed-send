# Multi-stage Dockerfile for Next.js 14 app with standalone output

# 1) Install dependencies (including devDependencies for build)
FROM node:20-alpine AS deps
WORKDIR /app

# Leverage Docker layer caching: only re-run npm ci when lockfile or package.json changes
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
      npm ci --verbose; \
    else \
      npm install --verbose; \
    fi

# 2) Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Optional build-time configuration
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Bring in node_modules from deps stage, then copy source
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Validate critical source files before building (helps detect broken copies)
RUN test -f src/lib/api.ts && \
    head -n 5 src/lib/api.ts && \
    grep -q "^export const API_URL" src/lib/api.ts || (echo "ERROR: src/lib/api.ts is corrupted or missing expected header (expected 'export const API_URL')" && head -n 20 src/lib/api.ts && exit 1)
# Assert axios import exists in edit page (defensive check against caching/mis-copy)
RUN test -f src/app/campaigns/[id]/edit/page.tsx && \
    head -n 5 src/app/campaigns/[id]/edit/page.tsx && \
    grep -n "^import axios from 'axios'" src/app/campaigns/[id]/edit/page.tsx || (echo "ERROR: axios import missing in campaigns/[id]/edit/page.tsx" && sed -n '1,60p' src/app/campaigns/[id]/edit/page.tsx && exit 1)

# Build for production (standalone output is enabled in next.config.js)
RUN npm run build

# 3) Create a minimal runtime image using Next.js standalone output
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Copy the standalone server and static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

# Start the Next.js server
CMD ["node", "server.js"]
