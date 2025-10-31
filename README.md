# TokenSim REST API

REST API for TokenSim CLI tool that enables programmatic access to manual mode simulations.

## Features

- Customer folder management (create, read, update, delete)
- Project folder management (create, read, update, delete)
- Configuration file management (YAML generation)
- File uploads (status and ring files)
- Simulation execution via Docker exec
- Output parsing (converts .txt files to JSON)
- JWT authentication

## Prerequisites

- Node.js 18+ or Docker
- Docker (for running the API container and accessing tokenSim container)
- tokenSim container running (`ats-runtime` by default)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Set up environment variables (copy `.env.example` to `.env`):
   ```bash
   JWT_SECRET=your-secret-key-change-in-production
   PORT=3443
   TOKENSIM_CONTAINER_NAME=ats-runtime
   VOLUME_PATH=/home/ats/files
   NODE_ENV=production
   ```

## Docker Deployment

### Build the image:
```bash
docker build -t tokensim-rest-api .
```

### Run the container:
```bash
docker run -d \
  --name tokensim-rest-api \
  -p 3443:3443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /path/to/shared/volume:/home/ats/files \
  -e JWT_SECRET=your-secret-key \
  -e TOKENSIM_CONTAINER_NAME=ats-runtime \
  tokensim-rest-api
```

Or use docker-compose:
```bash
docker-compose up -d
```

## API Endpoints

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Customer Management
- `POST /api/customers` - Create customer folder
- `GET /api/customers/:customerName` - Get customer info
- `DELETE /api/customers/:customerName` - Delete customer
- `PATCH /api/customers/:customerName` - Update customer (rename)

### Project Management
- `POST /api/customers/:customerName/projects` - Create project folder
- `GET /api/customers/:customerName/projects/:projectId` - Get project info
- `DELETE /api/customers/:customerName/projects/:projectId` - Delete project
- `PATCH /api/customers/:customerName/projects/:projectId` - Update project (rename)

### Configuration
- `PUT /api/customers/:customerName/projects/:projectId/config` - Create/update config.yaml
- `GET /api/customers/:customerName/projects/:projectId/config` - Get config.yaml

### File Uploads
- `PUT /api/customers/:customerName/projects/:projectId/status` - Upload hsstool_status.txt
- `PUT /api/customers/:customerName/projects/:projectId/ring` - Upload hsstool_ring.txt

### Simulation
- `POST /api/customers/:customerName/projects/:projectId/run` - Execute simulation
- `GET /api/customers/:customerName/projects/:projectId/output` - Get formatted output JSON

### Health Check
- `GET /health` - Health check (no auth required)

## Usage Example

1. Create a customer:
```bash
curl -X POST http://localhost:3443/api/customers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"customerName": "test-customer"}'
```

2. Create a project:
```bash
curl -X POST http://localhost:3443/api/customers/test-customer/projects \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"projectId": "project-1"}'
```

3. Create config:
```bash
curl -X PUT http://localhost:3443/api/customers/test-customer/projects/project-1/config \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "test",
    "dc_for_nodes": ["dc-1;3;129;3,1;rack-1:3"],
    "nodes_to_add": ["cloudian-node4:dc-1:rack-1"],
    "region": "region-1",
    "cumulative": "false"
  }'
```

4. Upload status file:
```bash
curl -X PUT http://localhost:3443/api/customers/test-customer/projects/project-1/status \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"content": "status file content here"}'
```

5. Upload ring file:
```bash
curl -X PUT http://localhost:3443/api/customers/test-customer/projects/project-1/ring \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"content": "ring file content here"}'
```

6. Run simulation:
```bash
curl -X POST http://localhost:3443/api/customers/test-customer/projects/project-1/run \
  -H "Authorization: Bearer <token>"
```

7. Get output:
```bash
curl -X GET http://localhost:3443/api/customers/test-customer/projects/project-1/output \
  -H "Authorization: Bearer <token>"
```

## Development

Run in development mode:
```bash
npm run dev
```

## Environment Variables

- `JWT_SECRET` - JWT signing secret (required)
- `PORT` - Server port (default: 3443)
- `TOKENSIM_CONTAINER_NAME` - Docker container name (default: ats-runtime)
- `VOLUME_PATH` - Path to shared volume (default: /home/ats/files)
- `NODE_ENV` - Environment (development/production)

## License

ISC

