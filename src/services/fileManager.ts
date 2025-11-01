// File system operations service

import * as fs from 'fs-extra';
import * as path from 'path';
import { config } from '../utils/config';

export class FileManager {
  private basePath: string;

  constructor() {
    this.basePath = config.volumePath;
  }

  // Customer path methods
  getCustomerPath(customerName: string): string {
    return path.join(this.basePath, 'customers', customerName);
  }

  async customerExists(customerName: string): Promise<boolean> {
    const customerPath = this.getCustomerPath(customerName);
    return await fs.pathExists(customerPath);
  }

  async createCustomer(customerName: string): Promise<void> {
    const customerPath = this.getCustomerPath(customerName);
    await fs.ensureDir(customerPath);
  }

  async deleteCustomer(customerName: string): Promise<void> {
    const customerPath = this.getCustomerPath(customerName);
    await fs.remove(customerPath);
  }

  async renameCustomer(oldName: string, newName: string): Promise<void> {
    const oldPath = this.getCustomerPath(oldName);
    const newPath = this.getCustomerPath(newName);
    await fs.move(oldPath, newPath);
  }

  async listCustomers(): Promise<string[]> {
    const customersDir = path.join(this.basePath, 'customers');
    if (!(await fs.pathExists(customersDir))) {
      return [];
    }
    const entries = await fs.readdir(customersDir);
    const customers: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(customersDir, entry);
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        customers.push(entry);
      }
    }
    return customers.sort();
  }

  // Project path methods
  getProjectPath(customerName: string, projectId: string): string {
    return path.join(this.basePath, 'customers', customerName, 'projects', projectId);
  }

  async projectExists(customerName: string, projectId: string): Promise<boolean> {
    const projectPath = this.getProjectPath(customerName, projectId);
    return await fs.pathExists(projectPath);
  }

  async createProject(customerName: string, projectId: string): Promise<void> {
    const projectPath = this.getProjectPath(customerName, projectId);
    await fs.ensureDir(projectPath);
    // Create output directory
    const outputPath = path.join(projectPath, 'output');
    await fs.ensureDir(outputPath);
  }

  async deleteProject(customerName: string, projectId: string): Promise<void> {
    const projectPath = this.getProjectPath(customerName, projectId);
    await fs.remove(projectPath);
  }

  async renameProject(
    customerName: string,
    oldProjectId: string,
    newProjectId: string
  ): Promise<void> {
    const oldPath = this.getProjectPath(customerName, oldProjectId);
    const newPath = this.getProjectPath(customerName, newProjectId);
    await fs.move(oldPath, newPath);
  }

  async listProjects(customerName: string): Promise<string[]> {
    const projectsDir = path.join(
      this.basePath,
      'customers',
      customerName,
      'projects'
    );
    if (!(await fs.pathExists(projectsDir))) {
      return [];
    }
    const entries = await fs.readdir(projectsDir);
    const projects: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(projectsDir, entry);
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        projects.push(entry);
      }
    }
    return projects.sort();
  }

  // File path methods
  getConfigPath(customerName: string, projectId: string): string {
    return path.join(this.getProjectPath(customerName, projectId), 'config.yaml');
  }

  getStatusPath(customerName: string, projectId: string): string {
    return path.join(this.getProjectPath(customerName, projectId), 'hsstool_status.txt');
  }

  getRingPath(customerName: string, projectId: string): string {
    return path.join(this.getProjectPath(customerName, projectId), 'hsstool_ring.txt');
  }

  getOutputPath(customerName: string, projectId: string): string {
    return path.join(this.getProjectPath(customerName, projectId), 'output');
  }

  // File operations
  async fileExists(filePath: string): Promise<boolean> {
    return await fs.pathExists(filePath);
  }

  async readFile(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async listFiles(dirPath: string): Promise<string[]> {
    if (!(await fs.pathExists(dirPath))) {
      return [];
    }
    const entries = await fs.readdir(dirPath);
    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const stat = await fs.stat(fullPath);
      if (stat.isFile()) {
        files.push(entry);
      }
    }
    return files.sort();
  }
}
