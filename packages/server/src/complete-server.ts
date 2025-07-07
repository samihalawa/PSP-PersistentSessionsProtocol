import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { SimpleSession } from '@psp/core';
import { createPlaywrightAdapter } from '@psp/adapter-playwright';
import { createBrowserlessAdapter } from '@psp/adapter-browserless';
import { createBrowserUseAdapter } from '@psp/adapter-browser-use';
import { createSkyvernAdapter } from '@psp/adapter-skyvern';
import { createStagehandAdapter } from '@psp/adapter-stagehand';
import fs from 'fs';
import path from 'path';
import os from 'os';

interface PSPServerConfig {
  port?: number;
  host?: string;
  enableCors?: boolean;
  maxSessions?: number;
  sessionTimeout?: number;
  storageDir?: string;
}

export class PSPServer {
  private app: express.Application;
  private server: any;
  private wss?: WebSocketServer;
  private config: PSPServerConfig;
  private activeSessions: Map<string, any> = new Map();
  private adapters: Map<string, any> = new Map();

  constructor(config: PSPServerConfig = {}) {
    this.config = {
      port: 3000,
      host: '0.0.0.0',
      enableCors: true,
      maxSessions: 100,
      sessionTimeout: 3600000, // 1 hour
      storageDir: path.join(os.homedir(), '.psp'),
      ...config
    };

    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    
    if (this.config.enableCors) {
      this.app.use(cors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
      }));
    }

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });

    // Error handling
    this.app.use((err: any, req: any, res: any, next: any) => {
      console.error('Server error:', err);
      res.status(500).json({ error: err.message });
    });
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        activeSessions: this.activeSessions.size,
        version: '0.1.0'
      });
    });

    // Session management routes
    this.app.post('/api/sessions', async (req, res) => {
      try {
        const { name, description, adapter = 'playwright', config = {} } = req.body;
        
        if (this.activeSessions.size >= this.config.maxSessions!) {
          return res.status(429).json({ error: 'Maximum sessions limit reached' });
        }

        const sessionId = this.generateId();
        const metadata = {
          id: sessionId,
          name: name || `Session ${new Date().toISOString()}`,
          description: description || 'API created session',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          adapter
        };

        // Create adapter
        const adapterInstance = this.createAdapter(adapter, config);
        await adapterInstance.initialize();
        await adapterInstance.createSession(metadata);

        // Store session
        this.activeSessions.set(sessionId, {
          metadata,
          adapter: adapterInstance,
          adapterType: adapter,
          config,
          createdAt: Date.now(),
          lastActivity: Date.now()
        });

        // Save to disk
        await this.saveSession(sessionId, { metadata, adapter, config });

        res.json({ 
          sessionId, 
          metadata,
          adapter,
          status: 'created' 
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/sessions', async (req, res) => {
      try {
        const sessions = Array.from(this.activeSessions.entries()).map(([id, session]) => ({
          id,
          metadata: session.metadata,
          adapter: session.adapterType,
          createdAt: session.createdAt,
          lastActivity: session.lastActivity
        }));

        res.json({ sessions, count: sessions.length });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/sessions/:sessionId', async (req, res) => {
      try {
        const { sessionId } = req.params;
        const session = this.activeSessions.get(sessionId);

        if (!session) {
          return res.status(404).json({ error: 'Session not found' });
        }

        res.json({
          id: sessionId,
          metadata: session.metadata,
          adapter: session.adapterType,
          createdAt: session.createdAt,
          lastActivity: session.lastActivity,
          status: 'active'
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/sessions/:sessionId/capture', async (req, res) => {
      try {
        const { sessionId } = req.params;
        const session = this.activeSessions.get(sessionId);

        if (!session) {
          return res.status(404).json({ error: 'Session not found' });
        }

        const capturedData = await session.adapter.captureSession(sessionId);
        
        // Save captured data
        const captureDir = path.join(this.config.storageDir!, 'captures');
        fs.mkdirSync(captureDir, { recursive: true });
        
        const captureFile = path.join(captureDir, `${sessionId}-${Date.now()}.json`);
        fs.writeFileSync(captureFile, JSON.stringify(capturedData, null, 2));

        session.lastActivity = Date.now();

        res.json({ 
          sessionId, 
          capturedAt: capturedData.capturedAt,
          captureFile: path.basename(captureFile),
          status: 'captured' 
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/sessions/:sessionId/restore', async (req, res) => {
      try {
        const { sessionId } = req.params;
        const { sessionData } = req.body;

        if (!sessionData) {
          return res.status(400).json({ error: 'Session data required' });
        }

        let session = this.activeSessions.get(sessionId);
        
        if (!session) {
          // Create new session for restoration
          const adapter = this.createAdapter(sessionData.browserType || 'playwright', {});
          await adapter.initialize();
          
          session = {
            metadata: { id: sessionId, name: 'Restored Session' },
            adapter,
            adapterType: sessionData.browserType || 'playwright',
            createdAt: Date.now(),
            lastActivity: Date.now()
          };
          
          this.activeSessions.set(sessionId, session);
        }

        await session.adapter.restoreSession(sessionData);
        session.lastActivity = Date.now();

        res.json({ 
          sessionId, 
          status: 'restored',
          restoredAt: Date.now()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.delete('/api/sessions/:sessionId', async (req, res) => {
      try {
        const { sessionId } = req.params;
        const session = this.activeSessions.get(sessionId);

        if (!session) {
          return res.status(404).json({ error: 'Session not found' });
        }

        await session.adapter.cleanup();
        this.activeSessions.delete(sessionId);

        res.json({ sessionId, status: 'deleted' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Browser automation routes
    this.app.post('/api/sessions/:sessionId/navigate', async (req, res) => {
      try {
        const { sessionId } = req.params;
        const { url } = req.body;
        const session = this.activeSessions.get(sessionId);

        if (!session) {
          return res.status(404).json({ error: 'Session not found' });
        }

        const context = await session.adapter.getContext();
        const page = context.pages()[0] || await context.newPage();
        await page.goto(url);

        session.lastActivity = Date.now();

        res.json({ sessionId, url, status: 'navigated' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/sessions/:sessionId/click', async (req, res) => {
      try {
        const { sessionId } = req.params;
        const { selector } = req.body;
        const session = this.activeSessions.get(sessionId);

        if (!session) {
          return res.status(404).json({ error: 'Session not found' });
        }

        const context = await session.adapter.getContext();
        const page = context.pages()[0];
        
        if (!page) {
          return res.status(400).json({ error: 'No active page' });
        }

        await page.click(selector);
        session.lastActivity = Date.now();

        res.json({ sessionId, selector, status: 'clicked' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/sessions/:sessionId/fill', async (req, res) => {
      try {
        const { sessionId } = req.params;
        const { selector, value } = req.body;
        const session = this.activeSessions.get(sessionId);

        if (!session) {
          return res.status(404).json({ error: 'Session not found' });
        }

        const context = await session.adapter.getContext();
        const page = context.pages()[0];
        
        if (!page) {
          return res.status(400).json({ error: 'No active page' });
        }

        await page.fill(selector, value);
        session.lastActivity = Date.now();

        res.json({ sessionId, selector, value, status: 'filled' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/sessions/:sessionId/screenshot', async (req, res) => {
      try {
        const { sessionId } = req.params;
        const session = this.activeSessions.get(sessionId);

        if (!session) {
          return res.status(404).json({ error: 'Session not found' });
        }

        const context = await session.adapter.getContext();
        const page = context.pages()[0];
        
        if (!page) {
          return res.status(400).json({ error: 'No active page' });
        }

        const screenshot = await page.screenshot({ type: 'png' });
        session.lastActivity = Date.now();

        res.set('Content-Type', 'image/png');
        res.send(screenshot);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Workflow execution
    this.app.post('/api/sessions/:sessionId/workflow', async (req, res) => {
      try {
        const { sessionId } = req.params;
        const { workflow } = req.body;
        const session = this.activeSessions.get(sessionId);

        if (!session) {
          return res.status(404).json({ error: 'Session not found' });
        }

        const results = [];
        
        for (const step of workflow.steps || []) {
          try {
            const result = await this.executeWorkflowStep(session.adapter, step);
            results.push({ step: step.type, result, status: 'success' });
          } catch (error) {
            results.push({ step: step.type, error: error.message, status: 'failed' });
            
            if (step.required !== false) {
              break;
            }
          }
        }

        session.lastActivity = Date.now();

        res.json({ sessionId, results, status: 'completed' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Static file serving for UI
    this.app.use('/ui', express.static(path.join(__dirname, '../public')));
    
    // Serve the main UI
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });
  }

  private setupWebSocket() {
    this.wss = new WebSocketServer({ server: this.server });

    this.wss.on('connection', (ws, req) => {
      console.log('WebSocket connection established');

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          switch (data.type) {
            case 'subscribe':
              // Subscribe to session events
              break;
              
            case 'execute':
              // Execute commands in real-time
              break;
              
            default:
              ws.send(JSON.stringify({ error: 'Unknown message type' }));
          }
        } catch (error) {
          ws.send(JSON.stringify({ error: error.message }));
        }
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed');
      });
    });
  }

  private createAdapter(adapterType: string, config: any) {
    switch (adapterType) {
      case 'playwright':
        return createPlaywrightAdapter(config);
      case 'browserless':
        return createBrowserlessAdapter(config);
      case 'browser-use':
        return createBrowserUseAdapter(config);
      case 'skyvern':
        return createSkyvernAdapter(config);
      case 'stagehand':
        return createStagehandAdapter(config);
      default:
        throw new Error(`Unknown adapter: ${adapterType}`);
    }
  }

  private async executeWorkflowStep(adapter: any, step: any) {
    const context = await adapter.getContext();
    const page = context.pages()[0] || await context.newPage();

    switch (step.type) {
      case 'navigate':
        await page.goto(step.url);
        return { url: step.url };
        
      case 'click':
        await page.click(step.selector);
        return { selector: step.selector };
        
      case 'fill':
        await page.fill(step.selector, step.value);
        return { selector: step.selector, value: step.value };
        
      case 'wait':
        await page.waitForTimeout(step.duration || 1000);
        return { duration: step.duration };
        
      case 'extract':
        const data = await page.evaluate((selector: string) => {
          const elements = document.querySelectorAll(selector);
          return Array.from(elements).map(el => el.textContent);
        }, step.selector);
        return { selector: step.selector, data };
        
      // Adapter-specific steps
      case 'stagehand-act':
        if (adapter.act) {
          return await adapter.act(step.instruction, step.options);
        }
        throw new Error('Stagehand act not available');
        
      case 'stagehand-extract':
        if (adapter.extract) {
          return await adapter.extract(step.instruction, step.options);
        }
        throw new Error('Stagehand extract not available');
        
      default:
        throw new Error(`Unknown workflow step: ${step.type}`);
    }
  }

  private async saveSession(sessionId: string, sessionData: any) {
    const sessionDir = path.join(this.config.storageDir!, 'sessions');
    fs.mkdirSync(sessionDir, { recursive: true });
    
    const sessionFile = path.join(sessionDir, `${sessionId}.json`);
    fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private setupSessionCleanup() {
    setInterval(() => {
      const now = Date.now();
      
      for (const [sessionId, session] of this.activeSessions.entries()) {
        if (now - session.lastActivity > this.config.sessionTimeout!) {
          console.log(`Cleaning up inactive session: ${sessionId}`);
          session.adapter.cleanup().catch(console.error);
          this.activeSessions.delete(sessionId);
        }
      }
    }, 60000); // Check every minute
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = createServer(this.app);
      
      this.setupWebSocket();
      this.setupSessionCleanup();
      
      this.server.listen(this.config.port, this.config.host, () => {
        console.log(`🚀 PSP Server running on http://${this.config.host}:${this.config.port}`);
        console.log(`📊 Dashboard: http://${this.config.host}:${this.config.port}/ui`);
        console.log(`🔌 WebSocket: ws://${this.config.host}:${this.config.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    // Cleanup all active sessions
    for (const [sessionId, session] of this.activeSessions.entries()) {
      try {
        await session.adapter.cleanup();
      } catch (error) {
        console.error(`Error cleaning up session ${sessionId}:`, error);
      }
    }

    this.activeSessions.clear();

    if (this.wss) {
      this.wss.close();
    }

    if (this.server) {
      this.server.close();
    }
  }
}

// Export factory function
export function createPSPServer(config?: PSPServerConfig): PSPServer {
  return new PSPServer(config);
}

// CLI runner
if (require.main === module) {
  const server = new PSPServer({
    port: parseInt(process.env.PSP_PORT || '3000'),
    host: process.env.PSP_HOST || '0.0.0.0'
  });

  server.start().catch(console.error);

  process.on('SIGINT', async () => {
    console.log('\nShutting down PSP Server...');
    await server.stop();
    process.exit(0);
  });
}