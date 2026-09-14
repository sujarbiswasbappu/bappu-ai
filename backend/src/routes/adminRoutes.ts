import { Router, Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { authenticateJWT } from '../middleware/authMiddleware';
import { requireAdmin, logAdminActivity } from '../middleware/adminMiddleware';
import prisma from '../lib/prisma';

const router = Router();

/**
 * GET /admin/users
 * Retrieve list of users with pagination
 * Admin can only see: phone, profile info, registration date, account status, usage metrics
 */
router.get(
  '/users',
  authenticateJWT,
  requireAdmin,
  [
    query('page').optional().isInt({ min: 1 }).default(1).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).default(20).toInt(),
    query('search').optional().trim(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { page, limit, search } = req.query as any;
      const skip = (page - 1) * limit;

      // Build filter
      let whereClause: any = { isActive: true };
      if (search) {
        whereClause.OR = [
          { phoneNumber: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          phoneNumber: true,
          firstName: true,
          lastName: true,
          email: true,
          institution: true,
          isActive: true,
          accountCreatedAt: true,
          lastLoginAt: true,
          totalAssignmentsGenerated: true,
          totalExportsCreated: true,
          storageUsedMB: true,
        },
        skip,
        take: limit,
        orderBy: { accountCreatedAt: 'desc' },
      });

      const total = await prisma.user.count({ where: whereClause });

      // Log admin activity
      if (req.user) {
        await logAdminActivity(
          req.user.userId,
          'view_user_list',
          undefined,
          `Retrieved ${users.length} users`,
          req.ip
        );
      }

      res.status(200).json({
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error retrieving users:', error);
      res.status(500).json({ error: 'Failed to retrieve users' });
    }
  }
);

/**
 * GET /admin/users/:userId
 * Get specific user details (privacy-compliant)
 */
router.get(
  '/users/:userId',
  authenticateJWT,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          phoneNumber: true,
          firstName: true,
          lastName: true,
          email: true,
          institution: true,
          isActive: true,
          accountCreatedAt: true,
          lastLoginAt: true,
          totalAssignmentsGenerated: true,
          totalExportsCreated: true,
          storageUsedMB: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Log admin activity
      if (req.user) {
        await logAdminActivity(
          req.user.userId,
          'view_user_details',
          userId,
          undefined,
          req.ip
        );
      }

      res.status(200).json({ user });
    } catch (error) {
      console.error('Error retrieving user:', error);
      res.status(500).json({ error: 'Failed to retrieve user' });
    }
  }
);

/**
 * GET /admin/analytics
 * Platform analytics and usage metrics
 */
router.get(
  '/analytics',
  authenticateJWT,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const totalUsers = await prisma.user.count({ where: { isActive: true } });
      const newUsersThisMonth = await prisma.user.count({
        where: {
          isActive: true,
          accountCreatedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      });

      const totalAssignmentsGenerated = await prisma.assignment.count();
      const assignmentsThisMonth = await prisma.assignment.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      });

      const totalExports = await prisma.export.count();
      const exportsThisMonth = await prisma.export.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      });

      const totalStorageUsedMB = await prisma.user.aggregate({
        _sum: { storageUsedMB: true },
      });

      // Log admin activity
      if (req.user) {
        await logAdminActivity(
          req.user.userId,
          'view_analytics',
          undefined,
          undefined,
          req.ip
        );
      }

      res.status(200).json({
        users: {
          total: totalUsers,
          newThisMonth: newUsersThisMonth,
        },
        assignments: {
          total: totalAssignmentsGenerated,
          thisMonth: assignmentsThisMonth,
        },
        exports: {
          total: totalExports,
          thisMonth: exportsThisMonth,
        },
        storage: {
          totalUsedMB: totalStorageUsedMB._sum.storageUsedMB || 0,
        },
      });
    } catch (error) {
      console.error('Error retrieving analytics:', error);
      res.status(500).json({ error: 'Failed to retrieve analytics' });
    }
  }
);

/**
 * PUT /admin/users/:userId/status
 * Change user account status
 */
router.put(
  '/users/:userId/status',
  authenticateJWT,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ error: 'isActive must be boolean' });
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { isActive },
        select: {
          id: true,
          phoneNumber: true,
          isActive: true,
        },
      });

      // Log admin activity
      if (req.user) {
        await logAdminActivity(
          req.user.userId,
          'update_user_status',
          userId,
          `User status set to: ${isActive}`,
          req.ip
        );
      }

      res.status(200).json({
        message: 'User status updated',
        user,
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({ error: 'Failed to update user status' });
    }
  }
);

/**
 * GET /admin/activity-logs
 * Retrieve admin activity audit trail
 */
router.get(
  '/activity-logs',
  authenticateJWT,
  requireAdmin,
  [
    query('page').optional().isInt({ min: 1 }).default(1).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).default(20).toInt(),
  ],
  async (req: Request, res: Response) => {
    try {
      const { page, limit } = req.query as any;
      const skip = (page - 1) * limit;

      const logs = await prisma.adminActivityLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      const total = await prisma.adminActivityLog.count();

      res.status(200).json({
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error retrieving activity logs:', error);
      res.status(500).json({ error: 'Failed to retrieve activity logs' });
    }
  }
);

export default router;
