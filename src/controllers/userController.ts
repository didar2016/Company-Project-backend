import { Response } from 'express';
import { User } from '../models';
import { AuthRequest, catchAsync, CustomError } from '../middleware';

// Get all users
export const getUsers = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const { role, isActive, search } = req.query;

  let query: Record<string, unknown> = {};

  // Super admins can only see admin users, not other super_admins
  if (req.user?.role === 'super_admin') {
    query.role = 'admin';
  } else if (role) {
    query.role = role;
  }

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const users = await User.find(query)
    .populate('websiteAccess', 'name domain')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: users.length,
    data: { users },
  });
});

// Get single user
export const getUser = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.params.id)
    .populate('websiteAccess');

  if (!user) {
    throw new CustomError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    data: { user },
  });
});

// Create user
export const createUser = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const { email, password, name, role, websiteId, websiteAccess, isActive } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new CustomError('User with this email already exists', 400);
  }

  // Super admins can only create admin users, not other super_admins
  const userRole = req.user?.role === 'super_admin' ? 'admin' : (role || 'admin');

  const user = await User.create({
    email,
    password,
    name,
    role: userRole,
    websiteId: websiteId || undefined,
    websiteAccess: websiteAccess || [],
    isActive: isActive !== undefined ? isActive : true,
  });

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        websiteId: user.websiteId,
        websiteAccess: user.websiteAccess,
        isActive: user.isActive,
      },
    },
  });
});

// Update user
export const updateUser = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, role, websiteId, websiteAccess, isActive, avatar } = req.body;

  // Prevent changing super_admin role unless you are a super_admin
  const targetUser = await User.findById(req.params.id);
  if (!targetUser) {
    throw new CustomError('User not found', 404);
  }

  if (targetUser.role === 'super_admin' && req.user?.role !== 'super_admin') {
    throw new CustomError('Cannot modify super admin user', 403);
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (role !== undefined) updateData.role = role;
  if (websiteId !== undefined) updateData.websiteId = websiteId;
  if (websiteAccess !== undefined) updateData.websiteAccess = websiteAccess;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (avatar !== undefined) updateData.avatar = avatar;

  const user = await User.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  ).populate('websiteAccess');

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: { user },
  });
});

// Delete user
export const deleteUser = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new CustomError('User not found', 404);
  }

  // Prevent deleting super_admin
  if (user.role === 'super_admin') {
    throw new CustomError('Cannot delete super admin user', 403);
  }

  // Prevent self-deletion
  if (user._id.toString() === req.userId) {
    throw new CustomError('Cannot delete your own account', 403);
  }

  await user.deleteOne();

  res.status(200).json({
    success: true,
    message: 'User deleted successfully',
  });
});

// Update user permissions
export const updateUserPermissions = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const { websiteAccess, role } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new CustomError('User not found', 404);
  }

  // Prevent modifying super_admin permissions
  if (user.role === 'super_admin' && req.user?.role !== 'super_admin') {
    throw new CustomError('Cannot modify super admin permissions', 403);
  }

  if (websiteAccess !== undefined) {
    user.websiteAccess = websiteAccess;
  }
  if (role !== undefined) {
    user.role = role;
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: 'User permissions updated successfully',
    data: { user },
  });
});

// Toggle user active status
export const toggleUserStatus = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new CustomError('User not found', 404);
  }

  // Prevent toggling super_admin status
  if (user.role === 'super_admin') {
    throw new CustomError('Cannot change super admin status', 403);
  }

  user.isActive = !user.isActive;
  await user.save();

  res.status(200).json({
    success: true,
    message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
    data: { user },
  });
});
