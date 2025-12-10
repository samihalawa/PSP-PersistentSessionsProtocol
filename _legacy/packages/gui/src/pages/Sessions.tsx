import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PlusIcon, UserGroupIcon, ChatBubbleLeftEllipsisIcon, PowerIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useSessionStore, Session } from '../stores/sessionStore';
import SessionCreateModal from '../components/SessionCreateModal';
import SessionDetailModal from '../components/SessionDetailModal';
import SessionCard from '../components/SessionCard';
import toast from 'react-hot-toast';

export default function Sessions() {
  const {
    sessions,
    isLoading,
    error,
    fetchSessions,
    createSession,
    joinSession,
    terminateSession,
    sendMessage,
    connectWebSocket,
    disconnectWebSocket
  } = useSessionStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  useEffect(() => {
    // Load sessions and connect WebSocket
    fetchSessions();
    connectWebSocket();

    return () => {
      disconnectWebSocket();
    };
  }, [fetchSessions, connectWebSocket, disconnectWebSocket]);

  const handleCreateSession = async (sessionData: { name: string; description?: string; tags?: string[] }) => {
    try {
      await createSession(sessionData);
      setIsCreateModalOpen(false);
      toast.success('Session created successfully!');
    } catch (error) {
      toast.error('Failed to create session');
    }
  };

  const handleJoinSession = async (sessionId: string, participantName: string) => {
    try {
      await joinSession(sessionId, participantName);
      toast.success('Joined session successfully!');
    } catch (error) {
      toast.error('Failed to join session');
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      await terminateSession(sessionId);
      toast.success('Session terminated');
    } catch (error) {
      toast.error('Failed to terminate session');
    }
  };

  const filteredSessions = showActiveOnly 
    ? sessions.filter(session => session.status === 'active')
    : sessions;

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading sessions</h3>
              <div className="mt-2 text-sm text-red-700">
                {error}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
    >
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Session Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Create, join, and manage browser automation sessions in real-time
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
          <button
            type="button"
            onClick={() => setShowActiveOnly(!showActiveOnly)}
            className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium ${
              showActiveOnly 
                ? 'text-white bg-blue-600 border-blue-600' 
                : 'text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            <UserGroupIcon className="h-4 w-4 mr-2" />
            {showActiveOnly ? 'Show All' : 'Active Only'}
          </button>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Session
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Sessions
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {sessions.filter(s => s.status === 'active').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChatBubbleLeftEllipsisIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Sessions
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {sessions.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PowerIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Participants
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {sessions.reduce((sum, s) => sum + (s.participantCount || 0), 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowDownTrayIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Messages Today
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {sessions.reduce((sum, s) => sum + (s.messages?.length || 0), 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredSessions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="mx-auto h-24 w-24 text-gray-400">
            <UserGroupIcon className="h-full w-full" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {showActiveOnly ? 'No active sessions' : 'No sessions found'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {showActiveOnly 
              ? 'There are no active sessions at the moment.'
              : 'Get started by creating a new session.'
            }
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Session
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSessions.map((session, index) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <SessionCard
                session={session}
                onJoin={(participantName) => handleJoinSession(session.id, participantName)}
                onTerminate={() => handleTerminateSession(session.id)}
                onViewDetails={() => setSelectedSession(session)}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Modals */}
      <SessionCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSession}
      />

      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          isOpen={!!selectedSession}
          onClose={() => setSelectedSession(null)}
          onJoin={handleJoinSession}
          onSendMessage={(message, senderId, senderName) => 
            sendMessage(selectedSession.id, message, senderId, senderName)
          }
          onTerminate={() => {
            handleTerminateSession(selectedSession.id);
            setSelectedSession(null);
          }}
        />
      )}
    </motion.div>
  );
}