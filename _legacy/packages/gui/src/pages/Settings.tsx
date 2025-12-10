import React from 'react';
import { motion } from 'framer-motion';

export default function Settings() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Settings</h2>
        <p className="text-gray-600">
          Configure PSP settings, storage providers, security options, and integrations.
        </p>
        <div className="mt-6 text-center text-gray-500">
          ⚙️ Settings interface coming soon...
        </div>
      </div>
    </motion.div>
  );
}