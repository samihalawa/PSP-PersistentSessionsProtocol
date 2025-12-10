import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Types
interface Session {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  createdWith: string;
  status: 'active' | 'inactive' | 'terminated';
  participants: Participant[];
  messages: Message[];
  participantCount: number;
}

interface Participant {
  id: string;
  name: string;
  joinedAt: number;
  isActive: boolean;
  role?: 'owner' | 'participant' | 'observer';
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: number;
  type: 'message' | 'system' | 'event';
}

interface SessionState {
  sessions: Session[];
  isLoading: boolean;
  error: string | null;
  wsConnection: WebSocket | null;
  connectedSessionId: string | null;
}

interface SessionActions {
  fetchSessions: () => Promise<void>;
  createSession: (sessionData: { name: string; description?: string; tags?: string[] }) => Promise<Session>;
  joinSession: (sessionId: string, participantName: string, participantId?: string) => Promise<void>;
  terminateSession: (sessionId: string) => Promise<void>;
  sendMessage: (sessionId: string, message: string, senderId: string, senderName: string) => Promise<void>;
  exportSession: (sessionId: string, format?: 'json' | 'csv' | 'yaml') => Promise<void>;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  subscribeToSession: (sessionId: string) => void;
  unsubscribeFromSession: (sessionId: string) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

export const useSessionStore = create<SessionState & SessionActions>()(
  subscribeWithSelector((set, get) => ({
    // State
    sessions: [],
    isLoading: false,
    error: null,
    wsConnection: null,
    connectedSessionId: null,

    // Actions
    fetchSessions: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch(`${API_BASE_URL}/sessions`);
        if (!response.ok) {
          throw new Error('Failed to fetch sessions');
        }
        const sessions = await response.json();
        set({ sessions, isLoading: false });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false });
      }
    },

    createSession: async (sessionData) => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch(`${API_BASE_URL}/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sessionData),
        });

        if (!response.ok) {
          throw new Error('Failed to create session');
        }

        const newSession = await response.json();
        set(state => ({
          sessions: [...state.sessions, newSession.metadata],
          isLoading: false
        }));

        return newSession;
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false });
        throw error;
      }
    },

    joinSession: async (sessionId, participantName, participantId) => {
      try {
        const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participantName,
            participantId: participantId || `user_${Date.now()}`,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to join session');
        }

        const result = await response.json();
        
        // Update the session in the store
        set(state => ({
          sessions: state.sessions.map(session =>
            session.id === sessionId ? result.session : session
          )
        }));

        // Subscribe to WebSocket updates for this session
        get().subscribeToSession(sessionId);

      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Unknown error' });
        throw error;
      }
    },

    terminateSession: async (sessionId) => {
      try {
        const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/terminate`, {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error('Failed to terminate session');
        }

        const result = await response.json();
        
        // Update the session in the store
        set(state => ({
          sessions: state.sessions.map(session =>
            session.id === sessionId ? result.session : session
          )
        }));

      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Unknown error' });
        throw error;
      }
    },

    sendMessage: async (sessionId, message, senderId, senderName) => {
      try {
        const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            senderId,
            senderName,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        // The message will be updated via WebSocket, so we don't need to update state here
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Unknown error' });
        throw error;
      }
    },

    exportSession: async (sessionId, format = 'json') => {
      try {
        const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/export?format=${format}`);
        
        if (!response.ok) {
          throw new Error('Failed to export session');
        }

        // Create download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
          : `session-${sessionId}.${format}`;
        
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Unknown error' });
        throw error;
      }
    },

    connectWebSocket: () => {
      const { wsConnection } = get();
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        return; // Already connected
      }

      const ws = new WebSocket(WS_BASE_URL);

      ws.onopen = () => {
        console.log('WebSocket connected');
        set({ wsConnection: ws, error: null });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'session_update':
              // Update session in store
              set(state => ({
                sessions: state.sessions.map(session =>
                  session.id === data.sessionId 
                    ? { ...session, ...data.data.session }
                    : session
                )
              }));
              break;
              
            case 'session_event':
              // Handle real-time events (like new messages)
              if (data.data.type === 'message') {
                set(state => ({
                  sessions: state.sessions.map(session => {
                    if (session.id === data.sessionId) {
                      return {
                        ...session,
                        messages: [...(session.messages || []), data.data.message]
                      };
                    }
                    return session;
                  })
                }));
              }
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        set({ error: 'WebSocket connection error' });
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        set({ wsConnection: null });
        
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (get().wsConnection === null) {
            get().connectWebSocket();
          }
        }, 3000);
      };

      set({ wsConnection: ws });
    },

    disconnectWebSocket: () => {
      const { wsConnection } = get();
      if (wsConnection) {
        wsConnection.close();
        set({ wsConnection: null, connectedSessionId: null });
      }
    },

    subscribeToSession: (sessionId) => {
      const { wsConnection } = get();
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(JSON.stringify({
          type: 'subscribe',
          sessionId,
        }));
        set({ connectedSessionId: sessionId });
      }
    },

    unsubscribeFromSession: (sessionId) => {
      const { wsConnection } = get();
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(JSON.stringify({
          type: 'unsubscribe',
          sessionId,
        }));
        
        if (get().connectedSessionId === sessionId) {
          set({ connectedSessionId: null });
        }
      }
    },
  }))
);

// Export types for use in components
export type { Session, Participant, Message };