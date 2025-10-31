// Docker execution service

import { exec } from 'child_process';
import { promisify } from 'util';
import { config } from '../utils/config';
import { AppError } from '../utils/errors';

const execAsync = promisify(exec);

export class DockerService {
  private containerName: string;

  constructor() {
    this.containerName = config.tokensimContainerName;
  }

  /**
   * Get container name
   */
  getContainerName(): string {
    return this.containerName;
  }

  /**
   * Execute tokenSim manual command
   */
  async runSimulation(configPath: string): Promise<{ stdout: string; stderr: string }> {
    // Path should be relative to container's filesystem
    // configPath is already absolute path in container
    const command = `docker exec ${this.containerName} ats manual -c "${configPath}"`;

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 300000, // 5 minutes timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      // Check if command executed successfully
      // Note: tokenSim might output warnings to stderr that are not errors
      return { stdout, stderr };
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      const stderr = error.stderr || '';
      const stdout = error.stdout || '';
      
      // If there's stdout, the command might have partially succeeded
      // We'll check the exit code or error message
      if (error.code === 'ENOENT') {
        throw new AppError(
          `Docker command not found. Make sure Docker is installed and accessible.`,
          500
        );
      }

      throw new AppError(
        `Simulation execution failed: ${errorMessage}\nSTDERR: ${stderr}\nSTDOUT: ${stdout}`,
        500
      );
    }
  }

  /**
   * Check if Docker container is running
   */
  async checkContainer(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `docker ps --filter "name=${this.containerName}" --format "{{.Names}}"`,
        { timeout: 5000 }
      );
      return stdout.trim() === this.containerName;
    } catch (error) {
      return false;
    }
  }
}

