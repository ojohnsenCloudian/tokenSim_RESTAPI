// Simulation execution and output routes

import { Router, Request, Response } from 'express';
import { param, validationResult } from 'express-validator';
import { FileManager } from '../services/fileManager';
import { DockerService } from '../services/docker';
import { OutputParser } from '../services/outputParser';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { handleAsync, sendError, AppError } from '../utils/errors';

const router = Router({ mergeParams: true });
const fileManager = new FileManager();
const dockerService = new DockerService();
const outputParser = new OutputParser();

// Validation middleware
const validateCustomerName = [
  param('customerName')
    .trim()
    .notEmpty()
    .withMessage('Customer name is required')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Customer name must contain only alphanumeric characters, hyphens, and underscores'),
];

const validateProjectId = [
  param('projectId')
    .trim()
    .notEmpty()
    .withMessage('Project ID is required')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Project ID must contain only alphanumeric characters, hyphens, and underscores'),
];

// POST /api/customers/:customerName/projects/:projectId/run - Execute simulation
router.post(
  '/run',
  authenticateToken,
  validateCustomerName,
  validateProjectId,
  handleAsync(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(errors.array()[0].msg, 400);
    }

    const { customerName, projectId } = req.params;

    if (!(await fileManager.projectExists(customerName, projectId))) {
      throw new AppError(
        `Project '${projectId}' not found for customer '${customerName}'`,
        404
      );
    }

    // Check if required files exist
    const configPath = fileManager.getConfigPath(customerName, projectId);
    const statusPath = fileManager.getStatusPath(customerName, projectId);
    const ringPath = fileManager.getRingPath(customerName, projectId);

    if (!(await fileManager.fileExists(configPath))) {
      throw new AppError(
        `Config file not found for project '${projectId}'. Please create config first.`,
        400
      );
    }

    if (!(await fileManager.fileExists(statusPath))) {
      throw new AppError(
        `Status file not found for project '${projectId}'. Please upload status file first.`,
        400
      );
    }

    if (!(await fileManager.fileExists(ringPath))) {
      throw new AppError(
        `Ring file not found for project '${projectId}'. Please upload ring file first.`,
        400
      );
    }

    // Check if Docker container is running
    const containerRunning = await dockerService.checkContainer();
    if (!containerRunning) {
      throw new AppError(
        `TokenSim container '${dockerService.getContainerName()}' is not running`,
        503
      );
    }

    // Path relative to container filesystem
    const configPathInContainer = `/home/ats/files/customers/${customerName}/projects/${projectId}/config.yaml`;

    // Execute simulation
    const { stdout, stderr } = await dockerService.runSimulation(configPathInContainer);

    res.json({
      success: true,
      message: `Simulation executed successfully for project '${projectId}'`,
      data: {
        customerName,
        projectId,
        execution: {
          stdout,
          stderr: stderr || null,
          timestamp: new Date().toISOString(),
        },
      },
    });
  })
);

// GET /api/customers/:customerName/projects/:projectId/output - Get formatted output JSON
router.get(
  '/output',
  authenticateToken,
  validateCustomerName,
  validateProjectId,
  handleAsync(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(errors.array()[0].msg, 400);
    }

    const { customerName, projectId } = req.params;

    if (!(await fileManager.projectExists(customerName, projectId))) {
      throw new AppError(
        `Project '${projectId}' not found for customer '${customerName}'`,
        404
      );
    }

    // Parse output files
    const output = await outputParser.parseOutput(customerName, projectId);

    res.json({
      success: true,
      data: {
        customerName,
        projectId,
        // Main data model - unified structure
        nodes: output.data?.nodes || [],
        datacenters: output.data?.datacenters || {},
        hostnames: output.data?.hostnames || {},
        tokenMappings: output.data?.tokenMappings || [],
        summary: output.data?.summary || {
          totalNodes: 0,
          totalTokens: 0,
          totalDatacenters: 0,
        },
        // Raw parsed files for reference
        files: output.parsed?.files || [],
        fileSummary: output.parsed?.summary || {
          totalFiles: 0,
          txtFiles: 0,
          jsonFiles: 0,
          fileTypes: [],
        },
        timestamp: new Date().toISOString(),
      },
    });
  })
);

export default router;
