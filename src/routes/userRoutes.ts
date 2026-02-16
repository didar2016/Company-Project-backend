import { Router } from 'express';
import { body } from 'express-validator';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  updateUserPermissions,
  toggleUserStatus,
} from '../controllers';
import { authenticate, authorize } from '../middleware';

const router = Router();

// All routes require authentication and super_admin access
// Only super_admin can manage users
router.use(authenticate);
router.use(authorize('super_admin'));

// Get all users
router.get('/', getUsers);

// Get single user
router.get('/:id', getUser);

// Create user
router.post(
  '/',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('name').notEmpty().withMessage('Name is required'),
    body('role')
      .optional()
      .equals('admin')
      .withMessage('Only admin role can be assigned'),
  ],
  createUser
);

// Update user
router.put('/:id', updateUser);

// Delete user
router.delete('/:id', deleteUser);

// Update user permissions
router.patch('/:id/permissions', updateUserPermissions);

// Toggle user active status
router.patch('/:id/toggle-status', toggleUserStatus);

export default router;
