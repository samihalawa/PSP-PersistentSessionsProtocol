import React from 'react';
import { motion } from 'framer-motion';

export default function Sessions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Browser Sessions</h2>
        <p className="text-gray-600">
          Manage all your captured browser sessions. Create, edit, import, and export sessions.
        </p>
        <div className="mt-6 text-center text-gray-500">
          📱 Session management interface coming soon...
        </div>
      </div>
    </motion.div>
  );
}