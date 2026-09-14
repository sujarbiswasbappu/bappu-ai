import * as admin from 'firebase-admin';
import { randomBytes } from 'crypto';

// Initialize Firebase Admin (configured via environment variables)
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as any),
  });
}

export const firebaseAuth = admin.auth();

/**
 * Generate a random OTP code
 * @param length - Length of OTP (default: 6)
 * @returns OTP code as string
 */
export const generateOTP = (length: number = 6): string => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
};

/**
 * Send OTP via Firebase Cloud Messaging or Twilio
 * For MVP, we'll use Firebase Auth (which handles SMS via Firebase)
 */
export const sendOTPtoPhone = async (
  phoneNumber: string,
  countryCode: string
): Promise<string> => {
  try {
    const fullPhoneNumber = `${countryCode}${phoneNumber}`;
    // In production, use Firebase Custom Auth or Twilio
    // For MVP, generate OTP and store in database
    const otp = generateOTP(6);
    return otp;
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw new Error('Failed to send OTP');
  }
};

/**
 * Verify phone number with OTP
 */
export const verifyPhoneOTP = async (
  phoneNumber: string,
  providedOTP: string,
  storedOTP: string,
  expiresAt: Date
): Promise<boolean> => {
  // Check expiry
  if (new Date() > expiresAt) {
    return false;
  }
  // Check OTP match
  return providedOTP === storedOTP;
};
