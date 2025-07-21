/**
 * PSP MCP Server - Model Context Protocol implementation for PSP
 * Compatible with Smithery.ai and other MCP clients
 */

import { Server } from '@modelcontextprotocol/sdk/dist/cjs/server/index';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/dist/cjs/server/stdio';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/dist/cjs/types';

/**
 * PSP MCP Server class
 */
export class PSPMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'psp-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupTools();
    this.setupErrorHandling();
  }

  /**
   * Set up all PSP MCP tools
   */
  private setupTools() {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'psp_list_sessions',
            description: 'List all PSP sessions with optional filters',
            inputSchema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['active', 'inactive', 'expired'],
                  description: 'Filter sessions by status'
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter sessions by tags'
                }
              }
            }
          },
          {
            name: 'psp_create_session',
            description: 'Create a new PSP session',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Session name'
                },
                description: {
                  type: 'string',
                  description: 'Session description'
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Session tags'
                }
              },
              required: ['name']
            }
          }
        ]
      };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'psp_list_sessions':
          return {
            content: [
              {
                type: 'text',
                text: 'PSP MCP Server is working! Session listing functionality will be implemented.'
              }
            ]
          };

        case 'psp_create_session':
          return {
            content: [
              {
                type: 'text',
                text: `PSP MCP Server is working! Would create session: ${args?.name || 'unnamed'}`
              }
            ]
          };

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  /**
   * Set up error handling
   */
  private setupErrorHandling() {
    this.server.onerror = (error: any) => {
      console.error('[PSP MCP Server] Error:', error);
    };
  }

  /**
   * Start the MCP server
   */
  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[PSP MCP Server] Started and ready for connections');
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new PSPMCPServer();
  server.start().catch(console.error);
}

export default PSPMCPServer;