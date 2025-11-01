# TokenSim REST API - Docker Deployment Guide

Complete guide for deploying the TokenSim REST API Docker container.

## Prerequisites

- Docker and Docker Compose installed
- Git installed (for cloning repository)
- Access to tokenSim container (`ats-runtime`) running
- Port 3443 available
- Directory `/opt/tokensim/data` for shared volume

## Step-by-Step Deployment

### Step 1: Clone Repository

```bash
# On your server
cd /opt/tokensim
git clone <your-repo-url> tokenSim_RESTAPI
cd tokenSim_RESTAPI
```

### Step 2: Generate API Token

```bash
# Generate a secure random token
API_TOKEN=$(openssl rand -base64 32)
echo "Generated API Token: $API_TOKEN"

# IMPORTANT: Save this token - you'll need it for API calls!
```

### Step 3: Create .env File

```bash
# Create .env file with generated token
cat > .env << EOF
API_TOKEN=$API_TOKEN
PORT=3443
TOKENSIM_CONTAINER_NAME=ats-runtime
VOLUME_PATH=/home/ats/files
NODE_ENV=production
EOF

# Verify .env file
cat .env
```

### Step 4: Ensure Data Directory Exists

```bash
# Create data directory if it doesn't exist
mkdir -p /opt/tokensim/data
chmod 755 /opt/tokensim/data
```

### Step 5: Build Docker Image

```bash
# Build the image (fast with package-lock.json)
docker compose build

# Expected output: Successfully built image
```

### Step 6: Start Container

```bash
# Start the container in detached mode
docker compose up -d

# Verify it's running
docker compose ps

# Check logs to ensure it started correctly
docker compose logs tokensim-api --tail 50
```

You should see output like:
```
🚀 TokenSim REST API server running on port 3443
📁 Volume path: /home/ats/files
🐳 TokenSim container: ats-runtime
🔐 API Token authentication: enabled
```

### Step 7: Verify Deployment

```bash
# Test health endpoint (no auth required)
curl http://localhost:3443/health

# Expected response:
# {"success":true,"data":{"status":"ok","timestamp":"...","service":"tokensim-rest-api","version":"1.0.0"}}

# Get your API token from .env
API_TOKEN=$(grep API_TOKEN .env | cut -d '=' -f2)

# Test API authentication
curl -X GET http://localhost:3443/api/customers \
  -H "Authorization: Bearer $API_TOKEN"

# Expected response: {"success":true,"data":{"customers":[],"count":0}}
```

## Complete Deployment Script

Save this as `deploy.sh` and run it:

```bash
#!/bin/bash

set -e  # Exit on error

echo "=== TokenSim API Docker Deployment ==="
echo ""

# Configuration
REPO_URL="<your-repo-url>"  # UPDATE THIS!
INSTALL_DIR="/opt/tokensim"
APP_DIR="$INSTALL_DIR/tokenSim_RESTAPI"

# Step 1: Clone or update repository
if [ -d "$APP_DIR" ]; then
    echo "Repository exists, updating..."
    cd "$APP_DIR"
    git pull
else
    echo "Cloning repository..."
    cd "$INSTALL_DIR"
    git clone "$REPO_URL" tokenSim_RESTAPI
    cd "$APP_DIR"
fi

# Step 2: Generate API token
echo "Generating API token..."
API_TOKEN=$(openssl rand -base64 32)
echo "API Token: $API_TOKEN"
echo ""

# Step 3: Create .env file
echo "Creating .env file..."
cat > .env << EOF
API_TOKEN=$API_TOKEN
PORT=3443
TOKENSIM_CONTAINER_NAME=ats-runtime
VOLUME_PATH=/home/ats/files
NODE_ENV=production
EOF

# Step 4: Create data directory
echo "Creating data directory..."
mkdir -p /opt/tokensim/data
chmod 755 /opt/tokensim/data

# Step 5: Build Docker image
echo "Building Docker image..."
docker compose down || true
docker compose build

if [ $? -ne 0 ]; then
    echo "✗ Build failed!"
    exit 1
fi

# Step 6: Start container
echo "Starting container..."
docker compose up -d
sleep 5

# Step 7: Verify deployment
echo ""
echo "=== Verification ==="
docker compose ps

echo ""
echo "=== Health Check ==="
curl -s http://localhost:3443/health | jq '.' || curl -s http://localhost:3443/health

echo ""
echo "=== API Token Test ==="
TEST_RESPONSE=$(curl -s -X GET http://localhost:3443/api/customers \
  -H "Authorization: Bearer $API_TOKEN")
echo "$TEST_RESPONSE" | jq '.' || echo "$TEST_RESPONSE"

echo ""
echo "=== Deployment Complete ==="
echo "API Token: $API_TOKEN"
echo "Save this token for your API calls!"
echo ""
echo "Example usage:"
echo "curl -X GET http://localhost:3443/api/customers \\"
echo "  -H \"Authorization: Bearer $API_TOKEN\""
```

Make it executable and run:
```bash
chmod +x deploy.sh
./deploy.sh
```

## Docker Commands Reference

### Start Container
```bash
docker compose up -d
```

### Stop Container
```bash
docker compose stop
# Or stop and remove
docker compose down
```

### View Logs
```bash
# All logs
docker compose logs tokensim-api

# Follow logs (like tail -f)
docker compose logs -f tokensim-api

# Last 50 lines
docker compose logs tokensim-api --tail 50
```

### Restart Container
```bash
# Restart without rebuilding
docker compose restart

# Restart with rebuild
docker compose down
docker compose build
docker compose up -d
```

### Check Container Status
```bash
# Running containers
docker compose ps

# All containers (including stopped)
docker compose ps -a

# Container details
docker inspect tokensim-rest-api
```

### Execute Commands in Container
```bash
# Enter container shell
docker compose exec tokensim-api sh

# Check environment variables
docker compose exec tokensim-api env | grep API_TOKEN

# Check if files are accessible
docker compose exec tokensim-api ls -la /home/ats/files
```

## Updating Existing Deployment

### Pull Latest Code and Rebuild

```bash
cd /opt/tokensim/tokenSim_RESTAPI

# Pull latest changes
git pull

# Rebuild and restart
docker compose down
docker compose build
docker compose up -d

# Verify
docker compose logs tokensim-api --tail 20
```

### Update Environment Variables

```bash
# Edit .env file
nano .env

# Restart container to pick up changes
docker compose restart

# Or recreate container
docker compose down
docker compose up -d
```

## Troubleshooting

### Build Fails

```bash
# Check Docker is running
docker info

# Check disk space
df -h

# Clean Docker cache
docker system prune -f

# Rebuild without cache
docker compose build --no-cache
```

### Container Won't Start

```bash
# Check logs for errors
docker compose logs tokensim-api

# Check port availability
netstat -tlnp | grep 3443

# Check container status
docker compose ps -a

# Check Docker daemon
systemctl status docker
```

### Authentication Fails

```bash
# Verify token in container
docker compose exec tokensim-api env | grep API_TOKEN

# Verify token matches .env
cat .env | grep API_TOKEN

# Test with exact token
TOKEN=$(grep API_TOKEN .env | cut -d '=' -f2)
curl -X GET http://localhost:3443/api/customers \
  -H "Authorization: Bearer $TOKEN"
```

### TokenSim Container Not Found

```bash
# Check if ats-runtime container exists
docker ps -a | grep ats-runtime

# If not running, start it
docker start ats-runtime

# Verify it's running
docker ps | grep ats-runtime
```

### Permission Issues

```bash
# Check data directory permissions
ls -ld /opt/tokensim/data

# Fix permissions if needed
chmod 755 /opt/tokensim/data
chown -R $(whoami):$(whoami) /opt/tokensim/data
```

### Cannot Access Docker Socket

```bash
# Check Docker socket permissions
ls -l /var/run/docker.sock

# Add user to docker group (if needed)
sudo usermod -aG docker $USER
# Then logout and login again
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `API_TOKEN` | Authentication token | `your-api-token-change-in-production` | Yes |
| `PORT` | API server port | `3443` | No |
| `TOKENSIM_CONTAINER_NAME` | TokenSim container name | `ats-runtime` | No |
| `VOLUME_PATH` | Shared volume path in container | `/home/ats/files` | No |
| `NODE_ENV` | Node environment | `production` | No |

## Container Details

- **Image**: Built from `Dockerfile` (Node.js 20 Alpine)
- **Port**: 3443 (exposed to host)
- **Volumes**:
  - `/var/run/docker.sock` → Docker socket (for docker exec)
  - `/opt/tokensim/data` → `/home/ats/files` (shared volume)
- **Restart Policy**: `unless-stopped`

## Security Considerations

1. **API Token**: Use a strong, randomly generated token (32+ characters)
2. **Network**: Consider restricting API access to internal network only
3. **HTTPS**: For production, use HTTPS/TLS reverse proxy (nginx, Traefik)
4. **Firewall**: Only expose port 3443 if needed externally
5. **Token Storage**: Keep `.env` file secure (600 permissions: `chmod 600 .env`)
6. **Docker Socket**: Ensure Docker socket permissions are secure

## File Structure

```
/opt/tokensim/
├── tokenSim_RESTAPI/          # API repository
│   ├── src/                   # Source code
│   ├── dist/                  # Compiled JavaScript
│   ├── .env                   # Environment variables (API_TOKEN)
│   ├── docker-compose.yml     # Docker Compose config
│   ├── Dockerfile             # Docker image definition
│   └── package.json           # Dependencies
└── data/                      # Shared volume for API and tokenSim
    └── customers/             # Created by API
        └── <customer-name>/
            └── projects/
                └── <project-id>/
                    ├── config.yaml
                    ├── hsstool_status.txt
                    ├── hsstool_ring.txt
                    └── output/
```

## Next Steps

After successful deployment:

1. Test all API endpoints using the API token
2. Configure your web application to use the API
3. Set up monitoring/logging if needed
4. Configure backups for `/opt/tokensim/data`
5. Set up reverse proxy with HTTPS for production

## Support

For issues:
- Check container logs: `docker compose logs tokensim-api`
- Verify configuration: `cat .env`
- Test connectivity: `curl http://localhost:3443/health`
- Check Docker: `docker compose ps`
