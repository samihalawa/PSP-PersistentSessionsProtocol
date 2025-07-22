#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { analytics } from './index';

const program = new Command();

program
  .name('psp-analytics')
  .description('PSP Analytics CLI - Growth tracking and metrics')
  .version('0.1.0');

program
  .command('report')
  .description('Generate analytics report')
  .option('-f, --format <format>', 'Output format (text, json)', 'text')
  .option('-o, --output <file>', 'Output file (default: stdout)')
  .action(async (options) => {
    console.log(chalk.blue('📊 Generating PSP analytics report...'));
    
    try {
      const report = await analytics.generateReport();
      
      if (options.format === 'json') {
        const usage = await analytics.getUsageMetrics();
        const growth = await analytics.getGrowthMetrics();
        console.log(JSON.stringify({ usage, growth }, null, 2));
      } else {
        console.log(report);
      }
    } catch (error: any) {
      console.error(chalk.red(`❌ Error generating report: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('track')
  .description('Track a custom event')
  .requiredOption('-e, --event <event>', 'Event name')
  .option('-u, --user <userId>', 'User ID')
  .option('-s, --session <sessionId>', 'Session ID')
  .option('-p, --properties <properties>', 'Event properties (JSON)', '{}')
  .action(async (options) => {
    try {
      const properties = JSON.parse(options.properties);
      
      await analytics.trackEvent({
        event: options.event,
        userId: options.user,
        sessionId: options.session,
        properties
      });
      
      console.log(chalk.green(`✅ Event tracked: ${options.event}`));
    } catch (error: any) {
      console.error(chalk.red(`❌ Error tracking event: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('metrics')
  .description('Show current metrics')
  .option('--usage', 'Show usage metrics')
  .option('--growth', 'Show growth metrics')
  .action(async (options) => {
    try {
      if (options.usage || (!options.usage && !options.growth)) {
        console.log(chalk.blue('📈 Usage Metrics:'));
        const usage = await analytics.getUsageMetrics();
        console.log(JSON.stringify(usage, null, 2));
      }
      
      if (options.growth || (!options.usage && !options.growth)) {
        console.log(chalk.blue('🚀 Growth Metrics:'));
        const growth = await analytics.getGrowthMetrics();
        console.log(JSON.stringify(growth, null, 2));
      }
    } catch (error: any) {
      console.error(chalk.red(`❌ Error retrieving metrics: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('dashboard')
  .description('Start analytics dashboard server')
  .option('-p, --port <port>', 'Port number', '3002')
  .action((options) => {
    console.log(chalk.blue(`🚀 Starting analytics dashboard on port ${options.port}...`));
    // Start Express server for dashboard
    // Implementation in dashboard.ts
  });

// Handle unknown commands
program.on('command:*', () => {
  console.error(chalk.red('Invalid command: %s\nSee --help for a list of available commands.'), program.args.join(' '));
  process.exit(1);
});

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

program.parse();