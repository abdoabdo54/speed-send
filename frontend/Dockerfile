# Clean Dockerfile for Speed-Send Frontend
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production --verbose

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

# Install dev dependencies for build
RUN npm ci --verbose

# Build the application
RUN npm run build

# Runtime stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Copy built application
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]