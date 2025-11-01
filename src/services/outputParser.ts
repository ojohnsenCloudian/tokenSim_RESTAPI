// Output file parsing service

import * as fs from 'fs-extra';
import * as path from 'path';
import { FileManager } from './fileManager';
import { ParsedFile, SimulationOutput } from '../types';

export class OutputParser {
  private fileManager: FileManager;

  constructor() {
    this.fileManager = new FileManager();
  }

  private detectFileType(filename: string): string {
    const lower = filename.toLowerCase();
    
    if (lower.includes('hostname')) return 'hostname';
    if (lower.includes('dc') || lower.includes('datacenter')) return 'dc';
    if (lower.includes('tokenmap')) return 'tokenmap';
    if (lower.includes('emea_token')) return 'emea_token';
    if (lower.includes('all_tokens')) return 'all_tokens';
    if (lower.includes('ip_tokens') || /^\d+\.\d+\.\d+\.\d+/.test(filename)) return 'ip_tokens';
    if (lower.includes('token_list')) return 'token_list';
    if (lower.endsWith('.json')) return 'json';
    
    return 'unknown';
  }

  private parseHostname(content: string): any {
    const lines = content.split('\n').filter(line => line.trim());
    const hostnames: Record<string, string> = {};
    
    for (const line of lines) {
      const parts = line.split(':').map(p => p.trim());
      if (parts.length >= 2) {
        const ip = parts[0];
        const hostname = parts.slice(1).join(':');
        hostnames[ip] = hostname;
      }
    }
    
    return { hostnames, format: 'ip:hostname' };
  }

  private parseDatacenter(content: string): any {
    const lines = content.split('\n').filter(line => line.trim());
    const datacenters: Record<string, string[]> = {};
    
    for (const line of lines) {
      const parts = line.split(':').map(p => p.trim());
      if (parts.length >= 2) {
        const dc = parts[0];
        const ips = parts.slice(1).join(':').split(',').map(ip => ip.trim());
        datacenters[dc] = ips;
      }
    }
    
    return { datacenters, format: 'dc:ip1,ip2,...' };
  }

  private parseTokenmap(content: string): any {
    const lines = content.split('\n').filter(line => line.trim());
    const mappings: Array<{ token: string; ip: string }> = [];
    
    for (const line of lines) {
      const parts = line.split(/\s+/).filter(p => p.trim());
      if (parts.length >= 2) {
        mappings.push({
          token: parts[0],
          ip: parts[1],
        });
      }
    }
    
    return { tokenMappings: mappings, format: 'token ip' };
  }

  private parseEmeaToken(content: string): any {
    const lines = content.split('\n').filter(line => line.trim());
    const tokens: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        tokens.push(trimmed);
      }
    }
    
    return { tokens, format: 'one-per-line' };
  }

  private parseAllTokens(content: string): any {
    const lines = content.split('\n').filter(line => line.trim());
    const tokens: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        tokens.push(trimmed);
      }
    }
    
    return { tokens, format: 'one-per-line' };
  }

  private parseIpTokens(filename: string, content: string): any {
    const lines = content.split('\n').filter(line => line.trim());
    const tokens: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        tokens.push(trimmed);
      }
    }
    
    // Extract IP from filename if possible
    const ipMatch = filename.match(/^(\d+\.\d+\.\d+\.\d+)/);
    const ip = ipMatch ? ipMatch[1] : '';
    
    return { ip, tokens, format: 'one-per-line' };
  }

  private parseTokenList(content: string): any {
    const lines = content.split('\n').filter(line => line.trim());
    const tokens: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        tokens.push(trimmed);
      }
    }
    
    return { tokens, format: 'one-per-line' };
  }

  private async parseFile(filename: string, content: string): Promise<ParsedFile> {
    const fileType = this.detectFileType(filename);
    let data: any = {};
    let metadata: any = {};

    try {
      if (fileType === 'json') {
        try {
          data = JSON.parse(content);
          metadata = { format: 'json' };
        } catch (e) {
          data = { raw: content };
          metadata = { format: 'json', parseError: 'Invalid JSON' };
        }
      } else if (fileType === 'hostname') {
        const parsed = this.parseHostname(content);
        data = parsed;
        metadata = { format: parsed.format, lineCount: content.split('\n').length };
      } else if (fileType === 'dc') {
        const parsed = this.parseDatacenter(content);
        data = parsed;
        metadata = { format: parsed.format, lineCount: content.split('\n').length };
      } else if (fileType === 'tokenmap') {
        const parsed = this.parseTokenmap(content);
        data = parsed;
        metadata = { format: parsed.format, tokenCount: parsed.tokenMappings.length };
      } else if (fileType === 'emea_token') {
        const parsed = this.parseEmeaToken(content);
        data = parsed;
        metadata = { format: parsed.format, tokenCount: parsed.tokens.length };
      } else if (fileType === 'all_tokens') {
        const parsed = this.parseAllTokens(content);
        data = parsed;
        metadata = { format: parsed.format, tokenCount: parsed.tokens.length };
      } else if (fileType === 'ip_tokens') {
        const parsed = this.parseIpTokens(filename, content);
        data = parsed;
        metadata = { format: parsed.format, tokenCount: parsed.tokens.length, ipCount: parsed.ip ? 1 : 0 };
      } else if (fileType === 'token_list') {
        const parsed = this.parseTokenList(content);
        data = parsed;
        metadata = { format: parsed.format, tokenCount: parsed.tokens.length };
      } else {
        data = { raw: content };
        metadata = { format: 'unknown' };
      }
    } catch (error: any) {
      data = { raw: content };
      metadata = { parseError: error.message };
    }

    return {
      filename,
      type: fileType,
      data,
      metadata,
    };
  }

  private buildUnifiedModel(parsedFiles: ParsedFile[]): SimulationOutput['data'] {
    const nodes: SimulationOutput['data']['nodes'] = [];
    const datacenters: Record<string, string[]> = {};
    const hostnames: Record<string, string> = {};
    const tokenMappings: Array<{ token: string; ip: string }> = [];
    const ipToTokens: Record<string, string[]> = {};

    // Process hostname files
    for (const file of parsedFiles) {
      if (file.type === 'hostname' && file.data.hostnames) {
        Object.assign(hostnames, file.data.hostnames);
      }
    }

    // Process datacenter files
    for (const file of parsedFiles) {
      if (file.type === 'dc' && file.data.datacenters) {
        Object.assign(datacenters, file.data.datacenters);
      }
    }

    // Process tokenmap files
    for (const file of parsedFiles) {
      if (file.type === 'tokenmap' && file.data.tokenMappings) {
        tokenMappings.push(...file.data.tokenMappings);
      }
    }

    // Process IP token files
    for (const file of parsedFiles) {
      if (file.type === 'ip_tokens' && file.data.ip && file.data.tokens) {
        ipToTokens[file.data.ip] = file.data.tokens;
      }
    }

    // Build nodes from token mappings and IP tokens
    const ipSet = new Set<string>();
    tokenMappings.forEach(m => ipSet.add(m.ip));
    Object.keys(ipToTokens).forEach(ip => ipSet.add(ip));

    for (const ip of ipSet) {
      const hostname = hostnames[ip] || ip;
      const [name, rack] = hostname.split(':');
      const tokens = ipToTokens[ip] || tokenMappings.filter(m => m.ip === ip).map(m => m.token);

      // Find datacenter for this IP
      let datacenter = '';
      for (const [dc, ips] of Object.entries(datacenters)) {
        if (ips.includes(ip)) {
          datacenter = dc;
          break;
        }
      }

      nodes.push({
        ip,
        name: name || ip,
        hostname: hostname || ip,
        datacenter: datacenter || 'unknown',
        rack: rack || '',
        tokens,
        tokenCount: tokens.length,
      });
    }

    return {
      nodes,
      datacenters,
      hostnames,
      tokenMappings,
      summary: {
        totalNodes: nodes.length,
        totalTokens: nodes.reduce((sum, node) => sum + node.tokenCount, 0),
        totalDatacenters: Object.keys(datacenters).length,
      },
    };
  }

  /**
   * Parse terminal output from simulation execution
   */
  parseTerminalOutput(stdout: string, stderr?: string): {
    success: boolean;
    output: {
      raw: string;
      structured: {
        cumulativeMode?: boolean;
        dataCenters?: Array<{
          name: string;
          storagePolicy: string;
          policyDescription?: string;
          hosts: Array<{
            host: string;
            isNew?: boolean;
            hostDataOwnershipRawTB: number;
            numberOfTokens: number;
            averageDataOwnershipPerVNodeRawTB: number;
            deviationPercent?: number;
          }>;
          summary: {
            highestAverage: {
              value: number;
              host: string;
            };
            lowestAverage: {
              value: number;
              host: string;
            };
            dataCenterAverage: number;
            hostsDeviating: number;
            deviatingHosts: string[];
            maxDeviationDegree: number;
            hasImbalance: boolean;
            imbalanceMessage?: string;
          };
        }>;
        errors?: string[];
        warnings?: string[];
      };
      errors?: string[];
      warnings?: string[];
    };
  } {
    const output: any = {
      raw: stdout,
      structured: {
        dataCenters: [],
      },
      errors: [],
      warnings: [],
    };

    // Extract cumulative mode
    const cumulativeMatch = stdout.match(/Cumulative mode:\s*(true|false)/i);
    if (cumulativeMatch) {
      output.structured.cumulativeMode = cumulativeMatch[1].toLowerCase() === 'true';
    }

    // Extract errors from stderr
    if (stderr) {
      const errorLines = stderr.split('\n').filter(line => 
        line.trim() && 
        (line.toLowerCase().includes('error') || 
         line.toLowerCase().includes('failed') ||
         line.toLowerCase().includes('exception'))
      );
      output.errors = errorLines;
      output.structured.errors = errorLines;
    }

    // Extract errors from stdout (like ERROR StatusLogger)
    const stdoutErrors = stdout.split('\n').filter(line =>
      line.trim() &&
      line.match(/^ERROR\s+/i)
    );
    if (stdoutErrors.length > 0) {
      output.structured.errors = (output.structured.errors || []).concat(stdoutErrors);
    }

    // Extract warnings from stdout
    const warningLines = stdout.split('\n').filter(line =>
      line.trim() &&
      line.toLowerCase().includes('warning') &&
      !line.toLowerCase().includes('no warnings')
    );
    if (warningLines.length > 0) {
      output.warnings = warningLines;
      output.structured.warnings = warningLines;
    }

    // Parse data center sections
    const sections = stdout.split(/\n(?=Cumulative mode:|Data Center:)/i);
    
    sections.forEach(section => {
      // Extract data center name
      const dcMatch = section.match(/Data Center:\s*([^\n]+)/i);
      if (!dcMatch) return;

      const dcName = dcMatch[1].trim();
      const dcData: any = {
        name: dcName,
        hosts: [],
        summary: {},
      };

      // Extract storage policy
      const policyMatch = section.match(/Storage Policy:\s*([^\n]+)/i);
      if (policyMatch) {
        dcData.storagePolicy = policyMatch[1].trim();
      }

      // Extract policy description
      const policyDescMatch = section.match(/With\s+([^\n]+?)\s+storage policy,([^\n]+)/i);
      if (policyDescMatch) {
        dcData.policyDescription = (policyDescMatch[1] + ',' + policyDescMatch[2]).trim();
      }

      // Parse host table
      // Look for table lines with IP addresses or hostnames
      const lines = section.split('\n');
      let inTable = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Detect table start (line with "Host" header)
        if (line.includes('Host') && line.includes('Host Data Ownership') && line.includes('Number of Tokens')) {
          inTable = true;
          continue;
        }

        // Parse table rows (lines with IP addresses or hostnames followed by numbers)
        // Match: *hostname or IP, then numbers (ownership, tokens, average, deviation)
        const hostRowMatch = line.match(/^(\*?)([\d.]+(?:_[^\s]+)?|[a-zA-Z0-9._-]+)\s+(\d+\.\d+)\s+(\d+)\s+(\d+\.\d+)\s*(?:\(([+-]\d+\.\d+)%\))?/);
        if (inTable && hostRowMatch) {
          const isNew = hostRowMatch[1] === '*';
          const host = hostRowMatch[2];
          const ownership = parseFloat(hostRowMatch[3]);
          const tokens = parseInt(hostRowMatch[4], 10);
          const average = parseFloat(hostRowMatch[5]);
          const deviation = hostRowMatch[6] ? parseFloat(hostRowMatch[6]) : undefined;

          const hostData: any = {
            host,
            isNew,
            hostDataOwnershipRawTB: ownership,
            numberOfTokens: tokens,
            averageDataOwnershipPerVNodeRawTB: average,
          };

          if (deviation !== undefined) {
            hostData.deviationPercent = deviation;
          }

          dcData.hosts.push(hostData);
        }

        // Detect table end (empty line or summary line)
        if (inTable && (line === '' || line.includes('Highest average') || line.includes('Lowest average'))) {
          inTable = false;
        }
      }

      // Extract summary information
      const highestMatch = section.match(/Highest average data ownership per vNode on a host:\s*([\d.]+)\s+TB\s+\(([^)]+)\)/i);
      if (highestMatch) {
        dcData.summary.highestAverage = {
          value: parseFloat(highestMatch[1]),
          host: highestMatch[2].trim(),
        };
      }

      const lowestMatch = section.match(/Lowest average data ownership per vNode on a host:\s*([\d.]+)\s+TB\s+\(([^)]+)\)/i);
      if (lowestMatch) {
        dcData.summary.lowestAverage = {
          value: parseFloat(lowestMatch[1]),
          host: lowestMatch[2].trim(),
        };
      }

      const avgMatch = section.match(/Data center average data ownership per vNode:\s*([\d.]+)\s+TB/i);
      if (avgMatch) {
        dcData.summary.dataCenterAverage = parseFloat(avgMatch[1]);
      }

      const deviatingMatch = section.match(/Number of hosts deviating from data center average by more than\s+([\d.]+)%:\s*(\d+)\s*\(([^)]+)\)/i);
      if (deviatingMatch) {
        dcData.summary.hostsDeviating = parseInt(deviatingMatch[2], 10);
        const hostsList = deviatingMatch[3].split(',').map(h => h.trim());
        dcData.summary.deviatingHosts = hostsList;
      }

      const maxDevMatch = section.match(/Max deviation degree:\s*([\d.]+)%/i);
      if (maxDevMatch) {
        dcData.summary.maxDeviationDegree = parseFloat(maxDevMatch[1]);
      }

      const imbalanceMatch = section.match(/the simulation projects a data imbalance of greater than\s+([\d.]+)%/i);
      if (imbalanceMatch) {
        dcData.summary.hasImbalance = true;
        dcData.summary.imbalanceMessage = `Data imbalance of greater than ${imbalanceMatch[1]}%`;
      } else {
        dcData.summary.hasImbalance = false;
      }

      if (dcData.hosts.length > 0) {
        output.structured.dataCenters.push(dcData);
      }
    });

    return {
      success: !stderr || stderr.trim().length === 0,
      output,
    };
  }

  async parseOutput(
    customerName: string,
    projectId: string
  ): Promise<SimulationOutput> {
    const outputPath = this.fileManager.getOutputPath(customerName, projectId);
    
    if (!(await this.fileManager.fileExists(outputPath))) {
      return {
        parsed: {
          files: [],
          summary: {
            totalFiles: 0,
            txtFiles: 0,
            jsonFiles: 0,
            fileTypes: [],
          },
        },
        data: {
          nodes: [],
          datacenters: {},
          hostnames: {},
          tokenMappings: [],
          summary: {
            totalNodes: 0,
            totalTokens: 0,
            totalDatacenters: 0,
          },
        },
      };
    }

    const files = await this.fileManager.listFiles(outputPath);
    const parsedFiles: ParsedFile[] = [];

    for (const filename of files) {
      const filePath = path.join(outputPath, filename);
      const content = await this.fileManager.readFile(filePath);
      const parsed = await this.parseFile(filename, content);
      parsedFiles.push(parsed);
    }

    const fileTypes = [...new Set(parsedFiles.map(f => f.type))];
    const txtFiles = parsedFiles.filter(f => f.filename.endsWith('.txt')).length;
    const jsonFiles = parsedFiles.filter(f => f.filename.endsWith('.json')).length;

    const unifiedData = this.buildUnifiedModel(parsedFiles);

    return {
      parsed: {
        files: parsedFiles,
        summary: {
          totalFiles: files.length,
          txtFiles,
          jsonFiles,
          fileTypes,
        },
      },
      data: unifiedData,
    };
  }
}