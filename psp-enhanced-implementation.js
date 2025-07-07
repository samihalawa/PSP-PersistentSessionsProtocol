const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');
const WebSocket = require('ws');
const { HyperBrowserAdapter } = require('./packages/adapters/hyperbrowser/dist');
const { StagehandAdapter } = require('./packages/adapters/stagehand/dist');
const { SkyvernAdapter } = require('./packages/adapters/skyvern/dist');

class EnhancedSessionManager {
  constructor(options = {}) {
    this.sessionsDir = options.sessionsDir || './sessions';
    this.adapters = new Map();
    this.activeContexts = new Map();
    this.websocketServer = null;
    this.aiConfig = options.aiConfig || {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 4000
    };
    this.stealthConfig = options.stealthConfig || this.getDefaultStealthConfig();
    
    this.registerDefaultAdapters();
  }

  registerDefaultAdapters() {
    this.adapters.set('hyperbrowser', new HyperBrowserAdapter({
      aiConfig: this.aiConfig,
      stealthConfig: this.stealthConfig,
      sessionDir: this.sessionsDir
    }));
    
    this.adapters.set('stagehand', new StagehandAdapter({
      sessionDir: this.sessionsDir
    }));
    
    this.adapters.set('skyvern', new SkyvernAdapter({
      sessionDir: this.sessionsDir
    }));
  }

  getDefaultStealthConfig() {
    return {
      useUndetectedChrome: true,
      disableWebSecurity: true,
      disableFeatures: ['VizDisplayCompositor'],
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled',
        '--exclude-switches=enable-automation'
      ],
      fingerprint: {
        canvas: true,
        webgl: true,
        audioContext: true,
        timezone: 'America/New_York',
        language: 'en-US',
        platform: 'MacIntel',
        hardwareConcurrency: 8
      }
    };
  }

  async initializeWebSocketServer(port = 8080) {
    this.websocketServer = new WebSocket.Server({ port });
    
    this.websocketServer.on('connection', (ws, req) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const sessionId = url.pathname.split('/').pop();
      
      console.log(`WebSocket connected for session: ${sessionId}`);
      
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data);
          const response = await this.handleWebSocketMessage(sessionId, message);
          ws.send(JSON.stringify(response));
        } catch (error) {
          ws.send(JSON.stringify({ error: error.message }));
        }
      });
    });

    console.log(`PSP WebSocket server running on port ${port}`);
  }

  async handleWebSocketMessage(sessionId, message) {
    const { type, adapter: adapterName, ...payload } = message;
    const adapter = this.adapters.get(adapterName || 'hyperbrowser');

    if (!adapter) {
      throw new Error(`Adapter ${adapterName} not found`);
    }

    switch (type) {
      case 'ai_action':
        return await adapter.executeAIAction(payload.instruction);
      
      case 'ai_extract':
        return await adapter.extractWithAI(payload.instruction);
      
      case 'capture_session':
        return await adapter.captureSession(payload.options);
      
      case 'restore_session':
        return await adapter.restoreSession(payload.sessionData);
      
      case 'navigate':
        await adapter.navigate(payload.url);
        return { success: true };
      
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  }

  async createSession(sessionId, options = {}) {
    const sessionPath = path.join(this.sessionsDir, sessionId);
    await fs.mkdir(sessionPath, { recursive: true });

    const sessionMetadata = {
      id: sessionId,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      adapter: options.adapter || 'hyperbrowser',
      aiEnabled: options.aiEnabled !== false,
      stealthMode: options.stealthMode !== false,
      options: options
    };

    await fs.writeFile(
      path.join(sessionPath, 'metadata.json'),
      JSON.stringify(sessionMetadata, null, 2)
    );

    return sessionMetadata;
  }

  async launchWithAdapter(sessionId, adapterName = 'hyperbrowser', options = {}) {
    const adapter = this.adapters.get(adapterName);
    if (!adapter) {
      throw new Error(`Adapter ${adapterName} not found`);
    }

    const launchOptions = {
      ...options,
      sessionDir: this.sessionsDir,
      aiConfig: this.aiConfig,
      stealthConfig: this.stealthConfig,
      enableWebSocket: true
    };

    await adapter.launch(sessionId, launchOptions);
    this.activeContexts.set(sessionId, { adapter: adapterName, instance: adapter });

    console.log(`Session ${sessionId} launched with ${adapterName} adapter`);
    return adapter;
  }

  async executeAIWorkflow(sessionId, workflow) {
    const sessionInfo = this.activeContexts.get(sessionId);
    if (!sessionInfo) {
      throw new Error(`Session ${sessionId} not active`);
    }

    const adapter = sessionInfo.instance;
    const results = [];

    for (const step of workflow.steps) {
      try {
        let result;
        
        switch (step.type) {
          case 'navigate':
            await adapter.navigate(step.url);
            result = { success: true, step: step.description };
            break;
            
          case 'ai_action':
            result = await adapter.executeAIAction(step.instruction);
            break;
            
          case 'ai_extract':
            result = await adapter.extractWithAI(step.instruction);
            break;
            
          case 'capture':
            result = await adapter.captureSession();
            break;
            
          case 'wait':
            await new Promise(resolve => setTimeout(resolve, step.duration || 1000));
            result = { success: true, step: 'waited' };
            break;
            
          default:
            throw new Error(`Unknown workflow step type: ${step.type}`);
        }
        
        results.push({ step: step.description, result, success: true });
        
        if (step.saveSession) {
          await this.captureSession(sessionId);
        }
        
      } catch (error) {
        results.push({ 
          step: step.description, 
          error: error.message, 
          success: false 
        });
        
        if (step.stopOnError !== false) {
          break;
        }
      }
    }

    return {
      workflowId: workflow.id,
      sessionId,
      results,
      completedSteps: results.filter(r => r.success).length,
      totalSteps: workflow.steps.length
    };
  }

  async captureSession(sessionId, options = {}) {
    const sessionInfo = this.activeContexts.get(sessionId);
    if (!sessionInfo) {
      throw new Error(`Session ${sessionId} not active`);
    }

    const adapter = sessionInfo.instance;
    const sessionData = await adapter.captureSession(options);
    
    const sessionPath = path.join(this.sessionsDir, sessionId);
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const captureFile = path.join(sessionPath, `capture-${timestamp}.json`);
    
    await fs.writeFile(captureFile, JSON.stringify(sessionData, null, 2));
    
    await this.updateSessionMetadata(sessionId, {
      lastCaptured: new Date().toISOString(),
      lastCaptureFile: captureFile
    });

    return { sessionData, captureFile };
  }

  async restoreSession(sessionId, captureFile = null) {
    const sessionInfo = this.activeContexts.get(sessionId);
    if (!sessionInfo) {
      throw new Error(`Session ${sessionId} not active`);
    }

    if (!captureFile) {
      const metadata = await this.getSessionMetadata(sessionId);
      captureFile = metadata.lastCaptureFile;
    }

    if (!captureFile) {
      throw new Error(`No capture file found for session ${sessionId}`);
    }

    const sessionData = JSON.parse(await fs.readFile(captureFile, 'utf-8'));
    const adapter = sessionInfo.instance;
    
    await adapter.restoreSession(sessionData);
    
    await this.updateSessionMetadata(sessionId, {
      lastRestored: new Date().toISOString(),
      lastRestoreFile: captureFile
    });

    return sessionData;
  }

  async listSessions() {
    try {
      const sessions = await fs.readdir(this.sessionsDir);
      const sessionList = [];

      for (const sessionId of sessions) {
        try {
          const metadata = await this.getSessionMetadata(sessionId);
          sessionList.push(metadata);
        } catch (error) {
          console.warn(`Failed to read metadata for session ${sessionId}:`, error.message);
        }
      }

      return sessionList.sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed));
    } catch (error) {
      return [];
    }
  }

  async getSessionMetadata(sessionId) {
    const metadataPath = path.join(this.sessionsDir, sessionId, 'metadata.json');
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
    return metadata;
  }

  async updateSessionMetadata(sessionId, updates) {
    const metadata = await this.getSessionMetadata(sessionId);
    const updatedMetadata = { ...metadata, ...updates, lastAccessed: new Date().toISOString() };
    
    const metadataPath = path.join(this.sessionsDir, sessionId, 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(updatedMetadata, null, 2));
    
    return updatedMetadata;
  }

  async deleteSession(sessionId) {
    const sessionInfo = this.activeContexts.get(sessionId);
    if (sessionInfo) {
      await sessionInfo.instance.close();
      this.activeContexts.delete(sessionId);
    }

    const sessionPath = path.join(this.sessionsDir, sessionId);
    await fs.rm(sessionPath, { recursive: true, force: true });
  }

  async closeSession(sessionId) {
    const sessionInfo = this.activeContexts.get(sessionId);
    if (sessionInfo) {
      await sessionInfo.instance.close();
      this.activeContexts.delete(sessionId);
    }
  }

  async cleanup() {
    for (const [sessionId, sessionInfo] of this.activeContexts) {
      try {
        await sessionInfo.instance.close();
      } catch (error) {
        console.warn(`Error closing session ${sessionId}:`, error.message);
      }
    }
    
    this.activeContexts.clear();
    
    if (this.websocketServer) {
      this.websocketServer.close();
    }
  }

  getAdapterInfo() {
    const adapters = {};
    for (const [name, adapter] of this.adapters) {
      adapters[name] = adapter.getAdapterInfo();
    }
    return adapters;
  }
}

class PSPWorkflowBuilder {
  constructor() {
    this.workflow = {
      id: `workflow-${Date.now()}`,
      name: '',
      description: '',
      steps: []
    };
  }

  setName(name) {
    this.workflow.name = name;
    return this;
  }

  setDescription(description) {
    this.workflow.description = description;
    return this;
  }

  navigate(url, description = 'Navigate to URL') {
    this.workflow.steps.push({
      type: 'navigate',
      url,
      description
    });
    return this;
  }

  aiAction(instruction, description = 'Execute AI action') {
    this.workflow.steps.push({
      type: 'ai_action',
      instruction,
      description
    });
    return this;
  }

  aiExtract(instruction, description = 'Extract data with AI') {
    this.workflow.steps.push({
      type: 'ai_extract',
      instruction,
      description
    });
    return this;
  }

  capture(description = 'Capture session state') {
    this.workflow.steps.push({
      type: 'capture',
      description
    });
    return this;
  }

  wait(duration, description = 'Wait') {
    this.workflow.steps.push({
      type: 'wait',
      duration,
      description: `${description} (${duration}ms)`
    });
    return this;
  }

  build() {
    return this.workflow;
  }
}

async function demonstrateEnhancedPSP() {
  const psp = new EnhancedSessionManager({
    aiConfig: {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.7
    }
  });

  await psp.initializeWebSocketServer(8080);

  const sessionId = `enhanced-demo-${Date.now()}`;
  await psp.createSession(sessionId, { 
    adapter: 'hyperbrowser',
    aiEnabled: true,
    stealthMode: true 
  });

  const adapter = await psp.launchWithAdapter(sessionId, 'hyperbrowser', {
    headless: false,
    aiConfig: psp.aiConfig,
    stealthConfig: psp.stealthConfig
  });

  const workflow = new PSPWorkflowBuilder()
    .setName('Gmail Authentication Demo')
    .setDescription('Demonstrate AI-driven Gmail login with session persistence')
    .navigate('https://gmail.com', 'Navigate to Gmail')
    .capture('Capture initial state')
    .aiAction('Click on the sign-in button if visible', 'Initiate sign-in process')
    .wait(2000, 'Wait for page load')
    .aiExtract('Extract current page title and any visible form fields', 'Analyze current state')
    .capture('Capture post-navigation state')
    .build();

  console.log('Executing enhanced PSP workflow...');
  const workflowResult = await psp.executeAIWorkflow(sessionId, workflow);
  
  console.log('Workflow Results:', JSON.stringify(workflowResult, null, 2));

  console.log('\nSession preserved. Closing browser...');
  await psp.closeSession(sessionId);

  console.log('Relaunching with preserved session...');
  const restoredAdapter = await psp.launchWithAdapter(sessionId, 'hyperbrowser', {
    headless: false
  });

  await restoredAdapter.navigate('https://gmail.com');
  
  const authStatus = await restoredAdapter.extractWithAI(
    'Determine if the user is already logged into Gmail by checking for account indicators, inbox elements, or login forms'
  );
  
  console.log('Authentication Status:', authStatus);

  await new Promise(resolve => setTimeout(resolve, 5000));
  await psp.cleanup();
}

if (require.main === module) {
  demonstrateEnhancedPSP().catch(console.error);
}

module.exports = { 
  EnhancedSessionManager, 
  PSPWorkflowBuilder,
  demonstrateEnhancedPSP 
};