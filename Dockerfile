# Dockerfile for TokenSim REST API

FROM node:20-alpine

# Install Docker CLI
RUN apk add --no-cache docker-cli

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies - ensure dev dependencies are installed
# Clear npm cache and install everything
RUN npm cache clean --force && \
    npm install --include=dev --loglevel=verbose

# Copy source code
COPY . .

# Build TypeScript - verify it exists first, then build
RUN if [ ! -f node_modules/.bin/tsc ]; then \
        echo "TypeScript not found, installing..." && \
        npm install typescript --save-dev; \
    fi && \
    node_modules/.bin/tsc

# Remove dev dependencies after build
RUN npm prune --production

# Expose port
EXPOSE 3443

# Start server
CMD ["npm", "start"]