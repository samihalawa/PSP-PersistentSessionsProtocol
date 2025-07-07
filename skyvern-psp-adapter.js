#!/usr/bin/env node

const { chromium } = require('playwright');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

/**
 * PSP Skyvern Adapter - Complete Integration
 * 
 * Integrates PSP (Persistent Sessions Protocol) with Skyvern's AI-driven
 * browser automation platform. Supports workflow-aware session capture
 * and restoration with Skyvern's vision-based navigation system.
 */

class SkyvernPSPAdapter {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.SKYVERN_API_KEY;
    this.apiUrl = options.apiUrl || 'https://api.skyvern.com/v1';
    this.organizationId = options.organizationId;
    this.sessionDir = options.sessionDir || './psp-sessions/skyvern';
  }

  async initialize() {
    await fs.mkdir(this.sessionDir, { recursive: true });
    console.log('🤖 PSP Skyvern Adapter initialized');
  }

  /**
   * Create session with Skyvern-specific enhancements
   */
  async createSession(sessionId, options = {}) {
    const sessionPath = path.join(this.sessionDir, sessionId);
    await fs.mkdir(sessionPath, { recursive: true });

    const context = await chromium.launchPersistentContext(sessionPath, {
      headless: options.headless !== false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      ignoreHTTPSErrors: true,
      ...options
    });

    const page = await context.newPage();

    // Inject Skyvern-compatible PSP tracking
    await page.addInitScript(() => {
      // Enhanced tracking for Skyvern AI navigation
      window.__PSP_SKYVERN_SESSION__ = {
        sessionId: null,
        startTime: Date.now(),
        actions: [],
        extractedData: {},
        workflows: [],
        
        // Track AI-driven interactions
        trackAction: function(action) {
          this.actions.push({
            timestamp: Date.now(),
            type: action.type,
            element: action.element,
            value: action.value,
            screenshot: action.screenshot
          });
        },
        
        // Enhanced element extraction for Skyvern
        extractPageStructure: function() {
          return {
            forms: Array.from(document.forms).map(form => ({
              id: form.id,
              action: form.action,
              method: form.method,
              elements: Array.from(form.elements).map(el => ({
                name: el.name,
                type: el.type,
                value: el.value,
                placeholder: el.placeholder
              }))
            })),
            buttons: Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]')).map(btn => ({
              text: btn.textContent?.trim(),
              type: btn.type,
              id: btn.id,
              classes: btn.className,
              rect: btn.getBoundingClientRect()
            })),
            links: Array.from(document.querySelectorAll('a[href]')).map(link => ({
              text: link.textContent?.trim(),
              href: link.href,
              id: link.id,
              classes: link.className
            })),
            dataElements: Array.from(document.querySelectorAll('[data-testid], [data-cy], [data-test], [aria-label]')).map(el => ({
              selector: el.getAttribute('data-testid') || el.getAttribute('data-cy') || el.getAttribute('data-test'),
              ariaLabel: el.getAttribute('aria-label'),
              text: el.textContent?.trim(),
              tagName: el.tagName,
              rect: el.getBoundingClientRect()
            }))
          };
        }
      };

      // Override webdriver detection
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    return {
      context,
      page,
      sessionPath,
      provider: 'skyvern',
      sessionId
    };
  }

  /**
   * Capture session with Skyvern workflow data
   */
  async captureSession(sessionId) {
    const sessionPath = path.join(this.sessionDir, sessionId);
    const context = await chromium.launchPersistentContext(sessionPath, {
      headless: true
    });

    const page = await context.newPage();
    await page.goto('https://httpbin.org/cookies');

    // Standard PSP data capture
    const standardData = {
      cookies: await context.cookies(),
      localStorage: await page.evaluate(() => {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          data[key] = localStorage.getItem(key);
        }
        return data;
      }),
      sessionStorage: await page.evaluate(() => {
        const data = {};
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          data[key] = sessionStorage.getItem(key);
        }
        return data;
      }),
      url: page.url(),
      userAgent: await page.evaluate(() => navigator.userAgent),
      viewport: page.viewportSize()
    };

    // Skyvern-specific data capture
    const skyvernData = await page.evaluate(() => {
      const pspSession = window.__PSP_SKYVERN_SESSION__;
      if (!pspSession) return {};

      return {
        actions: pspSession.actions,
        extractedData: pspSession.extractedData,
        workflows: pspSession.workflows,
        pageStructure: pspSession.extractPageStructure()
      };
    });

    await context.close();

    return {
      ...standardData,
      provider: 'skyvern',
      skyvernData,
      captureTime: new Date().toISOString()
    };
  }

  /**
   * Restore session with Skyvern workflow context
   */
  async restoreSession(sessionPath, pspFormat, options = {}) {
    const context = await chromium.launchPersistentContext(sessionPath, {
      headless: options.headless !== false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security'
      ],
      ignoreHTTPSErrors: true
    });

    const page = await context.newPage();

    // Restore standard session data
    if (pspFormat.sessionData.cookies) {
      await context.addCookies(pspFormat.sessionData.cookies);
    }

    await page.goto(pspFormat.sessionData.url || 'https://httpbin.org/');

    // Restore localStorage
    if (pspFormat.sessionData.localStorage) {
      await page.evaluate((data) => {
        for (const [key, value] of Object.entries(data)) {
          localStorage.setItem(key, value);
        }
      }, pspFormat.sessionData.localStorage);
    }

    // Restore sessionStorage
    if (pspFormat.sessionData.sessionStorage) {
      await page.evaluate((data) => {
        for (const [key, value] of Object.entries(data)) {
          sessionStorage.setItem(key, value);
        }
      }, pspFormat.sessionData.sessionStorage);
    }

    // Restore Skyvern-specific context
    if (pspFormat.skyvernData) {
      await page.evaluate((skyvernData) => {
        window.__PSP_SKYVERN_SESSION__ = {
          ...window.__PSP_SKYVERN_SESSION__,
          actions: skyvernData.actions || [],
          extractedData: skyvernData.extractedData || {},
          workflows: skyvernData.workflows || []
        };
      }, pspFormat.skyvernData);
    }

    // Verify restoration
    const restoredData = await this.captureSession('temp-verify');

    await context.close();
    return restoredData;
  }

  /**
   * Execute Skyvern workflow with PSP session
   */
  async executeWorkflow(sessionId, workflowConfig) {
    if (!this.apiKey) {
      throw new Error('Skyvern API key required for workflow execution');
    }

    try {
      // Create Skyvern task with session context
      const taskPayload = {
        title: `PSP Session Workflow - ${sessionId}`,
        url: workflowConfig.url,
        workflow: workflowConfig.workflow || {
          parameters: { session_id: sessionId },
          blocks: [
            {
              type: "TaskBlock",
              label: "PSP_Workflow_Execution",
              url: workflowConfig.url,
              navigation_goal: workflowConfig.goal || "Navigate with preserved session",
              data_extraction_goal: workflowConfig.extractionGoal || "Extract relevant data",
              complete_on: workflowConfig.completeOn || "data_extraction_goal"
            }
          ]
        },
        persist_browser_session: true,
        session_id: sessionId
      };

      const response = await axios.post(`${this.apiUrl}/tasks`, taskPayload, {
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      console.log(`🤖 Skyvern workflow started: ${response.data.task_id}`);
      return response.data;

    } catch (error) {
      console.error('❌ Skyvern workflow execution failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Monitor Skyvern task execution
   */
  async monitorTask(taskId) {
    try {
      const response = await axios.get(`${this.apiUrl}/tasks/${taskId}`, {
        headers: { 'x-api-key': this.apiKey }
      });

      return response.data;
    } catch (error) {
      console.error('❌ Task monitoring failed:', error.message);
      throw error;
    }
  }

  /**
   * Create enhanced PSP format with Skyvern data
   */
  convertToPSPFormat(sessionData, sourceProvider = 'skyvern') {
    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      sourceProvider,
      sessionData: {
        cookies: sessionData.cookies || [],
        localStorage: sessionData.localStorage || {},
        sessionStorage: sessionData.sessionStorage || {},
        url: sessionData.url,
        userAgent: sessionData.userAgent,
        viewport: sessionData.viewport
      },
      skyvernData: sessionData.skyvernData || {},
      metadata: {
        platform: process.platform,
        captureMethod: 'psp-skyvern-adapter',
        compatibility: ['skyvern', 'playwright', 'browser-use'],
        aiEnhanced: true,
        workflowCapable: true
      }
    };
  }

  /**
   * Execute workflow step for manual workflow execution
   */
  async executeWorkflowStep(page, step) {
    console.log(`🔄 Executing step: ${step.type}`);

    try {
      switch (step.type) {
        case 'navigate':
          await page.goto(step.url);
          break;

        case 'click':
          if (step.ai_selector) {
            // Use AI-style description for element finding
            const element = await page.locator(step.ai_selector).first();
            await element.click();
          } else {
            await page.click(step.selector);
          }
          break;

        case 'fill':
          if (step.ai_selector) {
            const element = await page.locator(step.ai_selector).first();
            await element.fill(step.value);
          } else {
            await page.fill(step.selector, step.value);
          }
          break;

        case 'extract':
          const data = await page.evaluate(step.extractFunction || (() => ({})));
          return { stepType: 'extract', data };

        case 'wait':
          await page.waitForTimeout(step.duration || 1000);
          break;

        case 'screenshot':
          const screenshot = await page.screenshot({ fullPage: true });
          return { stepType: 'screenshot', screenshot };

        default:
          console.warn(`⚠️ Unknown step type: ${step.type}`);
      }

      // Track action in PSP session
      await page.evaluate((stepInfo) => {
        if (window.__PSP_SKYVERN_SESSION__) {
          window.__PSP_SKYVERN_SESSION__.trackAction(stepInfo);
        }
      }, step);

    } catch (error) {
      console.error(`❌ Step execution failed: ${error.message}`);
      throw error;
    }
  }
}

// Example usage and testing
async function demonstrateSkyvernPSP() {
  console.log('🤖 PSP Skyvern Integration Demonstration');
  console.log('=======================================');

  const adapter = new SkyvernPSPAdapter();
  await adapter.initialize();

  const sessionId = `skyvern-demo-${Date.now()}`;

  try {
    // Create session
    console.log('\n📝 Creating Skyvern session with PSP tracking...');
    const session = await adapter.createSession(sessionId, { headless: false });

    // Navigate and perform actions
    await session.page.goto('https://httpbin.org/forms/post');
    
    // Simulate form interaction that Skyvern would track
    await session.page.fill('input[name="custname"]', 'PSP Test User');
    await session.page.fill('input[name="custtel"]', '123-456-7890');
    await session.page.selectOption('select[name="custemail"]', 'Large');

    // Add some delay to see the form filled
    await session.page.waitForTimeout(2000);

    await session.context.close();
    console.log('  ✅ Session created with form data');

    // Capture session
    console.log('\n📤 Capturing session with Skyvern enhancements...');
    const sessionData = await adapter.captureSession(sessionId);
    
    // Convert to PSP format
    const pspFormat = adapter.convertToPSPFormat(sessionData);
    console.log('  ✅ Session captured with AI-enhanced data');
    console.log(`  📊 Captured ${Object.keys(pspFormat.skyvernData).length} Skyvern-specific data points`);

    // Test workflow configuration
    const workflowConfig = {
      url: 'https://httpbin.org/forms/post',
      goal: 'Fill out the customer information form',
      extractionGoal: 'Extract form submission confirmation',
      completeOn: 'form_submitted'
    };

    console.log('  🤖 Skyvern workflow configuration ready');
    console.log(`  🎯 Goal: ${workflowConfig.goal}`);

    return {
      sessionId,
      pspFormat,
      workflowConfig,
      success: true
    };

  } catch (error) {
    console.error('❌ Skyvern PSP demonstration failed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  demonstrateSkyvernPSP().catch(console.error);
}

module.exports = { SkyvernPSPAdapter, demonstrateSkyvernPSP };