const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');
const WebSocket = require('ws');

class AdvancedPSPManager {
  constructor(options = {}) {
    this.sessionsDir = options.sessionsDir || './sessions';
    this.activeContexts = new Map();
    this.stealthMode = options.stealthMode !== false;
    this.aiEnabled = options.aiEnabled !== false;
  }

  getStealthLaunchOptions() {
    return {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled',
        '--exclude-switches=enable-automation',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-default-apps',
        '--disable-popup-blocking',
        '--disable-translate'
      ],
      ignoreDefaultArgs: ['--enable-automation'],
      ignoreHTTPSErrors: true
    };
  }

  async createAdvancedSession(sessionId, options = {}) {
    const sessionPath = path.join(this.sessionsDir, sessionId);
    await fs.mkdir(sessionPath, { recursive: true });

    const sessionMetadata = {
      id: sessionId,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      stealthMode: this.stealthMode,
      aiEnabled: this.aiEnabled,
      capabilities: ['session_persistence', 'stealth_browsing', 'ai_automation'],
      options: options
    };

    await fs.writeFile(
      path.join(sessionPath, 'metadata.json'),
      JSON.stringify(sessionMetadata, null, 2)
    );

    return sessionMetadata;
  }

  async launchAdvancedSession(sessionId, options = {}) {
    const sessionPath = path.join(this.sessionsDir, sessionId);
    
    const launchOptions = {
      ...this.getStealthLaunchOptions(),
      headless: options.headless ?? false,
      userDataDir: sessionPath,
      ...options
    };

    const context = await chromium.launchPersistentContext(sessionPath, launchOptions);
    
    if (this.stealthMode) {
      await this.setupStealthMode(context);
    }

    this.activeContexts.set(sessionId, {
      context,
      createdAt: new Date(),
      capabilities: ['advanced_stealth', 'ai_ready', 'session_persistent']
    });

    console.log(`🚀 Advanced session ${sessionId} launched with enhanced capabilities`);
    return context;
  }

  async setupStealthMode(context) {
    const page = context.pages()[0] || await context.newPage();
    
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      window.chrome = {
        runtime: {},
      };

      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter(parameter);
      };
    });

    console.log('🕵️ Stealth mode activated');
  }

  async captureAdvancedSession(sessionId) {
    const sessionInfo = this.activeContexts.get(sessionId);
    if (!sessionInfo) {
      throw new Error(`Session ${sessionId} not active`);
    }

    const context = sessionInfo.context;
    const page = context.pages()[0];
    
    const sessionData = {
      timestamp: new Date().toISOString(),
      url: page ? page.url() : null,
      userAgent: page ? await page.evaluate(() => navigator.userAgent) : null,
      cookies: await context.cookies(),
      storageState: await context.storageState(),
      viewport: page ? page.viewportSize() : null,
      capabilities: sessionInfo.capabilities,
      screenshots: []
    };

    if (page) {
      try {
        const screenshot = await page.screenshot({ type: 'png' });
        sessionData.screenshots.push({
          timestamp: new Date().toISOString(),
          size: screenshot.length,
          type: 'png'
        });
        
        const sessionPath = path.join(this.sessionsDir, sessionId);
        await fs.writeFile(
          path.join(sessionPath, `screenshot-${Date.now()}.png`), 
          screenshot
        );
      } catch (error) {
        console.warn('Screenshot capture failed:', error.message);
      }
    }

    const sessionPath = path.join(this.sessionsDir, sessionId);
    const captureFile = path.join(sessionPath, `capture-${Date.now()}.json`);
    await fs.writeFile(captureFile, JSON.stringify(sessionData, null, 2));

    console.log(`📸 Session ${sessionId} captured to ${captureFile}`);
    return { sessionData, captureFile };
  }

  async executeAdvancedWorkflow(sessionId, workflow) {
    const sessionInfo = this.activeContexts.get(sessionId);
    if (!sessionInfo) {
      throw new Error(`Session ${sessionId} not active`);
    }

    const context = sessionInfo.context;
    const page = context.pages()[0] || await context.newPage();
    const results = [];

    console.log(`🔄 Executing workflow: ${workflow.name || 'Unnamed'}`);

    for (const [index, step] of workflow.steps.entries()) {
      try {
        console.log(`  Step ${index + 1}: ${step.description}`);
        let result;

        switch (step.type) {
          case 'navigate':
            await page.goto(step.url);
            result = { success: true, url: step.url };
            break;

          case 'screenshot':
            const screenshot = await page.screenshot({ type: 'png' });
            const sessionPath = path.join(this.sessionsDir, sessionId);
            const screenshotPath = path.join(sessionPath, `step-${index}-${Date.now()}.png`);
            await fs.writeFile(screenshotPath, screenshot);
            result = { success: true, screenshotPath };
            break;

          case 'wait':
            await new Promise(resolve => setTimeout(resolve, step.duration || 1000));
            result = { success: true, waited: step.duration || 1000 };
            break;

          case 'evaluate':
            const evalResult = await page.evaluate(step.script);
            result = { success: true, result: evalResult };
            break;

          case 'capture':
            const captureResult = await this.captureAdvancedSession(sessionId);
            result = { success: true, captureFile: captureResult.captureFile };
            break;

          default:
            throw new Error(`Unknown step type: ${step.type}`);
        }

        results.push({ step: step.description, result, success: true });
        console.log(`    ✅ Completed`);

      } catch (error) {
        results.push({ 
          step: step.description, 
          error: error.message, 
          success: false 
        });
        console.log(`    ❌ Failed: ${error.message}`);
        
        if (step.stopOnError !== false) {
          break;
        }
      }
    }

    return {
      workflowId: workflow.id || `workflow-${Date.now()}`,
      sessionId,
      results,
      completedSteps: results.filter(r => r.success).length,
      totalSteps: workflow.steps.length
    };
  }

  async closeSession(sessionId) {
    const sessionInfo = this.activeContexts.get(sessionId);
    if (sessionInfo) {
      await sessionInfo.context.close();
      this.activeContexts.delete(sessionId);
      console.log(`🔒 Session ${sessionId} closed`);
    }
  }

  async listSessions() {
    try {
      const sessions = await fs.readdir(this.sessionsDir);
      const sessionList = [];

      for (const sessionId of sessions) {
        try {
          const metadataPath = path.join(this.sessionsDir, sessionId, 'metadata.json');
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
          sessionList.push(metadata);
        } catch (error) {
          console.warn(`Failed to read metadata for session ${sessionId}`);
        }
      }

      return sessionList.sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed));
    } catch (error) {
      return [];
    }
  }

  getActiveSessionsCount() {
    return this.activeContexts.size;
  }

  async cleanup() {
    for (const [sessionId, sessionInfo] of this.activeContexts) {
      try {
        await sessionInfo.context.close();
      } catch (error) {
        console.warn(`Error closing session ${sessionId}:`, error.message);
      }
    }
    this.activeContexts.clear();
    console.log('🧹 Cleanup completed');
  }
}

class WorkflowBuilder {
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
    this.workflow.steps.push({ type: 'navigate', url, description });
    return this;
  }

  screenshot(description = 'Take screenshot') {
    this.workflow.steps.push({ type: 'screenshot', description });
    return this;
  }

  wait(duration, description = 'Wait') {
    this.workflow.steps.push({ type: 'wait', duration, description: `${description} (${duration}ms)` });
    return this;
  }

  evaluate(script, description = 'Execute JavaScript') {
    this.workflow.steps.push({ type: 'evaluate', script, description });
    return this;
  }

  capture(description = 'Capture session state') {
    this.workflow.steps.push({ type: 'capture', description });
    return this;
  }

  build() {
    return this.workflow;
  }
}

async function demonstrateAdvancedPSP() {
  console.log('🌟 PSP Advanced Implementation Demo');
  console.log('=====================================');

  const psp = new AdvancedPSPManager({
    stealthMode: true,
    aiEnabled: true
  });

  const sessionId = `advanced-demo-${Date.now()}`;
  
  console.log(`\n📋 Creating advanced session: ${sessionId}`);
  await psp.createAdvancedSession(sessionId, { 
    stealthMode: true,
    aiCapabilities: ['dom_analysis', 'interaction_automation']
  });

  console.log('\n🚀 Launching browser with advanced capabilities...');
  const context = await psp.launchAdvancedSession(sessionId, {
    headless: false
  });

  const workflow = new WorkflowBuilder()
    .setName('Advanced PSP Authentication Test')
    .setDescription('Demonstrate advanced session management with stealth mode')
    .navigate('https://gmail.com', 'Navigate to Gmail')
    .screenshot('Initial state screenshot')
    .wait(3000, 'Wait for page load')
    .evaluate(`document.title`, 'Get page title')
    .capture('Capture session state')
    .build();

  console.log('\n🔄 Executing advanced workflow...');
  const workflowResult = await psp.executeAdvancedWorkflow(sessionId, workflow);
  
  console.log('\n📊 Workflow Results:');
  console.log(`  - Completed: ${workflowResult.completedSteps}/${workflowResult.totalSteps} steps`);
  console.log(`  - Success Rate: ${Math.round(workflowResult.completedSteps / workflowResult.totalSteps * 100)}%`);

  console.log('\n💾 Final session capture...');
  const finalCapture = await psp.captureAdvancedSession(sessionId);
  console.log(`  - Capture saved to: ${finalCapture.captureFile}`);

  console.log('\n🔒 Closing session and testing persistence...');
  await psp.closeSession(sessionId);

  console.log('\n🔄 Relaunching session to test persistence...');
  const restoredContext = await psp.launchAdvancedSession(sessionId, {
    headless: false
  });

  const page = restoredContext.pages()[0] || await restoredContext.newPage();
  await page.goto('https://gmail.com');
  
  console.log('\n📸 Taking final verification screenshot...');
  await page.screenshot({ path: `./sessions/${sessionId}/final-verification.png` });

  console.log('\n📈 Session Statistics:');
  const sessions = await psp.listSessions();
  console.log(`  - Total sessions: ${sessions.length}`);
  console.log(`  - Active sessions: ${psp.getActiveSessionsCount()}`);

  console.log('\n⏱️ Waiting 5 seconds for manual verification...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('\n🧹 Cleaning up...');
  await psp.cleanup();

  console.log('\n✅ Advanced PSP demonstration completed successfully!');
  console.log('🎯 Key features demonstrated:');
  console.log('   - Advanced stealth mode');
  console.log('   - Session persistence across restarts');
  console.log('   - Workflow automation');
  console.log('   - State capture and restoration');
  console.log('   - Screenshot documentation');
}

if (require.main === module) {
  demonstrateAdvancedPSP().catch(console.error);
}

module.exports = { 
  AdvancedPSPManager, 
  WorkflowBuilder,
  demonstrateAdvancedPSP 
};