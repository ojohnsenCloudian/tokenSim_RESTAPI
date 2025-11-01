# Dockerfile for TokenSim REST API

FROM node:20-alpine

# Install Docker CLI
RUN apk add --no-cache docker-cli

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev)
RUN npm install

# Copy source code
COPY . .

# Build TypeScript using direct path to tsc binary
RUN node_modules/.bin/tsc

# Remove dev dependencies after build
RUN npm prune --production

# Expose port
EXPOSE 3443

# Start server
CMD ["npm", "start"]

