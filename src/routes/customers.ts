// Customer management routes

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

const validateCreateCustomer = [
  body('customerName')
    .trim()
    .notEmpty()
    .withMessage('Customer name is required')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Customer name must contain only alphanumeric characters, hyphens, and underscores'),
];

const validateUpdateCustomer = [
  body('customerName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Customer name cannot be empty')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Customer name must contain only alphanumeric characters, hyphens, and underscores'),
];

// GET /api/customers - List all customers
router.get(
  '/',
  authenticateToken,
  handleAsync(async (req: AuthRequest, res: Response) => {
    const customers = await fileManager.listCustomers();
    
    res.json({
      success: true,
      data: {
        customers: customers.map(name => ({
          name,
          path: fileManager.getCustomerPath(name),
        })),
      },
      count: customers.length,
    });
  })
);

// POST /api/customers - Create customer folder
router.post(
  '/',
  authenticateToken,
  validateCreateCustomer,
  handleAsync(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(errors.array()[0].msg, 400);
    }

    const { customerName } = req.body;
    await fileManager.createCustomer(customerName);

    res.status(201).json({
      success: true,
      message: `Customer '${customerName}' created successfully`,
      data: {
        customerName,
        path: fileManager.getCustomerPath(customerName),
      },
    });
  })
);

// GET /api/customers/:customerName - Get customer info
router.get(
  '/:customerName',
  authenticateToken,
  validateCustomerName,
  handleAsync(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(errors.array()[0].msg, 400);
    }

    const { customerName } = req.params;
    const exists = await fileManager.customerExists(customerName);

    if (!exists) {
      throw new AppError(`Customer '${customerName}' not found`, 404);
    }

    // Get project count
    const projects = await fileManager.listProjects(customerName);

    res.json({
      success: true,
      data: {
        customerName,
        path: fileManager.getCustomerPath(customerName),
        projectCount: projects.length,
        projects: projects.map(id => ({
          id,
          path: fileManager.getProjectPath(customerName, id),
        })),
      },
    });
  })
);

// DELETE /api/customers/:customerName - Delete customer
router.delete(
  '/:customerName',
  authenticateToken,
  validateCustomerName,
  handleAsync(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(errors.array()[0].msg, 400);
    }

    const { customerName } = req.params;
    await fileManager.deleteCustomer(customerName);

    res.json({
      success: true,
      message: `Customer '${customerName}' deleted successfully`,
      data: {
        customerName,
      },
    });
  })
);

// PATCH /api/customers/:customerName - Update customer (rename)
router.patch(
  '/:customerName',
  authenticateToken,
  validateCustomerName,
  validateUpdateCustomer,
  handleAsync(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(errors.array()[0].msg, 400);
    }

    const { customerName: oldCustomerName } = req.params;
    const { customerName: newCustomerName } = req.body;

    if (!newCustomerName) {
      throw new AppError('New customer name is required', 400);
    }

    await fileManager.renameCustomer(oldCustomerName, newCustomerName);

    res.json({
      success: true,
      message: `Customer '${oldCustomerName}' renamed to '${newCustomerName}' successfully`,
      data: {
        oldCustomerName,
        newCustomerName,
        path: fileManager.getCustomerPath(newCustomerName),
      },
    });
  })
);

export default router;

