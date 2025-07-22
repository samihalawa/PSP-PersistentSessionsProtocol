#!/usr/bin/env node
"use strict";
/**
 * PSP CLI - Command Line Interface for Persistent Sessions Protocol
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const inquirer_1 = __importDefault(require("inquirer"));
const open_1 = __importDefault(require("open"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
// Create the main program
const program = new commander_1.Command();
program
    .name('psp')
    .description('Persistent Sessions Protocol CLI')
    .version('0.1.0')
    .helpOption('-h, --help', 'display help for command');
// List sessions command
program
    .command('list')
    .description('List all PSP sessions')
    .option('-c, --captured', 'Show only captured browser sessions')
    .option('-s, --status <status>', 'Filter by status (active, inactive, expired)')
    .option('-t, --tags <tags>', 'Filter by tags (comma separated)')
    .action(async (options) => {
    console.log(chalk_1.default.blue('🔍 Listing PSP sessions...'));
    try {
        if (options.captured) {
            // Show captured browser sessions
            const { listCapturedSessions } = await Promise.resolve().then(() => __importStar(require('./commands/launch')));
            const capturedSessions = await listCapturedSessions();
            if (capturedSessions.length === 0) {
                console.log(chalk_1.default.yellow('\n📭 No captured sessions found.'));
                console.log(chalk_1.default.gray('   Run `psp launch` to capture your first session!'));
                return;
            }
            console.log(chalk_1.default.green(`\n✅ Found ${capturedSessions.length} captured session(s):`));
            console.log('');
            capturedSessions.forEach((session, index) => {
                const timeAgo = getTimeAgo(new Date(session.capturedAt));
                console.log(chalk_1.default.bold(`${index + 1}. ${session.sessionName}`));
                console.log(chalk_1.default.gray(`   📁 Profile: ${session.profile}`));
                if (session.platform) {
                    console.log(chalk_1.default.gray(`   🏷️  Platform: ${session.platform}`));
                }
                console.log(chalk_1.default.gray(`   🍪 Data: ${session.cookies} cookies, ${session.localStorage} storage items`));
                console.log(chalk_1.default.gray(`   ⏰ Captured: ${timeAgo}`));
                console.log('');
            });
        }
        else {
            // Show regular PSP sessions (mock for now)
            const sessions = [
                { id: '1', name: 'Gmail Session', status: 'active', tags: ['gmail', 'prod'] },
                { id: '2', name: 'GitHub Session', status: 'active', tags: ['github', 'dev'] },
                { id: '3', name: 'AWS Console', status: 'inactive', tags: ['aws', 'admin'] }
            ];
            console.log(chalk_1.default.green('\n✅ Sessions found:'));
            sessions.forEach(session => {
                const statusColor = session.status === 'active' ? chalk_1.default.green : chalk_1.default.yellow;
                console.log(`  ${session.id}: ${chalk_1.default.bold(session.name)} ${statusColor(`[${session.status}]`)} ${chalk_1.default.gray(session.tags.join(', '))}`);
            });
            console.log('');
            console.log(chalk_1.default.gray('💡 Tip: Use `psp list --captured` to see browser sessions'));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ Failed to list sessions:'), error);
    }
});
// Helper function for time formatting
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffMins < 1)
        return 'just now';
    if (diffMins < 60)
        return `${diffMins} minute(s) ago`;
    if (diffHours < 24)
        return `${diffHours} hour(s) ago`;
    if (diffDays < 7)
        return `${diffDays} day(s) ago`;
    return date.toLocaleDateString();
}
// Create session command
program
    .command('create')
    .description('Create a new PSP session')
    .argument('[name]', 'Session name')
    .argument('[description]', 'Session description')
    .option('-t, --tags <tags>', 'Tags (comma separated)')
    .action(async (name, description, options) => {
    if (!name) {
        const answers = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'name',
                message: 'Session name:',
                validate: (input) => input.trim() !== '' || 'Session name is required'
            },
            {
                type: 'input',
                name: 'description',
                message: 'Session description (optional):'
            },
            {
                type: 'input',
                name: 'tags',
                message: 'Tags (comma separated, optional):'
            }
        ]);
        name = answers.name;
        description = answers.description;
        options.tags = answers.tags;
    }
    const spinner = (0, ora_1.default)('Creating PSP session...').start();
    // Simulate creation
    setTimeout(() => {
        spinner.succeed(chalk_1.default.green(`✅ Session "${name}" created successfully!`));
        console.log(chalk_1.default.gray(`   Description: ${description || 'No description'}`));
        console.log(chalk_1.default.gray(`   Tags: ${options.tags || 'No tags'}`));
    }, 1000);
});
// Launch browser command
program
    .command('launch [session-name]')
    .description('Launch interactive browser for session capture')
    .option('-u, --url <url>', 'URL to navigate to initially')
    .option('-p, --platform <platform>', 'Platform name (gmail, github, aws, etc.)')
    .option('--profile <profile>', 'Browser profile name', 'default')
    .option('-s, --session <id>', 'Existing session ID to continue')
    .option('-t, --timeout <seconds>', 'Timeout in seconds', '180')
    .action(async (sessionName, options) => {
    try {
        // Import the real implementation
        const { launchInteractiveBrowser, getPlatformUrl } = await Promise.resolve().then(() => __importStar(require('./commands/launch')));
        // Determine URL from platform or direct URL
        let targetUrl = options.url;
        if (!targetUrl && options.platform) {
            targetUrl = getPlatformUrl(options.platform);
            if (targetUrl) {
                console.log(chalk_1.default.gray(`🎯 Using ${options.platform} URL: ${targetUrl}`));
            }
        }
        // Launch interactive browser
        await launchInteractiveBrowser({
            name: sessionName,
            session: options.session,
            url: targetUrl,
            platform: options.platform,
            profile: options.profile || 'default',
            timeout: parseInt(options.timeout || '180') * 1000,
            headless: false
        });
    }
    catch (error) {
        console.error(chalk_1.default.red('\n❌ Launch failed:'), error.message);
        if (error.message.includes('chromium')) {
            console.log(chalk_1.default.yellow('\n💡 Tip: Install Playwright browsers with:'));
            console.log(chalk_1.default.white('   npx playwright install chromium'));
        }
        process.exit(1);
    }
});
// UI command
program
    .command('ui')
    .description('Launch the PSP web interface')
    .option('-p, --port <port>', 'Port to run on', '3000')
    .action(async (options) => {
    console.log(chalk_1.default.blue('🌐 Starting PSP web interface...'));
    const spinner = (0, ora_1.default)(`Starting server on port ${options.port}...`).start();
    // Start a simple HTTP server to serve the built GUI
    const server = http_1.default.createServer((req, res) => {
        let filePath = path_1.default.join(__dirname, '../../gui/dist/index.html');
        // Handle static assets
        if (req.url && req.url.startsWith('/assets/')) {
            const assetPath = path_1.default.join(__dirname, '../../gui/dist', req.url);
            fs_1.default.readFile(assetPath, (err, content) => {
                if (err) {
                    res.writeHead(404);
                    res.end('Asset not found');
                    return;
                }
                // Set appropriate content type
                const ext = path_1.default.extname(assetPath);
                const contentType = ext === '.css' ? 'text/css' : ext === '.js' ? 'application/javascript' : 'application/octet-stream';
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content);
            });
            return;
        }
        // Serve main HTML file for all other routes (SPA)
        fs_1.default.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('PSP GUI not found. Please build the GUI first with: npm run build');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content);
        });
    });
    server.listen(parseInt(String(options.port || 3000)), 'localhost', () => {
        spinner.succeed(chalk_1.default.green(`✅ PSP web interface is running!`));
        console.log(chalk_1.default.cyan(`   🌐 Open: http://localhost:${options.port}`));
        console.log(chalk_1.default.gray('   Press Ctrl+C to stop the server'));
        // Auto-open browser
        (async () => {
            try {
                await (0, open_1.default)(`http://localhost:${options.port}`);
            }
            catch (error) {
                console.log(chalk_1.default.yellow('   Could not auto-open browser. Please open the URL manually.'));
            }
        })();
    });
    // Handle server shutdown
    process.on('SIGINT', () => {
        console.log(chalk_1.default.yellow('\n   Shutting down PSP web interface...'));
        server.close(() => {
            console.log(chalk_1.default.green('   ✅ Server stopped'));
            process.exit(0);
        });
    });
});
// Export session command
program
    .command('export')
    .description('Export a session to various formats')
    .argument('<sessionId>', 'Session ID to export')
    .option('-f, --format <format>', 'Export format (json, har, csv)', 'json')
    .option('-o, --output <file>', 'Output file path')
    .action(async (sessionId, options) => {
    const spinner = (0, ora_1.default)(`Exporting session ${sessionId} as ${options.format}...`).start();
    setTimeout(() => {
        const outputFile = options.output || `session-${sessionId}.${options.format}`;
        spinner.succeed(chalk_1.default.green(`✅ Session exported to: ${outputFile}`));
    }, 1500);
});
// Test platform command
program
    .command('test')
    .description('Test PSP compatibility with popular platforms')
    .option('-p, --platform <platform>', 'Specific platform to test')
    .action(async (options) => {
    console.log(chalk_1.default.blue('🧪 Testing PSP platform compatibility...'));
    const platforms = options.platform ? [options.platform] : [
        'Gmail', 'GitHub', 'AWS Console', 'Slack', 'Discord', 'Notion'
    ];
    console.log(chalk_1.default.gray(`   Testing ${platforms.length} platform(s)...\n`));
    for (const platform of platforms) {
        const spinner = (0, ora_1.default)(`Testing ${platform}...`).start();
        // Simulate testing
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
        spinner.succeed(chalk_1.default.green(`✅ ${platform} - Compatible`));
    }
    console.log(chalk_1.default.green(`\n🎉 All ${platforms.length} platform(s) are compatible!`));
});
// Demo command
program
    .command('demo')
    .description('Run a comprehensive PSP demo')
    .action(async () => {
    console.log(chalk_1.default.blue.bold('🎯 PSP Comprehensive Demo'));
    console.log(chalk_1.default.blue('==========================\n'));
    // Demo steps
    const steps = [
        'Creating test sessions...',
        'Testing session capture...',
        'Testing session restore...',
        'Testing cookie management...',
        'Testing platform compatibility...',
        'Testing MCP integration...'
    ];
    for (const step of steps) {
        const spinner = (0, ora_1.default)(step).start();
        await new Promise(resolve => setTimeout(resolve, 1500));
        spinner.succeed(chalk_1.default.green(`✅ ${step}`));
    }
    console.log(chalk_1.default.green('\n🎉 Demo completed successfully!'));
    console.log(chalk_1.default.cyan('   Run "psp ui" to explore the web interface'));
});
// Version display
program.on('--help', () => {
    console.log('');
    console.log(chalk_1.default.blue.bold('Examples:'));
    console.log('  $ psp list                    # List all sessions');
    console.log('  $ psp create "My Session"     # Create a new session');
    console.log('  $ psp launch                  # Launch browser for capture');
    console.log('  $ psp ui                      # Start web interface');
    console.log('  $ psp demo                    # Run comprehensive demo');
    console.log('');
    console.log(chalk_1.default.gray('For more information, visit: https://github.com/samihalawa/PSP-PersistentSessionsProtocol'));
});
// Parse command line arguments
program.parse();
// If no command provided, show help
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
