import React, { useState, useEffect, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
  XMarkIcon, 
  UserGroupIcon, 
  ChatBubbleLeftEllipsisIcon,
  PaperAirplaneIcon,
  ArrowDownTrayIcon,
  PowerIcon
} from '@heroicons/react/24/outline';
import { Session, Message, Participant } from '../stores/sessionStore';
import { formatDistanceToNow, format } from 'date-fns';

interface SessionDetailModalProps {
  session: Session;
  isOpen: boolean;
  onClose: () => void;
  onJoin: (sessionId: string, participantName: string) => void;
  onSendMessage: (message: string, senderId: string, senderName: string) => void;
  onTerminate: () => void;
}

export default function SessionDetailModal({ 
  session, 
  isOpen, 
  onClose, 
  onJoin, 
  onSendMessage, 
  onTerminate 
}: SessionDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'participants' | 'messages'>('overview');
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [participantName, setParticipantName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session.messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && currentUser) {
      onSendMessage(newMessage.trim(), currentUser.id, currentUser.name);
      setNewMessage('');
    }
  };

  const handleJoinSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (participantName.trim()) {
      const userId = `user_${Date.now()}`;
      setCurrentUser({ id: userId, name: participantName.trim() });
      onJoin(session.id, participantName.trim());
      setShowJoinForm(false);
      setParticipantName('');
    }
  };

  const handleExport = async (format: 'json' | 'csv' | 'yaml') => {
    try {
      const response = await fetch(`http://localhost:3000/sessions/${session.id}/export?format=${format}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `session-${session.id}.${format}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const isUserInSession = currentUser && session.participants?.some(p => p.id === currentUser.id && p.isActive);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                        {session.name}
                      </Dialog.Title>
                      <p className="mt-1 text-sm text-gray-500">
                        Created {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        session.status === 'active' ? 'bg-green-100 text-green-800' :
                        session.status === 'terminated' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {session.status}
                      </span>
                      <button
                        type="button"
                        className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        onClick={onClose}
                      >
                        <span className="sr-only">Close</span>
                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="mt-4">
                    <nav className="flex space-x-8" aria-label="Tabs">
                      {[
                        { id: 'overview', name: 'Overview', icon: UserGroupIcon },
                        { id: 'participants', name: 'Participants', icon: UserGroupIcon },
                        { id: 'messages', name: 'Messages', icon: ChatBubbleLeftEllipsisIcon },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`${
                            activeTab === tab.id
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
                        >
                          <tab.icon className="h-4 w-4 mr-2" />
                          {tab.name}
                          {tab.id === 'participants' && session.participants && (
                            <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                              {session.participants.filter(p => p.isActive).length}
                            </span>
                          )}
                          {tab.id === 'messages' && session.messages && (
                            <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                              {session.messages.length}
                            </span>
                          )}
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-4 max-h-96 overflow-y-auto">
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      {/* Description */}
                      {session.description && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
                          <p className="text-sm text-gray-600">{session.description}</p>
                        </div>
                      )}

                      {/* Tags */}
                      {session.tags && session.tags.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Tags</h4>
                          <div className="flex flex-wrap gap-2">
                            {session.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Stats */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Session Statistics</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-2xl font-bold text-gray-900">{session.participantCount || 0}</div>
                            <div className="text-xs text-gray-500">Active Participants</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-2xl font-bold text-gray-900">{session.messages?.length || 0}</div>
                            <div className="text-xs text-gray-500">Messages Sent</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-2xl font-bold text-gray-900">
                              {format(new Date(session.createdAt), 'MMM d')}
                            </div>
                            <div className="text-xs text-gray-500">Created Date</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-2xl font-bold text-gray-900">
                              {formatDistanceToNow(new Date(session.updatedAt))}
                            </div>
                            <div className="text-xs text-gray-500">Last Activity</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'participants' && (
                    <div className="space-y-4">
                      {session.participants && session.participants.length > 0 ? (
                        session.participants.map((participant) => (
                          <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium text-white ${
                                participant.isActive ? 'bg-green-500' : 'bg-gray-400'
                              }`}>
                                {participant.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900">{participant.name}</p>
                                <p className="text-xs text-gray-500">
                                  Joined {formatDistanceToNow(new Date(participant.joinedAt), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              participant.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {participant.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No participants</h3>
                          <p className="mt-1 text-sm text-gray-500">Be the first to join this session!</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'messages' && (
                    <div className="space-y-4">
                      {session.messages && session.messages.length > 0 ? (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {session.messages.map((message) => (
                            <div key={message.id} className={`flex ${message.type === 'system' ? 'justify-center' : 'justify-start'}`}>
                              <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                                message.type === 'system' 
                                  ? 'bg-gray-100 text-gray-600 text-sm'
                                  : 'bg-blue-500 text-white'
                              }`}>
                                {message.type !== 'system' && (
                                  <p className="text-xs opacity-75 mb-1">{message.senderName}</p>
                                )}
                                <p className="text-sm">{message.message}</p>
                                <p className="text-xs opacity-75 mt-1">
                                  {format(new Date(message.timestamp), 'HH:mm')}
                                </p>
                              </div>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <ChatBubbleLeftEllipsisIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No messages</h3>
                          <p className="mt-1 text-sm text-gray-500">Start the conversation!</p>
                        </div>
                      )}

                      {/* Message Input */}
                      {isUserInSession && session.status === 'active' && (
                        <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t">
                          <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                          <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <PaperAirplaneIcon className="h-4 w-4" />
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      {/* Export Options */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleExport('json')}
                          className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <ArrowDownTrayIcon className="h-3 w-3 mr-1" />
                          JSON
                        </button>
                        <button
                          onClick={() => handleExport('csv')}
                          className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <ArrowDownTrayIcon className="h-3 w-3 mr-1" />
                          CSV
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      {!isUserInSession && session.status !== 'terminated' && (
                        <>
                          {showJoinForm ? (
                            <form onSubmit={handleJoinSession} className="flex gap-2">
                              <input
                                type="text"
                                value={participantName}
                                onChange={(e) => setParticipantName(e.target.value)}
                                placeholder="Your name"
                                className="px-3 py-1 border border-gray-300 rounded text-sm"
                                required
                              />
                              <button
                                type="submit"
                                className="inline-flex items-center px-3 py-1 border border-transparent shadow-sm text-sm font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                              >
                                Join
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowJoinForm(false)}
                                className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </form>
                          ) : (
                            <button
                              onClick={() => setShowJoinForm(true)}
                              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                            >
                              Join Session
                            </button>
                          )}
                        </>
                      )}

                      {session.status === 'active' && (
                        <button
                          onClick={onTerminate}
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                        >
                          <PowerIcon className="h-4 w-4 mr-2" />
                          Terminate
                        </button>
                      )}

                      <button
                        type="button"
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        onClick={onClose}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}