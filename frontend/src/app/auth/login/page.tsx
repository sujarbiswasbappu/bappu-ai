'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import apiClient from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import { handleApiError, handleApiSuccess } from '@/lib/errorHandler';
import { GlassmorphicCard } from '@/components/GlassmorphicCard';
import { FiPhone, FiArrowRight } from 'react-icons/fi';
import Link from 'next/link';

export default function LoginPage() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);
  const setToken = useAuthStore((state) => state.setToken);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiClient.post('/auth/send-otp', {
        phoneNumber,
        countryCode,
      });
      handleApiSuccess('OTP sent successfully! Check your phone.');
      setStep('otp');
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiClient.post('/auth/verify-otp', {
        phoneNumber,
        countryCode,
        otp,
      });

      const { token, user } = response.data;
      setToken(token);
      setUser(user);
      handleApiSuccess('Login successful!');
      window.location.href = '/dashboard';
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GlassmorphicCard className="w-full max-w-md p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">bappu.ai</h1>
          <p className="text-gray-300">AI-Powered Assignment Helper</p>
        </motion.div>

        {step === 'phone' ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Phone Number
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  placeholder="+1"
                  className="w-20 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary"
                />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter your phone number"
                  className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary"
                  required
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-primary to-secondary rounded-lg text-white font-medium hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <FiPhone size={18} />
              {loading ? 'Sending...' : 'Send OTP'}
              <FiArrowRight size={18} />
            </motion.button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Enter OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary text-center text-2xl tracking-widest"
                required
              />
              <p className="text-sm text-gray-400 mt-2 text-center">
                Sent to {countryCode}{phoneNumber}
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-primary to-secondary rounded-lg text-white font-medium hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
              <FiArrowRight size={18} />
            </motion.button>

            <button
              type="button"
              onClick={() => setStep('phone')}
              className="w-full py-2 text-gray-300 hover:text-white transition-colors"
            >
              Change Phone Number
            </button>
          </form>
        )}
      </GlassmorphicCard>
    </div>
  );
}
