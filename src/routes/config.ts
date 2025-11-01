// Configuration file routes

import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import * as yaml from 'yaml';
import { FileManager } from '../services/fileManager';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { handleAsync, sendError, AppError } from '../utils/errors';
import { CreateConfigRequest, ConfigYaml } from '../types';

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

const validateConfig = [
  body('customer_name')
    .trim()
    .notEmpty()
    .withMessage('customer_name is required'),
  body('dc_for_nodes')
    .isArray()
    .withMessage('dc_for_nodes must be an array')
    .notEmpty()
    .withMessage('dc_for_nodes cannot be empty'),
  body('nodes_to_add')
    .isArray()
    .withMessage('nodes_to_add must be an array')
    .notEmpty()
    .withMessage('nodes_to_add cannot be empty'),
  body('region')
    .trim()
    .notEmpty()
    .withMessage('region is required'),
  body('cumulative')
    .optional()
    .isString()
    .withMessage('cumulative must be a string'),
];

// PUT /api/customers/:customerName/projects/:projectId/config - Create/update config.yaml
router.put(
  '/',
  authenticateToken,
  validateCustomerName,
  validateProjectId,
  validateConfig,
  handleAsync(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(errors.array()[0].msg, 400);
    }

    const { customerName, projectId } = req.params;
    const configData: CreateConfigRequest = req.body;

    if (!(await fileManager.projectExists(customerName, projectId))) {
      throw new AppError(
        `Project '${projectId}' not found for customer '${customerName}'`,
        404
      );
    }

    // Build full config object with auto-populated paths
    const fullConfig: ConfigYaml = {
      customer_name: configData.customer_name,
      hss_ring_output: fileManager.getRingPath(customerName, projectId),
      hss_status_output: fileManager.getStatusPath(customerName, projectId),
      dc_for_nodes: configData.dc_for_nodes,
      nodes_to_add: configData.nodes_to_add,
      region: configData.region,
      cumulative: configData.cumulative || 'false',
      output_dir: `${fileManager.getOutputPath(customerName, projectId)}/`,
    };

    // Convert to YAML string
    const yamlString = yaml.stringify(fullConfig);

    // Write to file
    const configPath = fileManager.getConfigPath(customerName, projectId);
    await fileManager.writeFile(configPath, yamlString);

    res.json({
      success: true,
      message: `Config file created/updated successfully for project '${projectId}'`,
      data: {
        customerName,
        projectId,
        config: fullConfig,
        yaml: yamlString,
      },
    });
  })
);

// GET /api/customers/:customerName/projects/:projectId/config - Get config.yaml
router.get(
  '/',
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

    const configPath = fileManager.getConfigPath(customerName, projectId);
    
    if (!(await fileManager.fileExists(configPath))) {
      throw new AppError(
        `Config file not found for project '${projectId}'`,
        404
      );
    }

    const yamlString = await fileManager.readFile(configPath);
    const config = yaml.parse(yamlString) as ConfigYaml;

    res.json({
      success: true,
      data: {
        customerName,
        projectId,
        config,
        yaml: yamlString,
      },
    });
  })
);

export default router;
