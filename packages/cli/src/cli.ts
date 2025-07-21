#!/usr/bin/env node

/**
 * PSP CLI Entry Point
 */

// Re-export the main CLI functionality
export * from './index';

// Run the CLI if this file is executed directly
if (require.main === module) {
  require('./index');
}