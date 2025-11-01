# Dockerfile for TokenSim REST API

FROM node:20-alpine

# Install Docker CLI
RUN apk add --no-cache docker-cli

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
# Set NODE_ENV to empty to ensure dev dependencies are installed
RUN NODE_ENV= npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Expose port
EXPOSE 3443

# Start server
CMD ["npm", "start"]

