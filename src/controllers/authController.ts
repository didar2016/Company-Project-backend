import { Response } from 'express';
import crypto from 'crypto';
import { User } from '../models';
import { AuthRequest, catchAsync, CustomError } from '../middleware';
import { generateTokens, verifyRefreshToken } from '../utils';

// Register new user
export const register = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const { email, password, name, role } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new CustomError('User with this email already exists', 400);
  }

  // Generate email verification token
  const emailVerificationToken = crypto.randomBytes(32).toString('hex');

  // Create new user
  const user = await User.create({
    email,
    password,
    name,
    role: role || 'admin',
    emailVerificationToken,
  });

  // Generate tokens
  const tokens = generateTokens({
    userId: user._id.toString(),
    role: user.role,
    websiteId: user.websiteId?.toString(),
  });

  // Save refresh token
  user.refreshToken = tokens.refreshToken;
  await user.save();

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        websiteId: user.websiteId,
      },
      tokens,
    },
  });
});

// Login user
export const login = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const { email, password } = req.body;

  // Find user with password
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new CustomError('Invalid email or password', 401);
  }

  // Check if user is active
  if (!user.isActive) {
    throw new CustomError('Your account has been deactivated', 403);
  }

  // Compare password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new CustomError('Invalid email or password', 401);
  }

  // Admin users must be assigned to a website to log in
  if (user.role === 'admin' && !user.websiteId) {
    throw new CustomError('Your account is not assigned to any website. Please contact the super admin.', 403);
  }

  // Generate tokens
  const tokens = generateTokens({
    userId: user._id.toString(),
    role: user.role,
    websiteId: user.websiteId?.toString(),
  });

  // Update refresh token and last login
  user.refreshToken = tokens.refreshToken;
  user.lastLogin = new Date();
  await user.save();

  // If admin, populate their assigned website name
  let websiteName: string | undefined;
  if (user.role === 'admin' && user.websiteId) {
    const { Website } = await import('../models');
    const website = await Website.findById(user.websiteId);
    if (website) {
      websiteName = website.name;
    }
  }

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        websiteId: user.websiteId,
        websiteAccess: user.websiteAccess,
        websiteName,
      },
      tokens,
    },
  });
});

// Logout user
export const logout = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user) {
    req.user.refreshToken = undefined;
    await req.user.save();
  }

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

// Refresh access token
export const refreshToken = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body;

  if (!token) {
    throw new CustomError('Refresh token is required', 400);
  }

  // Verify refresh token
  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw new CustomError('Invalid or expired refresh token', 401);
  }

  // Find user with refresh token
  const user = await User.findById(decoded.userId).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    throw new CustomError('Invalid refresh token', 401);
  }

  // Generate new tokens
  const tokens = generateTokens({
    userId: user._id.toString(),
    role: user.role,
    websiteId: user.websiteId?.toString(),
  });

  // Update refresh token
  user.refreshToken = tokens.refreshToken;
  await user.save();

  res.status(200).json({
    success: true,
    data: { tokens },
  });
});

// Forgot password
export const forgotPassword = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal if user exists
    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent',
    });
    return;
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
  await user.save();

  // TODO: Send email with reset link
  // For now, just return success
  res.status(200).json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent',
    // Remove in production - for development only
    resetToken,
  });
});

// Reset password
export const resetPassword = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const { token, password } = req.body;

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    throw new CustomError('Invalid or expired reset token', 400);
  }

  // Update password
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password reset successfully',
  });
});

// Get current user
export const getMe = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.userId).populate('websiteAccess');

  if (!user) {
    throw new CustomError('User not found', 404);
  }

  // If admin, populate their assigned website name
  let websiteName: string | undefined;
  if (user.role === 'admin' && user.websiteId) {
    const { Website } = await import('../models');
    const website = await Website.findById(user.websiteId);
    if (website) {
      websiteName = website.name;
    }
  }

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        websiteId: user.websiteId,
        websiteAccess: user.websiteAccess,
        websiteName,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
    },
  });
});

// Update current user profile
export const updateProfile = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, avatar } = req.body;

  const user = await User.findByIdAndUpdate(
    req.userId,
    { name, avatar },
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new CustomError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    data: { user },
  });
});

// Change password
export const changePassword = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.userId).select('+password');
  if (!user) {
    throw new CustomError('User not found', 404);
  }

  const isPasswordValid = await user.comparePassword(currentPassword);
  if (!isPasswordValid) {
    throw new CustomError('Current password is incorrect', 400);
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
  });
});
