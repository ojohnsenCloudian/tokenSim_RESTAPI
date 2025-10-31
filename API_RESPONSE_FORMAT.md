# API Response Format Documentation

All API responses follow a consistent JSON structure for easy consumption in web applications.

## Success Response Format

All successful responses follow this structure:

```json
{
  "success": true,
  "message": "Optional success message",
  "data": {
    // Response-specific data
  },
  // Optional metadata (count, timestamp, etc.)
}
```

## Error Response Format

All error responses follow this structure:

```json
{
  "success": false,
  "error": {
    "name": "Error type",
    "message": "Error message",
    "statusCode": 400
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Response Examples

### GET /api/customers (List all customers)

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

### GET /api/customers/:customerName (Get customer details)

```json
{
  "success": true,
  "data": {
    "customerName": "customer1",
    "path": "/home/ats/files/customers/customer1",
    "projectCount": 3,
    "projects": [
      {
        "id": "project1",
        "path": "/home/ats/files/customers/customer1/projects/project1"
      },
      {
        "id": "project2",
        "path": "/home/ats/files/customers/customer1/projects/project2"
      }
    ]
  }
}
```

### GET /api/customers/:customerName/projects (List all projects)

```json
{
  "success": true,
  "data": {
    "customerName": "customer1",
    "projects": [
      {
        "id": "project1",
        "path": "/home/ats/files/customers/customer1/projects/project1",
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
        "path": "/home/ats/files/customers/customer1/projects/project2",
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

### GET /api/customers/:customerName/projects/:projectId (Get project details)

```json
{
  "success": true,
  "data": {
    "customerName": "customer1",
    "projectId": "project1",
    "path": "/home/ats/files/customers/customer1/projects/project1",
    "files": {
      "config": true,
      "status": true,
      "ring": true,
      "output": true
    },
    "ready": true,
    "outputFileCount": 5
  }
}
```

### GET /api/customers/:customerName/projects/:projectId/config (Get config)

```json
{
  "success": true,
  "data": {
    "customerName": "customer1",
    "projectId": "project1",
    "config": {
      "customer_name": "test",
      "hss_ring_output": "/home/ats/files/customers/customer1/projects/project1/hsstool_ring.txt",
      "hss_status_output": "/home/ats/files/customers/customer1/projects/project1/hsstool_status.txt",
      "dc_for_nodes": ["dc-1;3;129;3,1;rack-1:3"],
      "nodes_to_add": ["cloudian-node4:dc-1:rack-1"],
      "region": "region-1",
      "cumulative": "false",
      "output_dir": "/home/ats/files/customers/customer1/projects/project1/output/"
    },
    "yaml": "customer_name: test\n..."
  }
}
```

### GET /api/customers/:customerName/projects/:projectId/output (Get simulation output)

```json
{
  "success": true,
  "data": {
    "customerName": "customer1",
    "projectId": "project1",
    "output": {
      "files": [
        {
          "filename": "output1.txt",
          "content": "Simulation output content..."
        },
        {
          "filename": "output2.txt",
          "content": "More simulation output..."
        }
      ],
      "fileCount": 2
    },
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST /api/customers/:customerName/projects/:projectId/run (Run simulation)

```json
{
  "success": true,
  "message": "Simulation executed successfully for project 'project1'",
  "data": {
    "customerName": "customer1",
    "projectId": "project1",
    "execution": {
      "stdout": "Simulation output...",
      "stderr": null,
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### Error Example (404 Not Found)

```json
{
  "success": false,
  "error": {
    "name": "AppError",
    "message": "Customer 'nonexistent' not found",
    "statusCode": 404
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Example (400 Bad Request)

```json
{
  "success": false,
  "error": {
    "name": "AppError",
    "message": "Customer name is required",
    "statusCode": 400
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Benefits for Web UI Integration

1. **Consistent Structure**: All responses follow the same pattern, making it easy to handle programmatically
2. **Success Indicator**: The `success` boolean field allows quick check of response status
3. **Data Nesting**: All response data is nested under `data`, making it easy to extract
4. **Error Handling**: Errors are consistently structured with clear messages and status codes
5. **Metadata**: Counts, timestamps, and other metadata are included where relevant
6. **Ready State**: Projects include a `ready` boolean indicating if all required files are present
7. **File Status**: Detailed file existence information helps build UI indicators

## Usage in Web Applications

### JavaScript/TypeScript Example

```typescript
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  error?: {
    name: string;
    message: string;
    statusCode: number;
  };
  timestamp?: string;
}

async function getCustomers(): Promise<Customer[]> {
  const response = await fetch('/api/customers', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const result: ApiResponse<{ customers: Customer[] }> = await response.json();
  
  if (result.success && result.data) {
    return result.data.customers;
  } else {
    throw new Error(result.error?.message || 'Unknown error');
  }
}
```

### React Example

```typescript
const [customers, setCustomers] = useState<Customer[]>([]);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  fetch('/api/customers', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then((result: ApiResponse<{ customers: Customer[] }>) => {
      if (result.success && result.data) {
        setCustomers(result.data.customers);
      } else {
        setError(result.error?.message || 'Failed to load customers');
      }
    })
    .catch(err => setError(err.message));
}, []);
```

