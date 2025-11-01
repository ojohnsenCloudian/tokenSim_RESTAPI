// File upload routes (status and ring files)

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

const validateFileContent = [
  body('content')
    .notEmpty()
    .withMessage('File content is required')
    .isString()
    .withMessage('File content must be a string'),
];

// PUT /api/customers/:customerName/projects/:projectId/status - Upload hsstool_status.txt
router.put(
  '/status',
  authenticateToken,
  validateCustomerName,
  validateProjectId,
  validateFileContent,
  handleAsync(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(errors.array()[0].msg, 400);
    }

    const { customerName, projectId } = req.params;
    const { content } = req.body;

    if (!(await fileManager.projectExists(customerName, projectId))) {
      throw new AppError(
        `Project '${projectId}' not found for customer '${customerName}'`,
        404
      );
    }

    const statusPath = fileManager.getStatusPath(customerName, projectId);
    await fileManager.writeFile(statusPath, content);

    res.json({
      success: true,
      message: `Status file uploaded successfully for project '${projectId}'`,
      data: {
        customerName,
        projectId,
        filename: 'hsstool_status.txt',
        path: statusPath,
        size: content.length,
      },
    });
  })
);

// PUT /api/customers/:customerName/projects/:projectId/ring - Upload hsstool_ring.txt
router.put(
  '/ring',
  authenticateToken,
  validateCustomerName,
  validateProjectId,
  validateFileContent,
  handleAsync(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(errors.array()[0].msg, 400);
    }

    const { customerName, projectId } = req.params;
    const { content } = req.body;

    if (!(await fileManager.projectExists(customerName, projectId))) {
      throw new AppError(
        `Project '${projectId}' not found for customer '${customerName}'`,
        404
      );
    }

    const ringPath = fileManager.getRingPath(customerName, projectId);
    await fileManager.writeFile(ringPath, content);

    res.json({
      success: true,
      message: `Ring file uploaded successfully for project '${projectId}'`,
      data: {
        customerName,
        projectId,
        filename: 'hsstool_ring.txt',
        path: ringPath,
        size: content.length,
      },
    });
  })
);

export default router;
