import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Sessions from './pages/Sessions';
import SessionDetail from './pages/SessionDetail';
import CookieManager from './pages/CookieManager';
import Settings from './pages/Settings';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Layout>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/sessions/:id" element={<SessionDetail />} />
            <Route path="/cookies" element={<CookieManager />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </motion.div>
      </Layout>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            style: {
              background: '#10b981',
            },
          },
          error: {
            style: {
              background: '#ef4444',
            },
          },
        }}
      />
    </div>
  );
}

export default App;