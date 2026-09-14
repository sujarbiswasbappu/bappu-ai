'use client';

import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface GlassmorphicCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export const GlassmorphicCard: React.FC<GlassmorphicCardProps> = ({
  children,
  className = '',
  delay = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className={`
        bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl
        shadow-2xl hover:shadow-3xl hover:border-white/40
        transition-all duration-300 ${className}
      `}
    >
      {children}
    </motion.div>
  );
};
