FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install --verbose

# Copy application code
COPY . .

# Build for production
RUN npm run build

EXPOSE 3000

# Run in production mode
CMD ["npm", "start"]

