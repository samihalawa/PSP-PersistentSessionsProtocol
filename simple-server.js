const express = require('express');
const http = require('http');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');

// Simple in-memory storage for demo
const sessions = new Map();
const sessionClients = new Map();

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Session routes
app.get('/sessions', (req, res) => {
  const sessionList = Array.from(sessions.values()).map(session => ({
    ...session.metadata,
    state: undefined // Don't include full state in list
  }));
  res.json(sessionList);
});

app.post('/sessions', (req, res) => {
  const { name, description, tags } = req.body;
  const id = uuidv4();
  const now = Date.now();

  const session = {
    metadata: {
      id,
      name,
      description,
      tags: tags || [],
      createdAt: now,
      updatedAt: now,
      createdWith: 'psp-server',
      status: 'inactive',
      participants: [],
      messages: [],
      participantCount: 0,
    },
    state: {
      version: '1.0.0',
      timestamp: now,
      origin: '',
      storage: {
        cookies: [],
        localStorage: {},
        sessionStorage: {},
      },
    },
  };

  sessions.set(id, session);
  res.status(201).json(session);
});

app.get('/sessions/:id', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
});

app.post('/sessions/:id/join', (req, res) => {
  const { participantName, participantId } = req.body;
  const session = sessions.get(req.params.id);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const participant = {
    id: participantId || uuidv4(),
    name: participantName,
    joinedAt: Date.now(),
    isActive: true,
  };

  session.metadata.participants.push(participant);
  session.metadata.status = 'active';
  session.metadata.participantCount = session.metadata.participants.filter(p => p.isActive).length;
  session.metadata.updatedAt = Date.now();

  const joinMessage = {
    id: uuidv4(),
    senderId: 'system',
    senderName: 'System',
    message: `${participantName} joined the session`,
    timestamp: Date.now(),
    type: 'system',
  };
  session.metadata.messages.push(joinMessage);

  // Broadcast to WebSocket clients
  broadcastSessionUpdate(req.params.id, {
    type: 'participant_joined',
    participant,
    session: session.metadata,
    message: joinMessage,
  });

  res.json({ success: true, participant, session: session.metadata });
});

app.get('/sessions/:id/participants', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({
    participants: session.metadata.participants,
    activeCount: session.metadata.participants.filter(p => p.isActive).length,
    totalCount: session.metadata.participants.length,
  });
});

app.post('/sessions/:id/messages', (req, res) => {
  const { message, senderId, senderName } = req.body;
  const session = sessions.get(req.params.id);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const newMessage = {
    id: uuidv4(),
    senderId,
    senderName: senderName || 'Unknown',
    message,
    timestamp: Date.now(),
    type: 'message',
  };

  session.metadata.messages.push(newMessage);
  session.metadata.updatedAt = Date.now();

  // Broadcast to WebSocket clients
  broadcastSessionEvent(req.params.id, {
    type: 'message',
    message: newMessage,
  });

  res.status(201).json({ success: true, message: newMessage });
});

app.get('/sessions/:id/messages', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({
    messages: session.metadata.messages,
    count: session.metadata.messages.length,
  });
});

app.post('/sessions/:id/terminate', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  session.metadata.status = 'terminated';
  session.metadata.updatedAt = Date.now();
  session.metadata.participants.forEach(p => p.isActive = false);

  const terminationMessage = {
    id: uuidv4(),
    senderId: 'system',
    senderName: 'System',
    message: 'Session has been terminated',
    timestamp: Date.now(),
    type: 'system',
  };
  session.metadata.messages.push(terminationMessage);

  // Broadcast to WebSocket clients
  broadcastSessionUpdate(req.params.id, {
    type: 'session_terminated',
    session: session.metadata,
    message: terminationMessage,
  });

  res.json({ success: true, message: 'Session terminated successfully', session: session.metadata });
});

app.get('/sessions/:id/export', (req, res) => {
  const format = req.query.format || 'json';
  const session = sessions.get(req.params.id);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const exportData = {
    metadata: session.metadata,
    state: session.state,
    exportedAt: Date.now(),
    exportFormat: format,
  };

  switch (format) {
    case 'json':
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="session-${req.params.id}.json"`);
      res.json(exportData);
      break;
    case 'csv':
      const csvContent = [
        'Field,Value',
        `ID,${session.metadata.id}`,
        `Name,"${session.metadata.name}"`,
        `Description,"${session.metadata.description || ''}"`,
        `Created,${new Date(session.metadata.createdAt).toISOString()}`,
        `Updated,${new Date(session.metadata.updatedAt).toISOString()}`,
        `Status,${session.metadata.status}`,
        `Participants,${session.metadata.participantCount}`,
        `Messages,${session.metadata.messages.length}`,
      ].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="session-${req.params.id}.csv"`);
      res.send(csvContent);
      break;
    default:
      res.status(400).json({ error: `Unsupported export format: ${format}` });
  }
});

// Create HTTP server
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleWebSocketMessage(ws, data);
    } catch (error) {
      console.error('Invalid WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    // Remove from all session subscriptions
    for (const [sessionId, clients] of sessionClients.entries()) {
      clients.delete(ws);
      if (clients.size === 0) {
        sessionClients.delete(sessionId);
      }
    }
  });
});

function handleWebSocketMessage(ws, message) {
  switch (message.type) {
    case 'subscribe':
      if (message.sessionId) {
        if (!sessionClients.has(message.sessionId)) {
          sessionClients.set(message.sessionId, new Set());
        }
        sessionClients.get(message.sessionId).add(ws);
        ws.send(JSON.stringify({ type: 'subscribed', sessionId: message.sessionId }));
      }
      break;
    case 'unsubscribe':
      if (message.sessionId && sessionClients.has(message.sessionId)) {
        sessionClients.get(message.sessionId).delete(ws);
      }
      break;
  }
}

function broadcastSessionUpdate(sessionId, data) {
  const clients = sessionClients.get(sessionId);
  if (clients) {
    const message = JSON.stringify({ type: 'session_update', sessionId, data });
    clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }
}

function broadcastSessionEvent(sessionId, data) {
  const clients = sessionClients.get(sessionId);
  if (clients) {
    const message = JSON.stringify({ type: 'session_event', sessionId, data });
    clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 PSP Server running on http://localhost:${PORT}`);
  console.log(`🔗 WebSocket available on ws://localhost:${PORT}`);
  console.log('\n📊 Available endpoints:');
  console.log('   GET    /sessions          - List all sessions');
  console.log('   POST   /sessions          - Create new session');
  console.log('   GET    /sessions/:id      - Get session details');
  console.log('   POST   /sessions/:id/join - Join a session');
  console.log('   GET    /sessions/:id/participants - Get participants');
  console.log('   POST   /sessions/:id/messages - Send message');
  console.log('   GET    /sessions/:id/messages - Get messages');
  console.log('   POST   /sessions/:id/terminate - Terminate session');
  console.log('   GET    /sessions/:id/export - Export session data');
});