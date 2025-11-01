# Dockerfile for TokenSim REST API

FROM node:20-alpine

# Install Docker CLI
RUN apk add --no-cache docker-cli

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev)
# Explicitly set NODE_ENV to ensure dev dependencies are installed
ENV NODE_ENV=development
RUN npm install

# Copy source code
COPY . .

# Verify TypeScript is installed and build
RUN ls -la node_modules/.bin/tsc && node_modules/.bin/tsc

# Remove dev dependencies after build
RUN npm prune --production

# Expose port
EXPOSE 3443

# Start server
CMD ["npm", "start"]

