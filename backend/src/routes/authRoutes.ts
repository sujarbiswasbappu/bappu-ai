import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { generateOTP, sendOTPtoPhone, verifyPhoneOTP } from '../services/authService';
import { generateToken } from '../services/jwtService';
import bcryptjs from 'bcryptjs';

const router = Router();

/**
 * POST /auth/send-otp
 * Send OTP to phone number
 */
router.post(
  '/send-otp',
  [
    body('phoneNumber')
      .isMobilePhone('any')
      .trim()
      .withMessage('Invalid phone number'),
    body('countryCode')
      .optional()
      .default('+1')
      .trim(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { phoneNumber, countryCode } = req.body;
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;

      // Generate OTP
      const otp = generateOTP(6);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP in database
      await prisma.oTPVerification.upsert({
        where: { phoneNumber: fullPhoneNumber },
        update: {
          otp,
          expiresAt,
          isVerified: false,
          attempts: 0,
        },
        create: {
          phoneNumber: fullPhoneNumber,
          countryCode,
          otp,
          expiresAt,
          isVerified: false,
        },
      });

      // In production, send via Twilio or Firebase
      console.log(`OTP for ${fullPhoneNumber}: ${otp}`);

      res.status(200).json({
        message: 'OTP sent successfully',
        phoneNumber: fullPhoneNumber,
        expiresIn: '10 minutes',
      });
    } catch (error) {
      console.error('Error sending OTP:', error);
      res.status(500).json({ error: 'Failed to send OTP' });
    }
  }
);

/**
 * POST /auth/verify-otp
 * Verify OTP and create/login user
 */
router.post(
  '/verify-otp',
  [
    body('phoneNumber')
      .isMobilePhone('any')
      .trim()
      .withMessage('Invalid phone number'),
    body('countryCode').optional().default('+1').trim(),
    body('otp')
      .isLength({ min: 4, max: 6 })
      .withMessage('Invalid OTP'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { phoneNumber, countryCode, otp } = req.body;
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;

      // Find OTP record
      const otpRecord = await prisma.oTPVerification.findUnique({
        where: { phoneNumber: fullPhoneNumber },
      });

      if (!otpRecord) {
        return res.status(400).json({ error: 'OTP not found. Request a new OTP.' });
      }

      // Check attempts
      if (otpRecord.attempts >= 5) {
        return res.status(429).json({ error: 'Too many attempts. Request a new OTP.' });
      }

      // Verify OTP
      const isValidOTP = await verifyPhoneOTP(
        fullPhoneNumber,
        otp,
        otpRecord.otp,
        otpRecord.expiresAt
      );

      if (!isValidOTP) {
        await prisma.oTPVerification.update({
          where: { phoneNumber: fullPhoneNumber },
          data: { attempts: otpRecord.attempts + 1 },
        });
        return res.status(400).json({ error: 'Invalid or expired OTP' });
      }

      // Mark as verified
      await prisma.oTPVerification.update({
        where: { phoneNumber: fullPhoneNumber },
        data: { isVerified: true },
      });

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { phoneNumber: fullPhoneNumber },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            phoneNumber: fullPhoneNumber,
            countryCode,
            isPhoneVerified: true,
          },
        });
      } else {
        // Update verification status
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            isPhoneVerified: true,
            lastLoginAt: new Date(),
          },
        });
      }

      // Generate JWT token
      const token = generateToken(user);

      // Create session
      const sessionToken = require('crypto').randomBytes(32).toString('hex');
      await prisma.session.create({
        data: {
          userId: user.id,
          sessionToken,
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      res.status(200).json({
        message: 'OTP verified successfully',
        token,
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          firstName: user.firstName,
          email: user.email,
          institution: user.institution,
        },
      });
    } catch (error) {
      console.error('Error verifying OTP:', error);
      res.status(500).json({ error: 'Failed to verify OTP' });
    }
  }
);

/**
 * POST /auth/profile
 * Complete user profile after signup
 */
router.post(
  '/profile',
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Invalid email'),
    body('institution').trim().optional(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { firstName, lastName, email, institution } = req.body;

      const updatedUser = await prisma.user.update({
        where: { id: req.user.userId },
        data: {
          firstName,
          lastName,
          email,
          institution,
        },
      });

      res.status(200).json({
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          phoneNumber: updatedUser.phoneNumber,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          institution: updatedUser.institution,
        },
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

export default router;
