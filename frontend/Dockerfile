FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install --verbose

# Copy application code
COPY . .

# Validate critical source files before building
RUN test -f src/lib/api.ts && \
    head -n 5 src/lib/api.ts && \
    grep -q "^const API_BASE_URL" src/lib/api.ts || (echo "ERROR: src/lib/api.ts is corrupted or missing expected header" && head -n 20 src/lib/api.ts && exit 1)

# Build for production
RUN npm run build

EXPOSE 3000

# Run in production mode
CMD ["npm", "start"]

