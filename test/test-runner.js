/**
 * PSP Test Runner
 * 
 * Command-line test runner for PSP Cloudflare integration tests.
 * Provides detailed test execution with logging and reporting.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_CONFIG = {
    testFiles: [
        'cloudflare-integration.test.js'
    ],
    timeout: 60000, // 60 seconds
    verbose: true
};

class PSPTestRunner {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            total: 0
        };
        this.startTime = null;
    }

    async runTests() {
        console.log('🧪 Starting PSP Cloudflare Integration Tests');
        console.log('================================================');
        
        this.startTime = Date.now();
        
        for (const testFile of TEST_CONFIG.testFiles) {
            await this.runTestFile(testFile);
        }
        
        this.printSummary();
    }

    async runTestFile(testFile) {
        const testPath = path.join(__dirname, testFile);
        
        console.log(`\n📋 Running test file: ${testFile}`);
        console.log('-'.repeat(50));
        
        return new Promise((resolve, reject) => {
            const nodeProcess = spawn('node', [testPath], {
                stdio: 'pipe',
                cwd: path.dirname(__dirname)
            });
            
            let stdout = '';
            let stderr = '';
            
            nodeProcess.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                
                if (TEST_CONFIG.verbose) {
                    process.stdout.write(output);
                }
            });
            
            nodeProcess.stderr.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                
                if (TEST_CONFIG.verbose) {
                    process.stderr.write(output);
                }
            });
            
            nodeProcess.on('close', (code) => {
                this.updateResults(stdout, stderr, code);
                resolve(code);
            });
            
            nodeProcess.on('error', (error) => {
                console.error(`❌ Error running test file ${testFile}:`, error);
                reject(error);
            });
            
            // Set timeout
            setTimeout(() => {
                nodeProcess.kill('SIGKILL');
                console.error(`⏰ Test file ${testFile} timed out`);
                resolve(1);
            }, TEST_CONFIG.timeout);
        });
    }

    updateResults(stdout, stderr, exitCode) {
        // Parse test results from output
        const passedMatches = stdout.match(/✅/g) || [];
        const failedMatches = stderr.match(/❌/g) || [];
        
        this.results.passed += passedMatches.length;
        this.results.failed += failedMatches.length;
        this.results.total += passedMatches.length + failedMatches.length;
        
        console.log(`\n📊 File Results: ${passedMatches.length} passed, ${failedMatches.length} failed`);
    }

    printSummary() {
        const duration = Date.now() - this.startTime;
        const durationSeconds = (duration / 1000).toFixed(2);
        
        console.log('\n' + '='.repeat(60));
        console.log('🎯 PSP Test Summary');
        console.log('='.repeat(60));
        console.log(`📈 Total Tests: ${this.results.total}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`⏭️  Skipped: ${this.results.skipped}`);
        console.log(`⏱️  Duration: ${durationSeconds}s`);
        
        const successRate = this.results.total > 0 
            ? ((this.results.passed / this.results.total) * 100).toFixed(1)
            : 0;
        console.log(`📊 Success Rate: ${successRate}%`);
        
        if (this.results.failed === 0) {
            console.log('\n🎉 All tests passed!');
        } else {
            console.log(`\n⚠️  ${this.results.failed} test(s) failed`);
        }
        
        console.log('='.repeat(60));
    }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
    const runner = new PSPTestRunner();
    
    runner.runTests().catch((error) => {
        console.error('💥 Test runner failed:', error);
        process.exit(1);
    });
}

export default PSPTestRunner;