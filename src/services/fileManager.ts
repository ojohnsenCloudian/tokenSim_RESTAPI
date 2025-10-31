// File system operations service

import * as fs from 'fs-extra';
import * as path from 'path';
import { config } from '../utils/config';
import { AppError } from '../utils/errors';

export class FileManager {
  private basePath: string;

  constructor() {
    this.basePath = config.volumePath;
  }

  /**
   * Get customer directory path
   */
  getCustomerPath(customerName: string): string {
    return path.join(this.basePath, 'customers', customerName);
  }

  /**
   * Get project directory path
   */
  getProjectPath(customerName: string, projectId: string): string {
    return path.join(this.getCustomerPath(customerName), 'projects', projectId);
  }

  /**
   * Get config file path
   */
  getConfigPath(customerName: string, projectId: string): string {
    return path.join(this.getProjectPath(customerName, projectId), 'config.yaml');
  }

  /**
   * Get status file path
   */
  getStatusPath(customerName: string, projectId: string): string {
    return path.join(this.getProjectPath(customerName, projectId), 'hsstool_status.txt');
  }

  /**
   * Get ring file path
   */
  getRingPath(customerName: string, projectId: string): string {
    return path.join(this.getProjectPath(customerName, projectId), 'hsstool_ring.txt');
  }

  /**
   * Get output directory path
   */
  getOutputPath(customerName: string, projectId: string): string {
    return path.join(this.getProjectPath(customerName, projectId), 'output');
  }

  /**
   * Check if customer folder exists
   */
  async customerExists(customerName: string): Promise<boolean> {
    const customerPath = this.getCustomerPath(customerName);
    return await fs.pathExists(customerPath);
  }

  /**
   * Create customer folder
   */
  async createCustomer(customerName: string): Promise<void> {
    const customerPath = this.getCustomerPath(customerName);
    
    if (await this.customerExists(customerName)) {
      throw new AppError(`Customer '${customerName}' already exists`, 409);
    }

    try {
      await fs.ensureDir(customerPath);
      await fs.ensureDir(path.join(customerPath, 'projects'));
    } catch (error) {
      throw new AppError(`Failed to create customer folder: ${error}`, 500);
    }
  }

  /**
   * Delete customer folder
   */
  async deleteCustomer(customerName: string): Promise<void> {
    const customerPath = this.getCustomerPath(customerName);
    
    if (!(await this.customerExists(customerName))) {
      throw new AppError(`Customer '${customerName}' does not exist`, 404);
    }

    try {
      await fs.remove(customerPath);
    } catch (error) {
      throw new AppError(`Failed to delete customer folder: ${error}`, 500);
    }
  }

  /**
   * Rename customer folder
   */
  async renameCustomer(oldCustomerName: string, newCustomerName: string): Promise<void> {
    const oldPath = this.getCustomerPath(oldCustomerName);
    const newPath = this.getCustomerPath(newCustomerName);

    if (!(await this.customerExists(oldCustomerName))) {
      throw new AppError(`Customer '${oldCustomerName}' does not exist`, 404);
    }

    if (await this.customerExists(newCustomerName)) {
      throw new AppError(`Customer '${newCustomerName}' already exists`, 409);
    }

    try {
      await fs.move(oldPath, newPath);
    } catch (error) {
      throw new AppError(`Failed to rename customer: ${error}`, 500);
    }
  }

  /**
   * Check if project folder exists
   */
  async projectExists(customerName: string, projectId: string): Promise<boolean> {
    const projectPath = this.getProjectPath(customerName, projectId);
    return await fs.pathExists(projectPath);
  }

  /**
   * Create project folder
   */
  async createProject(customerName: string, projectId: string): Promise<void> {
    if (!(await this.customerExists(customerName))) {
      throw new AppError(`Customer '${customerName}' does not exist`, 404);
    }

    if (await this.projectExists(customerName, projectId)) {
      throw new AppError(`Project '${projectId}' already exists for customer '${customerName}'`, 409);
    }

    const projectPath = this.getProjectPath(customerName, projectId);
    const outputPath = this.getOutputPath(customerName, projectId);

    try {
      await fs.ensureDir(projectPath);
      await fs.ensureDir(outputPath);
    } catch (error) {
      throw new AppError(`Failed to create project folder: ${error}`, 500);
    }
  }

  /**
   * Delete project folder
   */
  async deleteProject(customerName: string, projectId: string): Promise<void> {
    if (!(await this.projectExists(customerName, projectId))) {
      throw new AppError(`Project '${projectId}' does not exist for customer '${customerName}'`, 404);
    }

    const projectPath = this.getProjectPath(customerName, projectId);

    try {
      await fs.remove(projectPath);
    } catch (error) {
      throw new AppError(`Failed to delete project folder: ${error}`, 500);
    }
  }

  /**
   * Rename project folder
   */
  async renameProject(
    customerName: string,
    oldProjectId: string,
    newProjectId: string
  ): Promise<void> {
    const oldPath = this.getProjectPath(customerName, oldProjectId);
    const newPath = this.getProjectPath(customerName, newProjectId);

    if (!(await this.projectExists(customerName, oldProjectId))) {
      throw new AppError(`Project '${oldProjectId}' does not exist`, 404);
    }

    if (await this.projectExists(customerName, newProjectId)) {
      throw new AppError(`Project '${newProjectId}' already exists`, 409);
    }

    try {
      await fs.move(oldPath, newPath);
    } catch (error) {
      throw new AppError(`Failed to rename project: ${error}`, 500);
    }
  }

  /**
   * Write file content
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content, 'utf8');
    } catch (error) {
      throw new AppError(`Failed to write file: ${error}`, 500);
    }
  }

  /**
   * Read file content
   */
  async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new AppError(`File not found: ${filePath}`, 404);
      }
      throw new AppError(`Failed to read file: ${error}`, 500);
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    return await fs.pathExists(filePath);
  }

  /**
   * List all files in directory
   */
  async listFiles(dirPath: string): Promise<string[]> {
    try {
      if (!(await fs.pathExists(dirPath))) {
        return [];
      }
      const items = await fs.readdir(dirPath);
      const files: string[] = [];
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.stat(itemPath);
        if (stats.isFile()) {
          files.push(itemPath);
        }
      }
      
      return files;
    } catch (error) {
      throw new AppError(`Failed to list files: ${error}`, 500);
    }
  }

  /**
   * List all customers
   */
  async listCustomers(): Promise<string[]> {
    try {
      const customersPath = path.join(this.basePath, 'customers');
      if (!(await fs.pathExists(customersPath))) {
        return [];
      }
      const items = await fs.readdir(customersPath);
      const customers: string[] = [];
      
      for (const item of items) {
        const itemPath = path.join(customersPath, item);
        const stats = await fs.stat(itemPath);
        if (stats.isDirectory()) {
          customers.push(item);
        }
      }
      
      return customers.sort();
    } catch (error) {
      throw new AppError(`Failed to list customers: ${error}`, 500);
    }
  }

  /**
   * List all projects for a customer
   */
  async listProjects(customerName: string): Promise<string[]> {
    try {
      if (!(await this.customerExists(customerName))) {
        throw new AppError(`Customer '${customerName}' does not exist`, 404);
      }
      
      const projectsPath = path.join(this.getCustomerPath(customerName), 'projects');
      if (!(await fs.pathExists(projectsPath))) {
        return [];
      }
      const items = await fs.readdir(projectsPath);
      const projects: string[] = [];
      
      for (const item of items) {
        const itemPath = path.join(projectsPath, item);
        const stats = await fs.stat(itemPath);
        if (stats.isDirectory()) {
          projects.push(item);
        }
      }
      
      return projects.sort();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to list projects: ${error}`, 500);
    }
  }
}

