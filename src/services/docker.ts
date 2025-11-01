// Docker container interaction service

import { exec } from 'child_process';
import { promisify } from 'util';
import { config } from '../utils/config';

const execAsync = promisify(exec);

export class DockerService {
  private containerName: string;

  constructor() {
    this.containerName = config.tokensimContainerName;
  }

  getContainerName(): string {
    return this.containerName;
  }

  async checkContainer(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `docker ps --filter "name=${this.containerName}" --format "{{.Names}}"`
      );
      return stdout.trim() === this.containerName;
    } catch (error) {
      return false;
    }
  }

  async runSimulation(configPath: string): Promise<{ stdout: string; stderr: string }> {
    // configPath should be relative to container filesystem
    const command = `docker exec ${this.containerName} ats manual -c ${configPath}`;

    try {
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });
      return { stdout, stderr };
    } catch (error: any) {
      // Docker exec returns non-zero exit code on errors, but we still want stdout/stderr
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message || '',
      };
    }
  }
}
