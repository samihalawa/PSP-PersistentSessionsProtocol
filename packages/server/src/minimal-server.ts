import express from 'express';
import cors from 'cors';
import { Session, SessionOptions } from '@psp/core';
import { PlaywrightAdapter } from '@psp/adapter-playwright';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'PSP Server', version: '0.1.0' });
});

/**
 * List all sessions
 */
app.get('/sessions', async (req, res) => {
  try {
    const adapter = new PlaywrightAdapter();
    const dummySession = await Session.create({
      name: 'temp',
      storage: 'local'
    } as SessionOptions, adapter);
    
    // Use the storage provider to list sessions
    const provider = (dummySession as any).storageProvider;
    const sessions = await provider.list();
    
    // Clean up temp session
    await dummySession.delete();
    
    res.json({ sessions });
  } catch (error) {
    console.error('Error listing sessions:', error);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

/**
 * Get a specific session
 */
app.get('/sessions/:id', async (req, res) => {
  try {
    const session = await Session.load(req.params.id);
    const metadata = session.getMetadata();
    const state = session.getState();
    
    res.json({ 
      metadata,
      state: {
        ...state,
        // Simplify for API response
        storage: {
          cookieCount: state.storage.cookies.length,
          localStorageKeys: Array.from(state.storage.localStorage.keys()),
          sessionStorageKeys: Array.from(state.storage.sessionStorage.keys())
        }
      }
    });
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(404).json({ error: 'Session not found' });
  }
});

/**
 * Capture session endpoint
 * POST /capture
 * Body: { name?: string, profileDir?: string }
 */
app.post('/capture', async (req, res) => {
  try {
    const { name, profileDir } = req.body;
    
    // For minimal version, we'll create a mock session
    // In a real implementation, this would capture from the provided profileDir
    const adapter = new PlaywrightAdapter();
    const session = await Session.create({
      name: name || `API Capture ${new Date().toISOString()}`,
      storage: 'local',
      description: `Captured from profile: ${profileDir || 'unknown'}`
    } as SessionOptions, adapter);
    
    // Mock some captured data
    const mockState = session.getState();
    mockState.origin = profileDir || 'file:///';
    mockState.storage.cookies.push({
      name: 'demo',
      value: 'captured',
      domain: 'localhost',
      path: '/',
      expires: null,
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
      partitioned: false
    });
    
    await session.save();
    
    res.json({ 
      id: session.getId(),
      message: 'Session captured successfully',
      profileDir: profileDir || 'mock'
    });
    
  } catch (error) {
    console.error('Error capturing session:', error);
    res.status(500).json({ error: 'Failed to capture session' });
  }
});

/**
 * Restore session endpoint  
 * POST /restore
 * Body: { id: string, profileDir?: string }
 */
app.post('/restore', async (req, res) => {
  try {
    const { id, profileDir } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    const session = await Session.load(id);
    const metadata = session.getMetadata();
    const state = session.getState();
    
    // In a real implementation, this would restore to the provided profileDir
    console.log(`Restoring session ${id} to profile: ${profileDir || 'default'}`);
    
    res.json({ 
      ok: true,
      message: 'Session restored successfully',
      sessionName: metadata.name,
      profileDir: profileDir || 'default',
      cookieCount: state.storage.cookies.length
    });
    
  } catch (error) {
    console.error('Error restoring session:', error);
    res.status(404).json({ error: 'Session not found or restore failed' });
  }
});

/**
 * Delete session endpoint
 */
app.delete('/sessions/:id', async (req, res) => {
  try {
    const session = await Session.load(req.params.id);
    await session.delete();
    
    res.json({ ok: true, message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(404).json({ error: 'Session not found' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 PSP Server running on http://localhost:${port}`);
  console.log(`📖 API Documentation:`);
  console.log(`  GET  /health           - Health check`);
  console.log(`  GET  /sessions         - List all sessions`);
  console.log(`  GET  /sessions/:id     - Get session details`);
  console.log(`  POST /capture          - Capture new session`);
  console.log(`  POST /restore          - Restore session`);
  console.log(`  DELETE /sessions/:id   - Delete session`);
});

export default app;