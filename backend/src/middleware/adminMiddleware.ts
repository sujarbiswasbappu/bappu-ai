import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

/**
 * Admin Role Middleware
 * Checks if user is admin (can be determined by a role field or admin table)
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // For MVP, we'll check a hardcoded admin list or database
    // In production, add a role field to User model
    const ADMIN_PHONE_NUMBERS = [
      process.env.ADMIN_PHONE_1,
      process.env.ADMIN_PHONE_2,
    ];

    if (!ADMIN_PHONE_NUMBERS.includes(req.user.phoneNumber)) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Log admin activities for audit trail
 */
export const logAdminActivity = async (
  adminId: string,
  action: string,
  targetUserId?: string,
  description?: string,
  ipAddress?: string
) => {
  try {
    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action,
        targetUserId,
        description,
        ipAddress,
      },
    });
  } catch (error) {
    console.error('Error logging admin activity:', error);
  }
};
