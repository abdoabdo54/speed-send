FROM node:20-alpine

WORKDIR /app

# Copy package files (include lockfile if present for reproducible builds)
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN if [ -f package-lock.json ]; then npm ci --verbose; else npm install --verbose; fi

# Copy application code
COPY . .

# Validate critical source files before building
RUN test -f src/lib/api.ts && \
    head -n 5 src/lib/api.ts && \
    grep -q "^export const API_URL" src/lib/api.ts || (echo "ERROR: src/lib/api.ts is corrupted or missing expected header (expected 'export const API_URL')" && head -n 20 src/lib/api.ts && exit 1)

# Build for production
RUN npm run build

EXPOSE 3000

# Run in production mode
CMD ["npm", "start"]

