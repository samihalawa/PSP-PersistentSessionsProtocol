import React from 'react';
import { motion } from 'framer-motion';
import {
  DocumentTextIcon,
  CakeIcon as CookieIcon,
  GlobeAltIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const stats = [
  {
    name: 'Total Sessions',
    value: '12',
    change: '+2',
    changeType: 'increase',
    icon: DocumentTextIcon,
  },
  {
    name: 'Active Cookies',
    value: '347',
    change: '+12',
    changeType: 'increase',
    icon: CookieIcon,
  },
  {
    name: 'Platforms Tested',
    value: '8',
    change: '+1',
    changeType: 'increase',
    icon: GlobeAltIcon,
  },
  {
    name: 'Last Capture',
    value: '2m ago',
    change: 'Just now',
    changeType: 'neutral',
    icon: ClockIcon,
  },
];

const recentSessions = [
  {
    id: '1',
    name: 'Gmail Production Session',
    platform: 'Gmail',
    status: 'active',
    lastUsed: '2 minutes ago',
    cookies: 23,
  },
  {
    id: '2',
    name: 'GitHub Development',
    platform: 'GitHub',
    status: 'active',
    lastUsed: '1 hour ago',
    cookies: 15,
  },
  {
    id: '3',
    name: 'AWS Console Session',
    platform: 'AWS',
    status: 'expired',
    lastUsed: '2 days ago',
    cookies: 45,
  },
  {
    id: '4',
    name: 'Reddit Test Account',
    platform: 'Reddit',
    status: 'active',
    lastUsed: '5 hours ago',
    cookies: 18,
  },
];

const platformUsage = [
  { name: 'Gmail', sessions: 4, percentage: 33 },
  { name: 'GitHub', sessions: 3, percentage: 25 },
  { name: 'AWS', sessions: 2, percentage: 17 },
  { name: 'Reddit', sessions: 2, percentage: 17 },
  { name: 'Others', sessions: 1, percentage: 8 },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white"
      >
        <h2 className="text-2xl font-bold">Welcome to PSP</h2>
        <p className="mt-2 text-primary-100">
          Manage browser sessions across automation frameworks with ease. 
          Capture, store, and restore authentication states seamlessly.
        </p>
        <div className="mt-4 flex space-x-4">
          <button className="btn bg-white text-primary-600 hover:bg-primary-50">
            Create New Session
          </button>
          <button className="btn border border-primary-300 text-white hover:bg-primary-600">
            View Documentation
          </button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
            className="card"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <stat.icon className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <div className="flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  <span
                    className={`ml-2 text-sm font-medium ${
                      stat.changeType === 'increase'
                        ? 'text-green-600'
                        : stat.changeType === 'decrease'
                        ? 'text-red-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {stat.change}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sessions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Sessions</h3>
            <button className="text-sm text-primary-600 hover:text-primary-700">
              View all
            </button>
          </div>
          <div className="space-y-3">
            {recentSessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      session.status === 'active' ? 'bg-green-400' : 'bg-gray-300'
                    }`}
                  />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{session.name}</p>
                    <p className="text-xs text-gray-500">
                      {session.platform} • {session.cookies} cookies • {session.lastUsed}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="text-xs text-primary-600 hover:text-primary-700">
                    Use
                  </button>
                  <button className="text-xs text-gray-400 hover:text-gray-600">
                    Edit
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Platform Usage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Platform Usage</h3>
            <ChartBarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {platformUsage.map((platform, index) => (
              <motion.div
                key={platform.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900 w-16">
                    {platform.name}
                  </span>
                  <div className="ml-4 flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${platform.percentage}%` }}
                        transition={{ duration: 0.8, delay: 0.5 + index * 0.1 }}
                        className="bg-primary-600 h-2 rounded-full"
                      />
                    </div>
                  </div>
                </div>
                <div className="ml-4 flex items-center space-x-2">
                  <span className="text-sm text-gray-500">{platform.sessions}</span>
                  <span className="text-xs text-gray-400">{platform.percentage}%</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="card"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all">
            <DocumentTextIcon className="h-8 w-8 text-primary-600" />
            <div className="ml-3 text-left">
              <p className="text-sm font-medium text-gray-900">Create Session</p>
              <p className="text-xs text-gray-500">Start a new browser session</p>
            </div>
          </button>
          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all">
            <CookieIcon className="h-8 w-8 text-primary-600" />
            <div className="ml-3 text-left">
              <p className="text-sm font-medium text-gray-900">Manage Cookies</p>
              <p className="text-xs text-gray-500">View and edit stored cookies</p>
            </div>
          </button>
          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all">
            <UserGroupIcon className="h-8 w-8 text-primary-600" />
            <div className="ml-3 text-left">
              <p className="text-sm font-medium text-gray-900">Run Tests</p>
              <p className="text-xs text-gray-500">Test platform compatibility</p>
            </div>
          </button>
        </div>
      </motion.div>
    </div>
  );
}