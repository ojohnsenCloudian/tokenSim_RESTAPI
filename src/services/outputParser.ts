// Output parser service - converts .txt files to JSON

import * as fs from 'fs-extra';
import * as path from 'path';
import { FileManager } from './fileManager';
import { SimulationOutput } from '../types';
import { AppError } from '../utils/errors';

interface ParsedFile {
  filename: string;
  type: string;
  data: any;
  metadata?: {
    lineCount?: number;
    tokenCount?: number;
    ipCount?: number;
  };
}

export class OutputParser {
  private fileManager: FileManager;

  constructor() {
    this.fileManager = new FileManager();
  }

  /**
   * Detect file type based on filename
   */
  private detectFileType(filename: string): string {
    const lowerFilename = filename.toLowerCase();
    
    if (lowerFilename.includes('hostname')) {
      return 'hostname';
    }
    if (lowerFilename.includes('tokenmap')) {
      return 'tokenmap';
    }
    if (lowerFilename.includes('token') && lowerFilename.includes('emea')) {
      return 'emea_token';
    }
    if (lowerFilename.includes('dc') && lowerFilename.includes('emea')) {
      return 'emea_dc';
    }
    if (lowerFilename.includes('dc') && !lowerFilename.includes('emea')) {
      return 'dc';
    }
    if (lowerFilename.includes('all-tokens')) {
      return 'all_tokens';
    }
    // IP address files: 192.168.202.212.txt or 1.1.1.1_Logiq_th2_th2.txt
    if (/^\d+\.\d+\.\d+\.\d+\.txt$/i.test(filename)) {
      return 'ip_tokens';
    }
    if (/^\d+\.\d+\.\d+\.\d+_/i.test(filename)) {
      return 'ip_tokens';
    }
    
    return 'token_list';
  }

  /**
   * Parse hostname file (IP=hostname:rack)
   */
  private parseHostname(content: string): any {
    const lines = content.trim().split('\n').filter(line => line.trim());
    const result: Record<string, string> = {};
    
    lines.forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        result[key.trim()] = value.trim();
      }
    });
    
    return {
      format: 'key_value',
      mappings: result,
      entries: Object.keys(result).map(ip => ({
        ip,
        hostname: result[ip].split(':')[0],
        rack: result[ip].split(':')[1] || null,
      })),
    };
  }

  /**
   * Parse datacenter file (dc=IP1,IP2,IP3)
   */
  private parseDatacenter(content: string): any {
    const lines = content.trim().split('\n').filter(line => line.trim());
    const result: Record<string, string[]> = {};
    
    lines.forEach(line => {
      const [dc, ips] = line.split('=');
      if (dc && ips) {
        result[dc.trim()] = ips.split(',').map(ip => ip.trim()).filter(ip => ip);
      }
    });
    
    return {
      format: 'datacenter_mapping',
      datacenters: result,
      entries: Object.keys(result).map(dc => ({
        datacenter: dc,
        ips: result[dc],
        ipCount: result[dc].length,
      })),
    };
  }

  /**
   * Parse tokenmap file (token=IP,)
   */
  private parseTokenmap(content: string): any {
    const lines = content.trim().split('\n').filter(line => line.trim());
    const mappings: Array<{ token: string; ip: string }> = [];
    
    lines.forEach(line => {
      const match = line.match(/^(\d+)=([^,]+)/);
      if (match) {
        mappings.push({
          token: match[1],
          ip: match[2].trim(),
        });
      }
    });
    
    // Group by IP
    const byIp: Record<string, string[]> = {};
    mappings.forEach(m => {
      if (!byIp[m.ip]) {
        byIp[m.ip] = [];
      }
      byIp[m.ip].push(m.token);
    });
    
    return {
      format: 'token_to_ip',
      mappings,
      byIp: Object.keys(byIp).map(ip => ({
        ip,
        tokens: byIp[ip],
        tokenCount: byIp[ip].length,
      })),
      totalMappings: mappings.length,
    };
  }

  /**
   * Parse emea_token file (single line: token=IP, token=IP, ...)
   */
  private parseEmeaToken(content: string): any {
    const line = content.trim();
    const mappings: Array<{ token: string; ip: string }> = [];
    
    // Split by comma and parse each token=IP pair
    const pairs = line.split(',').map(p => p.trim()).filter(p => p);
    
    pairs.forEach(pair => {
      const match = pair.match(/^(\d+)=([^,]+)$/);
      if (match) {
        mappings.push({
          token: match[1],
          ip: match[2].trim(),
        });
      }
    });
    
    // Group by IP
    const byIp: Record<string, string[]> = {};
    mappings.forEach(m => {
      if (!byIp[m.ip]) {
        byIp[m.ip] = [];
      }
      byIp[m.ip].push(m.token);
    });
    
    return {
      format: 'token_to_ip',
      mappings,
      byIp: Object.keys(byIp).map(ip => ({
        ip,
        tokens: byIp[ip],
        tokenCount: byIp[ip].length,
      })),
      totalMappings: mappings.length,
    };
  }

  /**
   * Parse all-tokens file (token|IP, one per line)
   */
  private parseAllTokens(content: string): any {
    const lines = content.trim().split('\n').filter(line => line.trim());
    const mappings: Array<{ token: string; ip: string }> = [];
    
    lines.forEach(line => {
      const parts = line.split('|');
      if (parts.length === 2) {
        mappings.push({
          token: parts[0].trim(),
          ip: parts[1].trim(),
        });
      }
    });
    
    // Group by IP
    const byIp: Record<string, string[]> = {};
    mappings.forEach(m => {
      if (!byIp[m.ip]) {
        byIp[m.ip] = [];
      }
      byIp[m.ip].push(m.token);
    });
    
    return {
      format: 'token_to_ip',
      mappings,
      byIp: Object.keys(byIp).map(ip => ({
        ip,
        tokens: byIp[ip],
        tokenCount: byIp[ip].length,
      })),
      totalMappings: mappings.length,
    };
  }

  /**
   * Parse token list file (comma-separated tokens)
   */
  private parseTokenList(content: string, filename: string): any {
    const line = content.trim();
    const tokens = line.split(',').map(t => t.trim()).filter(t => t);
    
    return {
      format: 'token_list',
      source: filename,
      tokens,
      tokenCount: tokens.length,
    };
  }

  /**
   * Parse a single file based on its type
   */
  private parseFile(filename: string, content: string): ParsedFile {
    const fileType = this.detectFileType(filename);
    let data: any;
    let metadata: any = {};

    switch (fileType) {
      case 'hostname':
        data = this.parseHostname(content);
        metadata.lineCount = content.trim().split('\n').filter(l => l.trim()).length;
        break;
      
      case 'dc':
      case 'emea_dc':
        data = this.parseDatacenter(content);
        metadata.lineCount = content.trim().split('\n').filter(l => l.trim()).length;
        break;
      
      case 'tokenmap':
        data = this.parseTokenmap(content);
        metadata.lineCount = content.trim().split('\n').filter(l => l.trim()).length;
        metadata.tokenCount = data.totalMappings;
        metadata.ipCount = data.byIp.length;
        break;
      
      case 'emea_token':
        data = this.parseEmeaToken(content);
        metadata.tokenCount = data.totalMappings;
        metadata.ipCount = data.byIp.length;
        break;
      
      case 'all_tokens':
        data = this.parseAllTokens(content);
        metadata.lineCount = content.trim().split('\n').filter(l => l.trim()).length;
        metadata.tokenCount = data.totalMappings;
        metadata.ipCount = data.byIp.length;
        break;
      
      case 'ip_tokens':
      case 'token_list':
        data = this.parseTokenList(content, filename);
        metadata.tokenCount = data.tokenCount;
        break;
      
      default:
        // Fallback: try to parse as token list
        data = this.parseTokenList(content, filename);
        metadata.tokenCount = data.tokenCount;
    }

    return {
      filename,
      type: fileType,
      data,
      metadata,
    };
  }

  /**
   * Build unified data model from all parsed files
   */
  private buildUnifiedModel(parsedFiles: ParsedFile[], jsonData: ParsedFile[]): any {
    const model: any = {
      nodes: [],
      datacenters: {},
      hostnames: {},
      tokenMappings: [],
      summary: {
        totalNodes: 0,
        totalTokens: 0,
        totalDatacenters: 0,
      },
    };

    // Extract hostname mappings
    const hostnameFiles = parsedFiles.filter(f => f.type === 'hostname');
    hostnameFiles.forEach(file => {
      if (file.data.mappings) {
        Object.assign(model.hostnames, file.data.mappings);
      }
    });

    // Extract datacenter mappings
    const dcFiles = parsedFiles.filter(f => f.type === 'dc' || f.type === 'emea_dc');
    dcFiles.forEach(file => {
      if (file.data.datacenters) {
        Object.assign(model.datacenters, file.data.datacenters);
      }
    });

    // Extract token mappings
    const tokenFiles = parsedFiles.filter(f => 
      f.type === 'tokenmap' || f.type === 'emea_token' || f.type === 'all_tokens'
    );
    tokenFiles.forEach(file => {
      if (file.data.mappings) {
        model.tokenMappings.push(...file.data.mappings);
      }
    });

    // Build nodes from IP token files and hostname mappings
    const ipTokenFiles = parsedFiles.filter(f => f.type === 'ip_tokens');
    ipTokenFiles.forEach(file => {
      const ip = this.extractIPFromFilename(file.filename);
      if (ip && file.data.tokens) {
        const hostnameInfo = model.hostnames[ip] || '';
        const [hostname, rack] = hostnameInfo.split(':');
        
        // Find datacenter for this IP
        let datacenter = null;
        for (const [dc, ips] of Object.entries(model.datacenters)) {
          if (Array.isArray(ips) && ips.includes(ip)) {
            datacenter = dc;
            break;
          }
        }

        // Extract region from filename if available
        let region = 'emea'; // default
        if (file.filename.toLowerCase().includes('emea')) {
          region = 'emea';
        }

        model.nodes.push({
          ip,
          name: hostname || ip,
          hostname: hostname || null,
          datacenter: datacenter,
          region: region,
          rack: rack || 'rack',
          tokens: file.data.tokens,
          tokenCount: file.data.tokens.length,
        });
      }
    });

    // If JSON files exist, merge their node data
    jsonData.forEach(file => {
      if (file.type === 'json' && file.data.nodes) {
        // Merge with existing nodes or use JSON structure
        if (Array.isArray(file.data.nodes)) {
          model.nodes = file.data.nodes;
        }
      }
    });

    // Calculate summary
    model.summary.totalNodes = model.nodes.length;
    model.summary.totalTokens = model.nodes.reduce((sum: number, node: any) => 
      sum + (node.tokens?.length || 0), 0);
    model.summary.totalDatacenters = Object.keys(model.datacenters).length;

    return model;
  }

  /**
   * Extract IP address from filename
   */
  private extractIPFromFilename(filename: string): string | null {
    // Match IP pattern: 192.168.202.212 or 192.168.202.212.txt
    const match = filename.match(/^(\d+\.\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Parse all .txt files from output directory into JSON
   */
  async parseOutput(customerName: string, projectId: string): Promise<SimulationOutput> {
    const outputPath = this.fileManager.getOutputPath(customerName, projectId);

    // Check if output directory exists
    if (!(await this.fileManager.fileExists(outputPath))) {
      throw new AppError(
        `Output directory does not exist for project '${projectId}'`,
        404
      );
    }

    try {
      // List all .txt files in output directory
      const allFiles = await this.fileManager.listFiles(outputPath);
      const txtFiles = allFiles.filter((file) => file.endsWith('.txt'));

      if (txtFiles.length === 0) {
        throw new AppError(
          `No output files found for project '${projectId}'. Run simulation first.`,
          404
        );
      }

      // Also check for .json files
      const jsonFiles = allFiles.filter((file) => file.endsWith('.json'));

      // Parse all files
      const parsedFiles = await Promise.all(
        txtFiles.map(async (filePath) => {
          const content = await this.fileManager.readFile(filePath);
          const filename = path.basename(filePath);
          return this.parseFile(filename, content);
        })
      );

      // Load JSON files if they exist
      const jsonData = await Promise.all(
        jsonFiles.map(async (filePath) => {
          const content = await this.fileManager.readFile(filePath);
          const filename = path.basename(filePath);
          try {
            return {
              filename,
              type: 'json',
              data: JSON.parse(content),
              metadata: {
                format: 'json',
              },
            };
          } catch (error) {
            return {
              filename,
              type: 'json',
              data: { raw: content },
              metadata: {
                format: 'json',
                parseError: 'Invalid JSON',
              },
            };
          }
        })
      );

      // Organize files by type
      const organized: Record<string, ParsedFile[]> = {};
      [...parsedFiles, ...jsonData].forEach(file => {
        if (!organized[file.type]) {
          organized[file.type] = [];
        }
        organized[file.type].push(file);
      });

      // Build unified data model
      const unifiedModel = this.buildUnifiedModel(parsedFiles, jsonData);

      return {
        parsed: {
          files: [...parsedFiles, ...jsonData],
          organized,
          summary: {
            totalFiles: parsedFiles.length + jsonData.length,
            txtFiles: parsedFiles.length,
            jsonFiles: jsonFiles.length,
            fileTypes: Object.keys(organized),
          },
        },
        data: unifiedModel,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to parse output: ${error}`, 500);
    }
  }

  /**
   * Get a specific output file by name
   */
  async getOutputFile(
    customerName: string,
    projectId: string,
    filename: string
  ): Promise<string> {
    const outputPath = this.fileManager.getOutputPath(customerName, projectId);
    const filePath = path.join(outputPath, filename);

    if (!(await this.fileManager.fileExists(filePath))) {
      throw new AppError(`Output file '${filename}' not found`, 404);
    }

    return await this.fileManager.readFile(filePath);
  }
}
