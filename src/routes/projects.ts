// Project management routes

import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { FileManager } from '../services/fileManager';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { handleAsync, sendError, AppError } from '../utils/errors';

const router = Router();
const fileManager = new FileManager();

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

const validateCreateProject = [
  body('projectId')
    .trim()
    .notEmpty()
    .withMessage('Project ID is required')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Project ID must contain only alphanumeric characters, hyphens, and underscores'),
];

const validateUpdateProject = [
  body('projectId')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Project ID cannot be empty')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Project ID must contain only alphanumeric characters, hyphens, and underscores'),
];

// GET /api/customers/:customerName/projects - List all projects for a customer
router.get(
  '/',
  authenticateToken,
  validateCustomerName,
  handleAsync(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(errors.array()[0].msg, 400);
    }

    const { customerName } = req.params;
    const projectIds = await fileManager.listProjects(customerName);
    
    // Get details for each project
    const projects = await Promise.all(
      projectIds.map(async (projectId) => {
        const configExists = await fileManager.fileExists(
          fileManager.getConfigPath(customerName, projectId)
        );
        const statusExists = await fileManager.fileExists(
          fileManager.getStatusPath(customerName, projectId)
        );
        const ringExists = await fileManager.fileExists(
          fileManager.getRingPath(customerName, projectId)
        );
        const outputExists = await fileManager.fileExists(
          fileManager.getOutputPath(customerName, projectId)
        );

        return {
          id: projectId,
          path: fileManager.getProjectPath(customerName, projectId),
          files: {
            config: configExists,
            status: statusExists,
            ring: ringExists,
            output: outputExists,
          },
          ready: configExists && statusExists && ringExists,
        };
      })
    );

    res.json({
      success: true,
      data: {
        customerName,
        projects,
      },
      count: projects.length,
    });
  })
);

// POST /api/customers/:customerName/projects - Create project folder
router.post(
  '/',
  authenticateToken,
  validateCustomerName,
  validateCreateProject,
  handleAsync(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(errors.array()[0].msg, 400);
    }

    const { customerName } = req.params;
    const { projectId } = req.body;
    await fileManager.createProject(customerName, projectId);

    res.status(201).json({
      success: true,
      message: `Project '${projectId}' created successfully for customer '${customerName}'`,
      data: {
        customerName,
        projectId,
        path: fileManager.getProjectPath(customerName, projectId),
      },
    });
  })
);

// GET /api/customers/:customerName/projects/:projectId - Get project info
router.get(
  '/:projectId',
  authenticateToken,
  validateCustomerName,
  validateProjectId,
  handleAsync(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(errors.array()[0].msg, 400);
    }

    const { customerName, projectId } = req.params;
    const exists = await fileManager.projectExists(customerName, projectId);

    if (!exists) {
      throw new AppError(
        `Project '${projectId}' not found for customer '${customerName}'`,
        404
      );
    }

    // Check if files exist
    const configExists = await fileManager.fileExists(
      fileManager.getConfigPath(customerName, projectId)
    );
    const statusExists = await fileManager.fileExists(
      fileManager.getStatusPath(customerName, projectId)
    );
    const ringExists = await fileManager.fileExists(
      fileManager.getRingPath(customerName, projectId)
    );

    // Check if output directory has files
    const outputExists = await fileManager.fileExists(
      fileManager.getOutputPath(customerName, projectId)
    );
    const outputFiles = outputExists 
      ? await fileManager.listFiles(fileManager.getOutputPath(customerName, projectId))
      : [];

    res.json({
      success: true,
      data: {
        customerName,
        projectId,
        path: fileManager.getProjectPath(customerName, projectId),
        files: {
          config: configExists,
          status: statusExists,
          ring: ringExists,
          output: outputFiles.length > 0,
        },
        ready: configExists && statusExists && ringExists,
        outputFileCount: outputFiles.length,
      },
    });
  })
);

// DELETE /api/customers/:customerName/projects/:projectId - Delete project
router.delete(
  '/:projectId',
  authenticateToken,
  validateCustomerName,
  validateProjectId,
  handleAsync(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(errors.array()[0].msg, 400);
    }

    const { customerName, projectId } = req.params;
    await fileManager.deleteProject(customerName, projectId);

    res.json({
      success: true,
      message: `Project '${projectId}' deleted successfully for customer '${customerName}'`,
      data: {
        customerName,
        projectId,
      },
    });
  })
);

// PATCH /api/customers/:customerName/projects/:projectId - Update project (rename)
router.patch(
  '/:projectId',
  authenticateToken,
  validateCustomerName,
  validateProjectId,
  validateUpdateProject,
  handleAsync(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(errors.array()[0].msg, 400);
    }

    const { customerName, projectId: oldProjectId } = req.params;
    const { projectId: newProjectId } = req.body;

    if (!newProjectId) {
      throw new AppError('New project ID is required', 400);
    }

    await fileManager.renameProject(customerName, oldProjectId, newProjectId);

    res.json({
      success: true,
      message: `Project '${oldProjectId}' renamed to '${newProjectId}' successfully`,
      data: {
        customerName,
        oldProjectId,
        newProjectId,
        path: fileManager.getProjectPath(customerName, newProjectId),
      },
    });
  })
);

export default router;

