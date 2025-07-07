# PSP Cloudflare Integration Manual Testing Guide

This guide provides step-by-step instructions for manually testing the PSP Cloudflare integration to validate session transfer accuracy and authentication persistence.

## Prerequisites

1. **Chrome Browser** - Latest version with profile data
2. **Cloudflare Account** - With Browser Isolation and Workers access
3. **R2 Storage** - Configured bucket for session storage
4. **Node.js** - Version 18+ for running test scripts

## Test Configuration Setup

### 1. Environment Variables

Create a `.env.test` file in the project root:

```bash
# Cloudflare Configuration
CF_TEAM_NAME=your-team-name
CF_ACCESS_TOKEN=your-access-token
CF_R2_BUCKET=your-r2-bucket
CF_R2_ACCOUNT_ID=your-account-id
CF_R2_ACCESS_KEY_ID=your-access-key
CF_R2_SECRET_ACCESS_KEY=your-secret-key

# Chrome Configuration
CHROME_PROFILE_PATH=/path/to/chrome/profile
CHROME_PROFILE_NAME=Default

# Test Configuration
TEST_TARGET_URL=https://app.example.com
TEST_TIMEOUT=30000
```

### 2. Test Data Setup

Create test authentication data in Chrome:
1. Open Chrome and navigate to a test application
2. Log in to create authentication cookies and localStorage
3. Verify the session is active and functional

## Manual Test Cases

### Test Case 1: Chrome Session Extraction

**Objective**: Validate that Chrome session data is extracted accurately

**Steps**:
1. Run the Chrome extraction test:
   ```bash
   node test/manual/test-chrome-extraction.js
   ```

2. Verify extracted data contains:
   - Valid cookies with correct domains and values
   - localStorage entries with proper structure
   - sessionStorage data if available
   - Browser history entries
   - Bookmarks structure

**Expected Results**:
- ✅ Cookies extracted with proper security flags
- ✅ localStorage organized by domain
- ✅ Session metadata includes profile information
- ✅ No sensitive data exposed (passwords, private keys)

### Test Case 2: R2 Storage Operations

**Objective**: Validate R2 storage provider functionality

**Steps**:
1. Test R2 storage operations:
   ```bash
   node test/manual/test-r2-storage.js
   ```

2. Verify operations:
   - Store session data in R2
   - Retrieve session data from R2
   - List stored sessions
   - Delete test sessions

**Expected Results**:
- ✅ Session stored with proper metadata
- ✅ Session retrieved with data integrity
- ✅ TTL and expiration handled correctly
- ✅ Error handling for invalid operations

### Test Case 3: Cloudflare Adapter Session Management

**Objective**: Test Cloudflare PSP adapter functionality

**Steps**:
1. Test adapter operations:
   ```bash
   node test/manual/test-cloudflare-adapter.js
   ```

2. Verify adapter features:
   - Create isolation session URLs
   - Transfer session to isolation
   - Generate manual instructions
   - Health check all services

**Expected Results**:
- ✅ Valid isolation URLs generated
- ✅ Session transfer instructions created
- ✅ Health checks pass for available services
- ✅ Error handling for service failures

### Test Case 4: End-to-End Session Transfer

**Objective**: Complete workflow from Chrome to Cloudflare

**Steps**:
1. Run complete transfer workflow:
   ```bash
   node test/manual/test-e2e-transfer.js
   ```

2. Test all transfer modes:
   - **Isolation Mode**: Generates clientless URLs
   - **Workers Mode**: Uses Browser Rendering API  
   - **Manual Mode**: Provides step-by-step instructions

**Expected Results**:
- ✅ Chrome session extracted successfully
- ✅ Session stored in R2 backup
- ✅ Transfer instructions generated
- ✅ All three transfer modes work correctly

### Test Case 5: Authentication Persistence

**Objective**: Verify authentication state survives transfer

**Steps**:
1. **Setup Phase**:
   - Log into a test application in Chrome
   - Note the authenticated state (user dashboard, etc.)
   - Run session extraction

2. **Transfer Phase**:
   ```bash
   node test/manual/test-auth-persistence.js
   ```

3. **Validation Phase**:
   - Open the generated Cloudflare isolation URL
   - Execute the restoration script in browser console
   - Verify authenticated state is restored

**Expected Results**:
- ✅ Authentication cookies preserved
- ✅ Login tokens in localStorage maintained  
- ✅ User remains logged in after restoration
- ✅ Session timeouts respected

## Browser-Based Manual Testing

### Isolation URL Testing

1. **Generate Isolation URL**:
   ```bash
   node -e "
   import CloudflareTransferWorkflow from './packages/workflows/cloudflare-transfer.js';
   const workflow = new CloudflareTransferWorkflow({
     teamName: 'your-team',
     transferMode: 'isolation'
   });
   const result = await workflow.transferSession({
     targetUrl: 'https://app.example.com'
   });
   console.log('Isolation URL:', result.result.isolationUrl);
   "
   ```

2. **Manual Restoration**:
   - Open the isolation URL in browser
   - Press F12 to open Developer Tools
   - Go to Console tab
   - Paste and execute the restoration script
   - Verify page refreshes and authentication is restored

### Manual Instructions Testing

1. **Generate Manual Instructions**:
   ```bash
   node test/manual/generate-manual-instructions.js
   ```

2. **Follow Step-by-Step**:
   - Open target URL in Cloudflare browser
   - Follow generated manual steps
   - Verify each step completes successfully
   - Test final authenticated state

## Performance and Load Testing

### Session Size Testing

Test with various session sizes:
- **Small**: Few cookies, minimal localStorage
- **Medium**: Multiple domains, moderate data
- **Large**: Extensive cookies, large localStorage entries

### Transfer Speed Testing

Measure transfer performance:
```bash
node test/performance/transfer-speed-test.js
```

Track metrics:
- Chrome extraction time
- R2 upload/download speed
- Total transfer workflow time

## Security Testing

### Data Sanitization

Verify sensitive data is handled correctly:
- Passwords not extracted
- Private keys excluded
- Encrypted data preserved but not exposed

### Transfer Security

Test secure transfer mechanisms:
- Session data encrypted in transit
- R2 storage access controlled
- Isolation URLs properly scoped

## Troubleshooting Common Issues

### Chrome Profile Access

**Issue**: "Chrome profile not found"
**Solution**: 
- Verify Chrome path in configuration
- Check profile name (Default, Profile 1, etc.)
- Ensure Chrome is closed during extraction

### Cloudflare Access

**Issue**: "Team name not configured"
**Solution**:
- Verify Cloudflare Access team setup
- Check team domain configuration
- Validate access permissions

### R2 Storage

**Issue**: "R2 bucket not accessible"
**Solution**:
- Verify R2 credentials and permissions
- Check bucket name and region
- Test with Cloudflare API directly

### Transfer Failures

**Issue**: "Session transfer incomplete"
**Solution**:
- Check network connectivity
- Verify all services are healthy
- Review error logs for specific issues

## Test Automation

### Continuous Integration

Add to CI/CD pipeline:
```yaml
test-cloudflare-integration:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    - name: Install dependencies
      run: npm install
    - name: Run Cloudflare integration tests
      run: npm run test:cloudflare
      env:
        CF_TEAM_NAME: ${{ secrets.CF_TEAM_NAME }}
        CF_R2_BUCKET: ${{ secrets.CF_R2_BUCKET }}
```

### Automated Browser Testing

Use Playwright for automated browser validation:
```bash
node test/automated/browser-automation-test.js
```

## Reporting and Documentation

### Test Results

Document test results with:
- Test execution timestamps
- Success/failure rates
- Performance metrics
- Error logs and stack traces

### Coverage Analysis

Track test coverage:
- Component coverage (Chrome, R2, Adapter, Workflow)
- Scenario coverage (isolation, workers, manual)
- Error path coverage (network failures, invalid data)

### Regression Testing

Maintain regression test suite:
- Core functionality tests
- Edge case validation
- Performance benchmarks
- Security checks

This manual testing guide ensures comprehensive validation of the PSP Cloudflare integration across all supported scenarios and use cases.