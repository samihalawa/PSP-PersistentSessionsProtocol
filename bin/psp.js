#!/usr/bin/env node

/**
 * PSP CLI Binary Entry Point
 */

const path = require('path');
const fs = require('fs');

// Check if we're running from dist or src
const distPath = path.join(__dirname, '..', 'dist', 'cli', 'src', 'index.js');
const srcPath = path.join(__dirname, '..', 'packages', 'cli', 'src', 'index.ts');

if (fs.existsSync(distPath)) {
  // Run compiled version
  require(distPath);
} else if (fs.existsSync(srcPath)) {
  // Run TypeScript version with ts-node
  try {
    require('ts-node/register');
    require(srcPath);
  } catch (error) {
    console.error('Error: ts-node is required to run PSP CLI from source.');
    console.error('Please run: npm install -g ts-node');
    console.error('Or build the project first: npm run build');
    process.exit(1);
  }
} else {
  console.error('Error: PSP CLI not found.');
  console.error('Please build the project first: npm run build');
  process.exit(1);
}