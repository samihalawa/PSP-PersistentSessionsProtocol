import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  UserGroupIcon, 
  ChatBubbleLeftEllipsisIcon, 
  ClockIcon,
  PowerIcon,
  EyeIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { Session } from '../stores/sessionStore';
import { formatDistanceToNow } from 'date-fns';

interface SessionCardProps {
  session: Session;
  onJoin: (participantName: string) => void;
  onTerminate: () => void;
  onViewDetails: () => void;
}

export default function SessionCard({ session, onJoin, onTerminate, onViewDetails }: SessionCardProps) {
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [participantName, setParticipantName] = useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (participantName.trim()) {
      onJoin(participantName.trim());
      setParticipantName('');
      setShowJoinForm(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'terminated':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-400';
      case 'terminated':
        return 'bg-red-400';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-200"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {session.name}
            </h3>
            {session.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {session.description}
              </p>
            )}
          </div>
          <div className="ml-4 flex-shrink-0">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
              <span className={`w-2 h-2 rounded-full mr-1.5 ${getStatusDot(session.status)}`}></span>
              {session.status}
            </span>
          </div>
        </div>

        {/* Tags */}
        {session.tags && session.tags.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {session.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                </span>
              ))}
              {session.tags.length > 3 && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                  +{session.tags.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="flex items-center">
            <UserGroupIcon className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-sm text-gray-600">
              {session.participantCount || 0}
            </span>
          </div>
          <div className="flex items-center">
            <ChatBubbleLeftEllipsisIcon className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-sm text-gray-600">
              {session.messages?.length || 0}
            </span>
          </div>
          <div className="flex items-center">
            <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-sm text-gray-600">
              {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Join Form */}
        {showJoinForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 border-t pt-4"
          >
            <form onSubmit={handleJoin}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="Enter your name"
                  className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                  required
                />
                <button
                  type="submit"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Join
                </button>
                <button
                  type="button"
                  onClick={() => setShowJoinForm(false)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onViewDetails}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <EyeIcon className="h-4 w-4 mr-2" />
            Details
          </button>

          {session.status !== 'terminated' && (
            <>
              {session.status === 'inactive' ? (
                <button
                  onClick={() => setShowJoinForm(!showJoinForm)}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                  {showJoinForm ? 'Cancel' : 'Join'}
                </button>
              ) : (
                <button
                  onClick={onTerminate}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <PowerIcon className="h-4 w-4 mr-2" />
                  Terminate
                </button>
              )}
            </>
          )}
        </div>

        {/* Recent Participants */}
        {session.participants && session.participants.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-medium text-gray-500 mb-2">Recent Participants</p>
            <div className="flex -space-x-1">
              {session.participants.slice(0, 5).map((participant, index) => (
                <div
                  key={participant.id}
                  className={`inline-flex items-center justify-center h-8 w-8 rounded-full text-xs font-medium text-white ring-2 ring-white ${
                    participant.isActive ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                  title={`${participant.name} ${participant.isActive ? '(active)' : '(inactive)'}`}
                >
                  {participant.name.slice(0, 2).toUpperCase()}
                </div>
              ))}
              {session.participants.length > 5 && (
                <div className="inline-flex items-center justify-center h-8 w-8 rounded-full text-xs font-medium text-gray-600 bg-gray-100 ring-2 ring-white">
                  +{session.participants.length - 5}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}