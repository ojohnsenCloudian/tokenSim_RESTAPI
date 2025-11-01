// TypeScript type definitions

export interface ConfigYaml {
  customer_name: string;
  hss_ring_output: string;
  hss_status_output: string;
  dc_for_nodes: string[];
  nodes_to_add: string[];
  region: string;
  cumulative?: string;
  output_dir: string;
}

export interface CreateCustomerRequest {
  customerName: string;
}

export interface CreateProjectRequest {
  projectId: string;
}

export interface UpdateCustomerRequest {
  customerName: string;
}

export interface UpdateProjectRequest {
  projectId: string;
}

export interface CreateConfigRequest {
  customer_name: string;
  dc_for_nodes: string[];
  nodes_to_add: string[];
  region: string;
  cumulative?: string;
}

export interface ApiError {
  name: string;
  message: string;
  statusCode: number;
}

export interface ParsedFile {
  filename: string;
  type: string;
  data: any;
  metadata?: {
    lineCount?: number;
    tokenCount?: number;
    ipCount?: number;
    format?: string;
    parseError?: string;
    [key: string]: any;
  };
}

export interface SimulationOutput {
  parsed: {
    files: ParsedFile[];
    summary: {
      totalFiles: number;
      txtFiles: number;
      jsonFiles: number;
      fileTypes: string[];
    };
  };
  data: {
    nodes: Array<{
      ip: string;
      name: string;
      hostname: string;
      datacenter: string;
      region?: string;
      rack?: string;
      tokens: string[];
      tokenCount: number;
    }>;
    datacenters: Record<string, string[]>;
    hostnames: Record<string, string>;
    tokenMappings: Array<{
      token: string;
      ip: string;
    }>;
    summary: {
      totalNodes: number;
      totalTokens: number;
      totalDatacenters: number;
    };
  };
}
