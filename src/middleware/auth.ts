import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser, Website } from '../models';

export interface AuthRequest extends Request {
  user?: IUser;
  userId?: string;
  websiteId?: string;
}

export interface JwtPayload {
  userId: string;
  role: string;
  websiteId?: string;
  iat: number;
  exp: number;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        success: false, 
        message: 'Access token is required' 
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      res.status(401).json({ 
        success: false, 
        message: 'Access token is required' 
      });
      return;
    }

    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your-secret-key'
    ) as JwtPayload;

    const user = await User.findById(decoded.userId);
    
    if (!user) {
      res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ 
        success: false, 
        message: 'User account is deactivated' 
      });
      return;
    }

    req.user = user;
    req.userId = decoded.userId;
    req.websiteId = decoded.websiteId || user.websiteId?.toString();
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ 
        success: false, 
        message: 'Token has expired' 
      });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
      return;
    }
    res.status(500).json({ 
      success: false, 
      message: 'Authentication failed' 
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to perform this action' 
      });
      return;
    }

    next();
  };
};

export const checkWebsiteAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const websiteId = req.params.websiteId || req.params.id || req.body.websiteId;
    
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
      return;
    }

    // Super admins have access to all websites
    if (req.user.role === 'super_admin') {
      next();
      return;
    }

    if (!websiteId) {
      next();
      return;
    }

    // Check if admin is assigned to this website
    const website = await Website.findById(websiteId);
    if (!website) {
      res.status(404).json({ 
        success: false, 
        message: 'Website not found' 
      });
      return;
    }

    const isAssigned = website.assignedAdmin && 
      website.assignedAdmin.toString() === req.user._id.toString();

    if (!isAssigned) {
      res.status(403).json({ 
        success: false, 
        message: 'You do not have access to this website' 
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Authorization check failed' 
    });
  }
};
