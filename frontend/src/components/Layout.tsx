'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Watermark */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.08 }}
          className="text-9xl font-bold text-white select-none"
        >
          bappu.ai
        </motion.div>
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>

      {/* Animated background gradient */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          animate={{
            background: [
              'radial-gradient(at 20% 50%, rgba(99, 102, 241, 0.3) 0px, transparent 50%)',
              'radial-gradient(at 80% 50%, rgba(236, 72, 153, 0.3) 0px, transparent 50%)',
              'radial-gradient(at 20% 50%, rgba(99, 102, 241, 0.3) 0px, transparent 50%)',
            ],
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="w-full h-full"
        />
      </div>
    </div>
  );
};
