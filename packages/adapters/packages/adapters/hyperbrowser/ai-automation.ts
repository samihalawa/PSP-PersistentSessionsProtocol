import { Page } from 'playwright';
import { OpenAI } from 'openai';

export interface AIAutomationConfig {
  provider: 'openai' | 'anthropic' | 'local';
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
}

export interface ActionContext {
  page: Page;
  screenshot: boolean;
  waitForNavigation: boolean;
  timeout: number;
  includeDOM?: boolean;
}

export interface ExtractionOptions {
  format: 'json' | 'text' | 'markdown';
  includeContext: boolean;
  schema?: any;
}

export class AIAutomation {
  private openai: OpenAI | null = null;
  private conversationHistory: any[] = [];
  private systemPrompts: string[] = [];
  private tokenUsage = { prompt: 0, completion: 0, total: 0 };

  constructor(private config: AIAutomationConfig) {
    if (config.provider === 'openai') {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    
    this.systemPrompts.push(
      config.systemPrompt || 
      `You are an AI browser automation assistant. You can perform actions on web pages by understanding the page content and user instructions. Always be precise and careful with your actions.`
    );
  }

  async act(instruction: string, context: ActionContext): Promise<any> {
    const pageContent = await this.getPageContext(context.page, context.includeDOM);
    const screenshot = context.screenshot ? await context.page.screenshot({ type: 'png' }) : null;

    const prompt = this.buildActionPrompt(instruction, pageContent, screenshot);
    const aiResponse = await this.callAI(prompt);
    
    const actions = this.parseActionResponse(aiResponse);
    const results = [];

    for (const action of actions) {
      const result = await this.executeAction(action, context);
      results.push(result);
    }

    this.recordConversation('action', instruction, results);
    return results;
  }

  async extract(instruction: string, context: ActionContext, options: ExtractionOptions): Promise<any> {
    const pageContent = await this.getPageContext(context.page, true);
    const screenshot = context.screenshot ? await context.page.screenshot({ type: 'png' }) : null;

    const prompt = this.buildExtractionPrompt(instruction, pageContent, options);
    const aiResponse = await this.callAI(prompt);
    
    let extractedData;
    if (options.format === 'json') {
      try {
        extractedData = JSON.parse(aiResponse);
      } catch {
        extractedData = { text: aiResponse };
      }
    } else {
      extractedData = aiResponse;
    }

    this.recordConversation('extraction', instruction, extractedData);
    return extractedData;
  }

  private async getPageContext(page: Page, includeDOM: boolean = false): Promise<any> {
    const context = {
      url: page.url(),
      title: await page.title(),
      viewport: page.viewportSize(),
    };

    if (includeDOM) {
      context['visibleText'] = await page.evaluate(() => {
        return document.body.innerText.slice(0, 5000);
      });

      context['forms'] = await page.evaluate(() => {
        const forms = Array.from(document.forms);
        return forms.map(form => ({
          action: form.action,
          method: form.method,
          inputs: Array.from(form.elements).map(el => ({
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            required: el.required
          }))
        }));
      });

      context['buttons'] = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'));
        return buttons.map(btn => ({
          text: btn.textContent?.trim(),
          type: btn.type,
          id: btn.id,
          className: btn.className
        }));
      });

      context['links'] = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        return links.slice(0, 20).map(link => ({
          text: link.textContent?.trim(),
          href: link.href,
          id: link.id
        }));
      });
    }

    return context;
  }

  private buildActionPrompt(instruction: string, pageContext: any, screenshot: Buffer | null): string {
    return `
BROWSER AUTOMATION TASK:
${instruction}

CURRENT PAGE CONTEXT:
URL: ${pageContext.url}
Title: ${pageContext.title}

${pageContext.visibleText ? `VISIBLE TEXT (first 5000 chars):
${pageContext.visibleText}` : ''}

${pageContext.forms?.length ? `FORMS:
${JSON.stringify(pageContext.forms, null, 2)}` : ''}

${pageContext.buttons?.length ? `BUTTONS:
${JSON.stringify(pageContext.buttons, null, 2)}` : ''}

${pageContext.links?.length ? `LINKS:
${JSON.stringify(pageContext.links, null, 2)}` : ''}

Please provide a sequence of actions to accomplish the task. Return a JSON array of actions with this format:
[
  {
    "type": "click|fill|navigate|wait|scroll",
    "selector": "css_selector_or_text",
    "value": "value_for_fill_actions",
    "description": "what_this_action_does"
  }
]

Only return the JSON array, no other text.
`;
  }

  private buildExtractionPrompt(instruction: string, pageContext: any, options: ExtractionOptions): string {
    return `
DATA EXTRACTION TASK:
${instruction}

CURRENT PAGE CONTEXT:
URL: ${pageContext.url}
Title: ${pageContext.title}
Visible Text: ${pageContext.visibleText}

${options.schema ? `EXPECTED SCHEMA:
${JSON.stringify(options.schema, null, 2)}` : ''}

Please extract the requested data in ${options.format} format.
${options.includeContext ? 'Include relevant context and metadata.' : 'Return only the essential data.'}
`;
  }

  private async callAI(prompt: string): Promise<string> {
    if (!this.openai) {
      throw new Error('AI provider not configured');
    }

    const response = await this.openai.chat.completions.create({
      model: this.config.model,
      messages: [
        { role: 'system', content: this.systemPrompts.join('\n\n') },
        ...this.conversationHistory.slice(-10),
        { role: 'user', content: prompt }
      ],
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
    });

    const content = response.choices[0]?.message?.content || '';
    
    this.tokenUsage.prompt += response.usage?.prompt_tokens || 0;
    this.tokenUsage.completion += response.usage?.completion_tokens || 0;
    this.tokenUsage.total += response.usage?.total_tokens || 0;

    return content;
  }

  private parseActionResponse(response: string): any[] {
    try {
      const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return [];
    }
  }

  private async executeAction(action: any, context: ActionContext): Promise<any> {
    const { page } = context;
    
    try {
      switch (action.type) {
        case 'click':
          if (action.selector.startsWith('text=')) {
            await page.getByText(action.selector.replace('text=', '')).click();
          } else {
            await page.locator(action.selector).click();
          }
          break;

        case 'fill':
          await page.locator(action.selector).fill(action.value);
          break;

        case 'navigate':
          await page.goto(action.value);
          break;

        case 'wait':
          await page.waitForTimeout(parseInt(action.value) || 1000);
          break;

        case 'scroll':
          await page.mouse.wheel(0, parseInt(action.value) || 500);
          break;

        default:
          console.warn(`Unknown action type: ${action.type}`);
      }

      if (context.waitForNavigation) {
        await page.waitForLoadState('networkidle', { timeout: context.timeout });
      }

      return { success: true, action: action.description };
    } catch (error) {
      return { success: false, error: error.message, action: action.description };
    }
  }

  private recordConversation(type: string, instruction: string, result: any): void {
    this.conversationHistory.push({
      role: 'user',
      content: `${type}: ${instruction}`
    });
    
    this.conversationHistory.push({
      role: 'assistant',
      content: JSON.stringify(result)
    });

    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }
  }

  getCurrentObjective(): string {
    const lastUserMessage = this.conversationHistory
      .filter(msg => msg.role === 'user')
      .pop();
    return lastUserMessage?.content || '';
  }

  getActionHistory(): any[] {
    return this.conversationHistory.filter(msg => 
      msg.role === 'user' && msg.content.startsWith('action:')
    );
  }

  getContextMemory(): any {
    return {
      conversationLength: this.conversationHistory.length,
      lastActions: this.getActionHistory().slice(-5),
      tokenUsage: this.tokenUsage
    };
  }

  getLearningData(): any {
    return {
      successfulActions: this.conversationHistory.filter(msg => 
        msg.role === 'assistant' && msg.content.includes('"success": true')
      ).length,
      failedActions: this.conversationHistory.filter(msg => 
        msg.role === 'assistant' && msg.content.includes('"success": false')
      ).length,
      totalTokens: this.tokenUsage.total
    };
  }

  getConversationHistory(): any[] {
    return this.conversationHistory;
  }

  getSystemPrompts(): string[] {
    return this.systemPrompts;
  }

  getTokenUsage(): any {
    return this.tokenUsage;
  }

  restoreState(state: any): void {
    if (state.conversationHistory) {
      this.conversationHistory = state.conversationHistory;
    }
    if (state.tokenUsage) {
      this.tokenUsage = state.tokenUsage;
    }
  }

  restoreContext(context: any): void {
    if (context.conversationHistory) {
      this.conversationHistory = context.conversationHistory;
    }
    if (context.systemPrompts) {
      this.systemPrompts = context.systemPrompts;
    }
    if (context.tokenUsage) {
      this.tokenUsage = context.tokenUsage;
    }
  }
}

export default AIAutomation;