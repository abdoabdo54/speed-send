# Robust Dockerfile for Speed-Send Frontend
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN if [ -f package-lock.json ]; then \
      npm ci --verbose; \
    else \
      npm install --verbose; \
    fi

# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Set build environment
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Copy dependencies and source
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Create public directory if it doesn't exist
RUN mkdir -p public

# Build the application
RUN npm run build

# Runtime stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Add non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Create directories
RUN mkdir -p .next public

# Copy built application
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy public folder (create empty if doesn't exist)
COPY --from=builder /app/public ./public 2>/dev/null || mkdir -p ./public

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]