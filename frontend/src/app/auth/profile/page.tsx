'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import apiClient from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import { handleApiError, handleApiSuccess } from '@/lib/errorHandler';
import { GlassmorphicCard } from '@/components/GlassmorphicCard';
import { FiArrowRight, FiUser, FiMail, FiBookOpen } from 'react-icons/fi';

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    institution: user?.institution || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiClient.post('/auth/profile', formData);
      handleApiSuccess('Profile updated successfully!');
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
          <h1 className="text-3xl font-bold text-white mb-2">Complete Your Profile</h1>
          <p className="text-gray-300">Help us personalize your experience</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                First Name
              </label>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg">
                <FiUser className="text-gray-400" />
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  placeholder="John"
                  className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Last Name
              </label>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg">
                <FiUser className="text-gray-400" />
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  placeholder="Doe"
                  className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Email Address
            </label>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg">
              <FiMail className="text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Institution (Optional)
            </label>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg">
              <FiBookOpen className="text-gray-400" />
              <input
                type="text"
                value={formData.institution}
                onChange={(e) =>
                  setFormData({ ...formData, institution: e.target.value })
                }
                placeholder="Your University"
                className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none"
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-primary to-secondary rounded-lg text-white font-medium hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-6"
          >
            {loading ? 'Saving...' : 'Continue to Dashboard'}
            <FiArrowRight size={18} />
          </motion.button>
        </form>
      </GlassmorphicCard>
    </div>
  );
}
