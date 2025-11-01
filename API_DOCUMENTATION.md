# TokenSim REST API Documentation

Complete API documentation with curl examples for all endpoints.

## Table of Contents

- [Authentication](#authentication)
- [Base URL](#base-url)
- [Health Check](#health-check)
- [Customer Management](#customer-management)
- [Project Management](#project-management)
- [Configuration Management](#configuration-management)
- [File Uploads](#file-uploads)
- [Simulation Execution](#simulation-execution)
- [Output Retrieval](#output-retrieval)
- [Error Responses](#error-responses)

## Authentication

All API endpoints (except `/health`) require API token authentication via Bearer token in the Authorization header.

### API Token

The API uses a simple hardcoded token for authentication. Set the token in your `.env` file:

```bash
API_TOKEN=your-secure-api-token-here
```

### Using the Token

All requests should include the token in the Authorization header:

```bash
curl -H "Authorization: Bearer your-api-token-here" ...
```

### Generate Secure Token

You can generate a secure random token:

```bash
# Generate a secure random token
openssl rand -base64 32

# Or use this one-liner
openssl rand -hex 32
```

Store the generated token in your `.env` file and use it in all API requests.

## Base URL

Default base URL: `http://localhost:3443`

For production, replace with your server IP or domain.

## Health Check

### GET /health

Check API health status (no authentication required).

**Request:**
```bash
curl http://localhost:3443/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2025-10-31T14:00:00.000Z",
    "service": "tokensim-rest-api",
    "version": "1.0.0"
  }
}
```

## Customer Management

### List All Customers

**GET /api/customers**

Get list of all customers.

**Request:**
```bash
curl -X GET http://localhost:3443/api/customers \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "name": "customer1",
        "path": "/home/ats/files/customers/customer1"
      },
      {
        "name": "customer2",
        "path": "/home/ats/files/customers/customer2"
      }
    ]
  },
  "count": 2
}
```

### Create Customer

**POST /api/customers**

Create a new customer folder.

**Request:**
```bash
curl -X POST http://localhost:3443/api/customers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "test-customer"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Customer 'test-customer' created successfully",
  "data": {
    "customerName": "test-customer",
    "path": "/home/ats/files/customers/test-customer"
  }
}
```

### Get Customer Details

**GET /api/customers/:customerName**

Get details about a specific customer including all projects.

**Request:**
```bash
curl -X GET http://localhost:3443/api/customers/test-customer \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "customerName": "test-customer",
    "path": "/home/ats/files/customers/test-customer",
    "projectCount": 2,
    "projects": [
      {
        "id": "project1",
        "path": "/home/ats/files/customers/test-customer/projects/project1"
      },
      {
        "id": "project2",
        "path": "/home/ats/files/customers/test-customer/projects/project2"
      }
    ]
  }
}
```

### Update Customer (Rename)

**PATCH /api/customers/:customerName**

Rename a customer folder.

**Request:**
```bash
curl -X PATCH http://localhost:3443/api/customers/test-customer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "renamed-customer"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Customer 'test-customer' renamed to 'renamed-customer' successfully",
  "data": {
    "oldCustomerName": "test-customer",
    "newCustomerName": "renamed-customer",
    "path": "/home/ats/files/customers/renamed-customer"
  }
}
```

### Delete Customer

**DELETE /api/customers/:customerName**

Delete a customer and all associated projects.

**Request:**
```bash
curl -X DELETE http://localhost:3443/api/customers/test-customer \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Customer 'test-customer' deleted successfully",
  "data": {
    "customerName": "test-customer"
  }
}
```

## Project Management

### List All Projects for a Customer

**GET /api/customers/:customerName/projects**

Get all projects for a customer with file status.

**Request:**
```bash
curl -X GET http://localhost:3443/api/customers/test-customer/projects \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "customerName": "test-customer",
    "projects": [
      {
        "id": "project1",
        "path": "/home/ats/files/customers/test-customer/projects/project1",
        "files": {
          "config": true,
          "status": true,
          "ring": true,
          "output": false
        },
        "ready": true
      },
      {
        "id": "project2",
        "path": "/home/ats/files/customers/test-customer/projects/project2",
        "files": {
          "config": true,
          "status": false,
          "ring": false,
          "output": false
        },
        "ready": false
      }
    ]
  },
  "count": 2
}
```

### Create Project

**POST /api/customers/:customerName/projects**

Create a new project folder for a customer.

**Request:**
```bash
curl -X POST http://localhost:3443/api/customers/test-customer/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "project1"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Project 'project1' created successfully for customer 'test-customer'",
  "data": {
    "customerName": "test-customer",
    "projectId": "project1",
    "path": "/home/ats/files/customers/test-customer/projects/project1"
  }
}
```

### Get Project Details

**GET /api/customers/:customerName/projects/:projectId**

Get detailed information about a specific project.

**Request:**
```bash
curl -X GET http://localhost:3443/api/customers/test-customer/projects/project1 \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "customerName": "test-customer",
    "projectId": "project1",
    "path": "/home/ats/files/customers/test-customer/projects/project1",
    "files": {
      "config": true,
      "status": true,
      "ring": true,
      "output": true
    },
    "ready": true,
    "outputFileCount": 15
  }
}
```

### Update Project (Rename)

**PATCH /api/customers/:customerName/projects/:projectId**

Rename a project folder.

**Request:**
```bash
curl -X PATCH http://localhost:3443/api/customers/test-customer/projects/project1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "renamed-project"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Project 'project1' renamed to 'renamed-project' successfully",
  "data": {
    "customerName": "test-customer",
    "oldProjectId": "project1",
    "newProjectId": "renamed-project",
    "path": "/home/ats/files/customers/test-customer/projects/renamed-project"
  }
}
```

### Delete Project

**DELETE /api/customers/:customerName/projects/:projectId**

Delete a project folder.

**Request:**
```bash
curl -X DELETE http://localhost:3443/api/customers/test-customer/projects/project1 \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Project 'project1' deleted successfully for customer 'test-customer'",
  "data": {
    "customerName": "test-customer",
    "projectId": "project1"
  }
}
```

## Configuration Management

### Create/Update Config

**PUT /api/customers/:customerName/projects/:projectId/config**

Create or update the configuration YAML file for a project.

**Request:**
```bash
curl -X PUT http://localhost:3443/api/customers/test-customer/projects/project1/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "test",
    "dc_for_nodes": [
      "dc-1;3;129;3,1;rack-1:3"
    ],
    "nodes_to_add": [
      "cloudian-node4:dc-1:rack-1",
      "cloudian-node5:dc-1:rack-1",
      "cloudian-node6:dc-1:rack-1"
    ],
    "region": "region-1",
    "cumulative": "false"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Config file created/updated successfully for project 'project1'",
  "data": {
    "customerName": "test-customer",
    "projectId": "project1",
    "config": {
      "customer_name": "test",
      "hss_ring_output": "/home/ats/files/customers/test-customer/projects/project1/hsstool_ring.txt",
      "hss_status_output": "/home/ats/files/customers/test-customer/projects/project1/hsstool_status.txt",
      "dc_for_nodes": ["dc-1;3;129;3,1;rack-1:3"],
      "nodes_to_add": [
        "cloudian-node4:dc-1:rack-1",
        "cloudian-node5:dc-1:rack-1",
        "cloudian-node6:dc-1:rack-1"
      ],
      "region": "region-1",
      "cumulative": "false",
      "output_dir": "/home/ats/files/customers/test-customer/projects/project1/output/"
    },
    "yaml": "customer_name: test\n..."
  }
}
```

### Get Config

**GET /api/customers/:customerName/projects/:projectId/config**

Retrieve the configuration file for a project.

**Request:**
```bash
curl -X GET http://localhost:3443/api/customers/test-customer/projects/project1/config \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "customerName": "test-customer",
    "projectId": "project1",
    "config": {
      "customer_name": "test",
      "hss_ring_output": "/home/ats/files/customers/test-customer/projects/project1/hsstool_ring.txt",
      "hss_status_output": "/home/ats/files/customers/test-customer/projects/project1/hsstool_status.txt",
      "dc_for_nodes": ["dc-1;3;129;3,1;rack-1:3"],
      "nodes_to_add": ["cloudian-node4:dc-1:rack-1"],
      "region": "region-1",
      "cumulative": "false",
      "output_dir": "/home/ats/files/customers/test-customer/projects/project1/output/"
    },
    "yaml": "customer_name: test\n..."
  }
}
```

## File Uploads

### Upload Status File

**PUT /api/customers/:customerName/projects/:projectId/status**

Upload the `hsstool_status.txt` file for a project.

**Request:**
```bash
curl -X PUT http://localhost:3443/api/customers/test-customer/projects/project1/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "status file content here..."
  }'
```

**Upload from File:**
```bash
curl -X PUT http://localhost:3443/api/customers/test-customer/projects/project1/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"content\": \"$(cat /path/to/hsstool_status.txt | sed 's/"/\\"/g')\"}"
```

**Response:**
```json
{
  "success": true,
  "message": "Status file uploaded successfully for project 'project1'",
  "data": {
    "customerName": "test-customer",
    "projectId": "project1",
    "filename": "hsstool_status.txt",
    "path": "/home/ats/files/customers/test-customer/projects/project1/hsstool_status.txt",
    "size": 1234
  }
}
```

### Upload Ring File

**PUT /api/customers/:customerName/projects/:projectId/ring**

Upload the `hsstool_ring.txt` file for a project.

**Request:**
```bash
curl -X PUT http://localhost:3443/api/customers/test-customer/projects/project1/ring \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "ring file content here..."
  }'
```

**Upload from File:**
```bash
curl -X PUT http://localhost:3443/api/customers/test-customer/projects/project1/ring \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"content\": \"$(cat /path/to/hsstool_ring.txt | sed 's/"/\\"/g')\"}"
```

**Response:**
```json
{
  "success": true,
  "message": "Ring file uploaded successfully for project 'project1'",
  "data": {
    "customerName": "test-customer",
    "projectId": "project1",
    "filename": "hsstool_ring.txt",
    "path": "/home/ats/files/customers/test-customer/projects/project1/hsstool_ring.txt",
    "size": 5678
  }
}
```

## Simulation Execution

### Run Simulation

**POST /api/customers/:customerName/projects/:projectId/run**

Execute the tokenSim simulation for a project.

**Request:**
```bash
curl -X POST http://localhost:3443/api/customers/test-customer/projects/project1/run \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Simulation executed successfully for project 'project1'",
  "data": {
    "customerName": "test-customer",
    "projectId": "project1",
    "execution": {
      "stdout": "****************** Start Customer Cluster Expansion Information ******************\nCustomer Name - test\n...",
      "stderr": null,
      "timestamp": "2025-10-31T14:00:00.000Z"
    }
  }
}
```

**Note:** This endpoint validates that config.yaml, hsstool_status.txt, and hsstool_ring.txt exist before running the simulation.

## Output Retrieval

### Get Simulation Output

**GET /api/customers/:customerName/projects/:projectId/output**

Retrieve parsed simulation output as structured JSON.

**Request:**
```bash
curl -X GET http://localhost:3443/api/customers/test-customer/projects/project1/output \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "customerName": "test-customer",
    "projectId": "project1",
    "nodes": [
      {
        "ip": "192.168.202.212",
        "name": "ddpobj02",
        "hostname": "ddpobj02",
        "datacenter": "dd13",
        "region": "emea",
        "rack": "rack",
        "tokens": [
          "101324752527324235330231587460544987136",
          "104113502718187925406842638723367043072"
        ],
        "tokenCount": 85
      }
    ],
    "datacenters": {
      "th2": ["192.168.202.202", "192.168.202.203", "192.168.202.204"],
      "dd13": ["192.168.202.211", "192.168.202.212", "192.168.202.214"]
    },
    "hostnames": {
      "192.168.202.202": "thpobj02:rack",
      "192.168.202.203": "thpobj05:rack"
    },
    "tokenMappings": [
      {
        "token": "465035087392525499480262577485774848",
        "ip": "192.168.202.204"
      }
    ],
    "summary": {
      "totalNodes": 6,
      "totalTokens": 510,
      "totalDatacenters": 2
    },
    "files": [...],
    "fileSummary": {
      "totalFiles": 15,
      "txtFiles": 14,
      "jsonFiles": 1,
      "fileTypes": ["hostname", "tokenmap", "ip_tokens", "dc"]
    },
    "timestamp": "2025-10-31T14:00:00.000Z"
  }
}
```

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "name": "AppError",
    "message": "Error message here",
    "statusCode": 400
  },
  "timestamp": "2025-10-31T14:00:00.000Z"
}
```

### Common Error Codes

- **400 Bad Request** - Invalid request data or validation error
- **401 Unauthorized** - Missing or invalid JWT token
- **404 Not Found** - Resource (customer, project, file) not found
- **409 Conflict** - Resource already exists (e.g., customer/project name taken)
- **500 Internal Server Error** - Server error
- **503 Service Unavailable** - TokenSim container not running

### Example Error Responses

**401 Unauthorized:**
```bash
curl http://localhost:3443/api/customers
# Missing Authorization header
```

**Response:**
```json
{
  "success": false,
  "error": {
    "name": "AppError",
    "message": "Authentication token required",
    "statusCode": 401
  },
  "timestamp": "2025-10-31T14:00:00.000Z"
}
```

**404 Not Found:**
```bash
curl -X GET http://localhost:3443/api/customers/nonexistent \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": false,
  "error": {
    "name": "AppError",
    "message": "Customer 'nonexistent' not found",
    "statusCode": 404
  },
  "timestamp": "2025-10-31T14:00:00.000Z"
}
```

**409 Conflict:**
```bash
curl -X POST http://localhost:3443/api/customers/test-customer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"customerName": "test-customer"}'
# Customer already exists
```

**Response:**
```json
{
  "success": false,
  "error": {
    "name": "AppError",
    "message": "Customer 'test-customer' already exists",
    "statusCode": 409
  },
  "timestamp": "2025-10-31T14:00:00.000Z"
}
```

## Complete Workflow Example

Here's a complete example workflow from start to finish:

```bash
# 1. Set your token
export TOKEN="your-jwt-token-here"

# 2. Create customer
curl -X POST http://localhost:3443/api/customers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"customerName": "acme-corp"}'

# 3. Create project
curl -X POST http://localhost:3443/api/customers/acme-corp/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId": "expansion-2024"}'

# 4. Create config
curl -X PUT http://localhost:3443/api/customers/acme-corp/projects/expansion-2024/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "acme",
    "dc_for_nodes": ["dc-1;3;129;3,1;rack-1:3"],
    "nodes_to_add": ["cloudian-node4:dc-1:rack-1"],
    "region": "us-east",
    "cumulative": "false"
  }'

# 5. Upload status file
curl -X PUT http://localhost:3443/api/customers/acme-corp/projects/expansion-2024/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"content\": \"$(cat status.txt | sed 's/"/\\"/g')\"}"

# 6. Upload ring file
curl -X PUT http://localhost:3443/api/customers/acme-corp/projects/expansion-2024/ring \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"content\": \"$(cat ring.txt | sed 's/"/\\"/g')\"}"

# 7. Run simulation
curl -X POST http://localhost:3443/api/customers/acme-corp/projects/expansion-2024/run \
  -H "Authorization: Bearer $TOKEN"

# 8. Get output
curl -X GET http://localhost:3443/api/customers/acme-corp/projects/expansion-2024/output \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

## Pretty Printing JSON Responses

For better readability, pipe responses through `jq`:

```bash
# Install jq (if not installed)
sudo dnf install -y jq

# Use jq to format responses
curl -X GET http://localhost:3443/api/customers \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

## Rate Limiting

Currently, there are no rate limits enforced. However, it's recommended to:
- Avoid rapid sequential requests
- Use appropriate delays between requests in scripts
- Batch operations when possible

## Version

API Version: 1.0.0

For API updates and changes, check the `/health` endpoint for version information.

