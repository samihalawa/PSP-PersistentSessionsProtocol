# Integrating PSP with Selenium

This guide explains how to integrate the Persistent Sessions Protocol (PSP) with your existing Selenium automation projects.

## Installation

### JavaScript / Node.js

```bash
npm install @psp/core @psp/selenium selenium-webdriver
```

### Java

```xml
<!-- Add to pom.xml for Maven -->
<dependencies>
  <dependency>
    <groupId>com.psp</groupId>
    <artifactId>psp-core</artifactId>
    <version>1.0.0</version>
  </dependency>
  <dependency>
    <groupId>com.psp</groupId>
    <artifactId>psp-selenium</artifactId>
    <version>1.0.0</version>
  </dependency>
  <dependency>
    <groupId>org.seleniumhq.selenium</groupId>
    <artifactId>selenium-java</artifactId>
    <version>4.12.0</version>
  </dependency>
</dependencies>
```

### Python

```bash
pip install psp-python psp-selenium selenium
```

## Basic Integration

### JavaScript / Node.js

#### Capturing a Session

```javascript
const { Builder } = require('selenium-webdriver');
const { createPSPClient } = require('@psp/selenium');

async function captureLoginSession() {
  // Initialize PSP client
  const psp = createPSPClient({
    storage: {
      type: 'local',
      path: './sessions'
    }
  });
  
  // Launch browser and navigate to site
  const driver = await new Builder().forBrowser('chrome').build();
  
  try {
    // Navigate to login page
    await driver.get('https://example.com/login');
    
    // Perform login
    await driver.findElement({ id: 'username' }).sendKeys('user@example.com');
    await driver.findElement({ id: 'password' }).sendKeys('password123');
    await driver.findElement({ id: 'login-button' }).click();
    
    // Wait for login to complete (example using explicit wait)
    const { until } = require('selenium-webdriver');
    await driver.wait(until.urlContains('/dashboard'), 10000);
    
    // Capture the session
    const sessionId = await psp.captureSession(driver, {
      name: 'Example Login',
      description: 'Authenticated dashboard session',
      tags: ['login', 'dashboard']
    });
    
    console.log(`Session saved with ID: ${sessionId}`);
    return sessionId;
  } finally {
    await driver.quit();
  }
}
```

#### Restoring a Session

```javascript
const { Builder } = require('selenium-webdriver');
const { createPSPClient } = require('@psp/selenium');

async function restoreSession(sessionId) {
  // Initialize PSP client (same configuration as capture)
  const psp = createPSPClient({
    storage: {
      type: 'local',
      path: './sessions'
    }
  });
  
  // Launch a new browser
  const driver = await new Builder().forBrowser('chrome').build();
  
  try {
    // Restore the session
    await psp.restoreSession(driver, sessionId);
    
    // Now you can navigate directly to authenticated pages
    await driver.get('https://example.com/dashboard/profile');
    
    // The session is fully restored, no login required
    return driver;
  } catch (error) {
    await driver.quit();
    throw error;
  }
}
```

### Java

#### Capturing a Session

```java
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import com.psp.selenium.PSPClient;
import com.psp.core.StorageConfig;
import com.psp.core.SessionOptions;

import java.time.Duration;

public class CaptureSession {
    public static String captureLoginSession() {
        // Initialize PSP client
        PSPClient psp = PSPClient.create(
            StorageConfig.builder()
                .type("local")
                .path("./sessions")
                .build()
        );
        
        // Launch browser
        WebDriver driver = new ChromeDriver();
        
        try {
            // Navigate to login page
            driver.get("https://example.com/login");
            
            // Perform login
            driver.findElement(By.id("username")).sendKeys("user@example.com");
            driver.findElement(By.id("password")).sendKeys("password123");
            driver.findElement(By.id("login-button")).click();
            
            // Wait for login to complete
            WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
            wait.until(ExpectedConditions.urlContains("/dashboard"));
            
            // Capture the session
            SessionOptions options = SessionOptions.builder()
                .name("Example Login")
                .description("Authenticated dashboard session")
                .addTag("login")
                .addTag("dashboard")
                .build();
                
            String sessionId = psp.captureSession(driver, options);
            
            System.out.println("Session saved with ID: " + sessionId);
            return sessionId;
        } finally {
            driver.quit();
        }
    }
}
```

#### Restoring a Session

```java
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;

import com.psp.selenium.PSPClient;
import com.psp.core.StorageConfig;

public class RestoreSession {
    public static WebDriver restoreSession(String sessionId) {
        // Initialize PSP client
        PSPClient psp = PSPClient.create(
            StorageConfig.builder()
                .type("local")
                .path("./sessions")
                .build()
        );
        
        // Launch browser
        WebDriver driver = new ChromeDriver();
        
        try {
            // Restore the session
            psp.restoreSession(driver, sessionId);
            
            // Navigate to authenticated page
            driver.get("https://example.com/dashboard/profile");
            
            return driver;
        } catch (Exception e) {
            driver.quit();
            throw e;
        }
    }
}
```

### Python

#### Capturing a Session

```python
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from psp.selenium import create_psp_client

def capture_login_session():
    # Initialize PSP client
    psp = create_psp_client({
        "storage": {
            "type": "local",
            "path": "./sessions"
        }
    })
    
    # Launch browser
    driver = webdriver.Chrome()
    
    try:
        # Navigate to login page
        driver.get("https://example.com/login")
        
        # Perform login
        driver.find_element(By.ID, "username").send_keys("user@example.com")
        driver.find_element(By.ID, "password").send_keys("password123")
        driver.find_element(By.ID, "login-button").click()
        
        # Wait for login to complete
        wait = WebDriverWait(driver, 10)
        wait.until(EC.url_contains("/dashboard"))
        
        # Capture the session
        session_id = psp.capture_session(driver, {
            "name": "Example Login",
            "description": "Authenticated dashboard session",
            "tags": ["login", "dashboard"]
        })
        
        print(f"Session saved with ID: {session_id}")
        return session_id
    finally:
        driver.quit()
```

#### Restoring a Session

```python
from selenium import webdriver
from psp.selenium import create_psp_client

def restore_session(session_id):
    # Initialize PSP client
    psp = create_psp_client({
        "storage": {
            "type": "local",
            "path": "./sessions"
        }
    })
    
    # Launch browser
    driver = webdriver.Chrome()
    
    try:
        # Restore the session
        psp.restore_session(driver, session_id)
        
        # Navigate to authenticated page
        driver.get("https://example.com/dashboard/profile")
        
        return driver
    except Exception as e:
        driver.quit()
        raise e
```

## Advanced Integration

### With Testing Frameworks

#### JavaScript with Mocha

```javascript
const { Builder } = require('selenium-webdriver');
const { createPSPClient } = require('@psp/selenium');
const assert = require('assert');

describe('Dashboard Tests', function() {
  let driver;
  let psp;
  let sessionId;
  
  before(async function() {
    this.timeout(30000); // Extend timeout for session capture
    
    psp = createPSPClient({
      storage: {
        type: 'local',
        path: './sessions'
      }
    });
    
    // Try to get existing session or create new one
    try {
      const sessions = await psp.listSessions({
        tags: ['login'],
        limit: 1
      });
      
      if (sessions.length > 0) {
        sessionId = sessions[0].id;
        console.log(`Using existing session: ${sessionId}`);
      } else {
        sessionId = await captureLoginSession();
      }
    } catch (error) {
      sessionId = await captureLoginSession();
    }
  });
  
  beforeEach(async function() {
    driver = await new Builder().forBrowser('chrome').build();
    await psp.restoreSession(driver, sessionId);
  });
  
  afterEach(async function() {
    if (driver) {
      await driver.quit();
    }
  });
  
  it('should display user profile correctly', async function() {
    await driver.get('https://example.com/dashboard/profile');
    
    const username = await driver.findElement({ className: 'username' }).getText();
    assert.strictEqual(username, 'user@example.com');
  });
  
  it('should display account settings correctly', async function() {
    await driver.get('https://example.com/dashboard/settings');
    
    const email = await driver.findElement({ id: 'email' }).getAttribute('value');
    assert.strictEqual(email, 'user@example.com');
  });
});
```

#### Java with TestNG

```java
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.testng.Assert;
import org.testng.annotations.*;

import com.psp.selenium.PSPClient;
import com.psp.core.StorageConfig;
import com.psp.core.SessionFilter;

import java.util.List;
import java.util.Map;

public class DashboardTests {
    private WebDriver driver;
    private PSPClient psp;
    private String sessionId;
    
    @BeforeSuite
    public void setupSuite() throws Exception {
        psp = PSPClient.create(
            StorageConfig.builder()
                .type("local")
                .path("./sessions")
                .build()
        );
        
        // Try to get existing session or create new one
        try {
            SessionFilter filter = SessionFilter.builder()
                .addTag("login")
                .limit(1)
                .build();
                
            List<Map<String, Object>> sessions = psp.listSessions(filter);
            
            if (!sessions.isEmpty()) {
                sessionId = (String) sessions.get(0).get("id");
                System.out.println("Using existing session: " + sessionId);
            } else {
                sessionId = captureLoginSession();
            }
        } catch (Exception e) {
            sessionId = captureLoginSession();
        }
    }
    
    @BeforeMethod
    public void setupTest() {
        driver = new ChromeDriver();
        psp.restoreSession(driver, sessionId);
    }
    
    @AfterMethod
    public void teardown() {
        if (driver != null) {
            driver.quit();
        }
    }
    
    @Test
    public void testUserProfile() {
        driver.get("https://example.com/dashboard/profile");
        
        String username = driver.findElement(By.className("username")).getText();
        Assert.assertEquals(username, "user@example.com");
    }
    
    @Test
    public void testAccountSettings() {
        driver.get("https://example.com/dashboard/settings");
        
        String email = driver.findElement(By.id("email")).getAttribute("value");
        Assert.assertEquals(email, "user@example.com");
    }
    
    // Helper method to capture a login session
    private String captureLoginSession() {
        // Implementation from previous example
    }
}
```

#### Python with pytest

```python
import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from psp.selenium import create_psp_client

# Initialize PSP client
@pytest.fixture(scope="session")
def psp_client():
    return create_psp_client({
        "storage": {
            "type": "local",
            "path": "./sessions"
        }
    })

# Get or create session ID
@pytest.fixture(scope="session")
def session_id(psp_client):
    try:
        # Try to get an existing session
        sessions = psp_client.list_sessions({
            "tags": ["login"],
            "limit": 1
        })
        
        if sessions:
            session_id = sessions[0]["id"]
            print(f"Using existing session: {session_id}")
            return session_id
        else:
            # Capture a new session
            return capture_login_session()
    except Exception as e:
        # If anything fails, capture a new session
        return capture_login_session()

# Create authenticated driver for each test
@pytest.fixture
def authenticated_driver(psp_client, session_id):
    driver = webdriver.Chrome()
    psp_client.restore_session(driver, session_id)
    
    yield driver
    
    driver.quit()

# Test cases
def test_user_profile(authenticated_driver):
    driver = authenticated_driver
    driver.get("https://example.com/dashboard/profile")
    
    username = driver.find_element(By.CLASS_NAME, "username").text
    assert username == "user@example.com"

def test_account_settings(authenticated_driver):
    driver = authenticated_driver
    driver.get("https://example.com/dashboard/settings")
    
    email = driver.find_element(By.ID, "email").get_attribute("value")
    assert email == "user@example.com"
```

### With Remote Storage

#### JavaScript / Node.js

```javascript
const { Builder } = require('selenium-webdriver');
const { createPSPClient } = require('@psp/selenium');

// With Cloudflare storage
const psp = createPSPClient({
  storage: {
    type: 'cloudflare',
    endpoint: 'https://psp-worker.your-domain.workers.dev',
    apiKey: process.env.PSP_API_KEY || 'your-api-key'
  }
});

// With S3 storage
const pspS3 = createPSPClient({
  storage: {
    type: 's3',
    region: 'us-east-1',
    bucket: 'psp-sessions',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'your-access-key',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'your-secret-key'
  }
});

// With Supabase storage
const pspSupabase = createPSPClient({
  storage: {
    type: 'supabase',
    url: 'https://your-project.supabase.co',
    apiKey: process.env.SUPABASE_KEY || 'your-supabase-key',
    bucket: 'sessions'
  }
});
```

#### Java

```java
import com.psp.selenium.PSPClient;
import com.psp.core.StorageConfig;

// With Cloudflare storage
PSPClient psp = PSPClient.create(
    StorageConfig.builder()
        .type("cloudflare")
        .endpoint("https://psp-worker.your-domain.workers.dev")
        .apiKey(System.getenv("PSP_API_KEY"))
        .build()
);

// With S3 storage
PSPClient pspS3 = PSPClient.create(
    StorageConfig.builder()
        .type("s3")
        .region("us-east-1")
        .bucket("psp-sessions")
        .accessKeyId(System.getenv("AWS_ACCESS_KEY_ID"))
        .secretAccessKey(System.getenv("AWS_SECRET_ACCESS_KEY"))
        .build()
);

// With Supabase storage
PSPClient pspSupabase = PSPClient.create(
    StorageConfig.builder()
        .type("supabase")
        .url("https://your-project.supabase.co")
        .apiKey(System.getenv("SUPABASE_KEY"))
        .bucket("sessions")
        .build()
);
```

#### Python

```python
from psp.selenium import create_psp_client
import os

# With Cloudflare storage
psp = create_psp_client({
    "storage": {
        "type": "cloudflare",
        "endpoint": "https://psp-worker.your-domain.workers.dev",
        "api_key": os.environ.get("PSP_API_KEY", "your-api-key")
    }
})

# With S3 storage
psp_s3 = create_psp_client({
    "storage": {
        "type": "s3",
        "region": "us-east-1",
        "bucket": "psp-sessions",
        "access_key_id": os.environ.get("AWS_ACCESS_KEY_ID", "your-access-key"),
        "secret_access_key": os.environ.get("AWS_SECRET_ACCESS_KEY", "your-secret-key")
    }
})

# With Supabase storage
psp_supabase = create_psp_client({
    "storage": {
        "type": "supabase",
        "url": "https://your-project.supabase.co",
        "api_key": os.environ.get("SUPABASE_KEY", "your-supabase-key"),
        "bucket": "sessions"
    }
})
```

## Best Practices

1. **Use Session Tags Effectively**:
   ```javascript
   const sessionId = await psp.captureSession(driver, {
     tags: ['login', 'admin', 'production']
   });
   ```

2. **Implement Session Rotation**:
   ```javascript
   function shouldRefreshSession(sessionId, maxAgeHours = 24) {
     // Get session metadata
     const session = await psp.getSession(sessionId);
     const captureTime = new Date(session.metadata.createdAt);
     const now = new Date();
     const ageHours = (now - captureTime) / (1000 * 60 * 60);
     
     // Refresh if older than max age
     return ageHours > maxAgeHours;
   }
   ```

3. **Add Graceful Fallbacks**:
   ```javascript
   async function getAuthenticatedDriver() {
     const driver = new Builder().forBrowser('chrome').build();
     
     try {
       // Try to restore session
       const sessions = await psp.listSessions({ limit: 1 });
       if (sessions.length > 0) {
         await psp.restoreSession(driver, sessions[0].id);
         
         // Verify we're actually logged in
         await driver.get('https://example.com/dashboard');
         const loggedIn = await isUserLoggedIn(driver);
         
         if (loggedIn) {
           return driver;
         }
       }
       
       // If no valid session, log in manually and capture
       await performLogin(driver);
       await psp.captureSession(driver);
       return driver;
     } catch (error) {
       // If anything fails, log in manually
       await performLogin(driver);
       return driver;
     }
   }
   ```

4. **Create Environment-Specific Sessions**:
   ```javascript
   const env = process.env.TEST_ENV || 'dev';
   
   const sessionId = await psp.captureSession(driver, {
     name: `${env.toUpperCase()} Login`,
     tags: ['login', env]
   });
   
   // Later, retrieve environment-specific sessions
   const sessions = await psp.listSessions({
     tags: ['login', env]
   });
   ```

5. **Clean Up Old Sessions**:
   ```javascript
   async function cleanupOldSessions(maxAgeDays = 30) {
     const cutoffDate = new Date();
     cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
     
     const sessions = await psp.listSessions();
     
     for (const session of sessions) {
       const createdAt = new Date(session.metadata.createdAt);
       if (createdAt < cutoffDate) {
         await psp.deleteSession(session.id);
         console.log(`Deleted old session: ${session.id}`);
       }
     }
   }
   ```

## Troubleshooting

### Common Issues

1. **Cookie Domain Issues**:
   Cookies are domain-specific. Make sure you're restoring on the same domain where they were captured.

   ```javascript
   // Capture on specific domain
   await driver.get('https://example.com');
   const sessionId = await psp.captureSession(driver);
   
   // Make sure to navigate to the same domain before/during restoration
   await driver.get('https://example.com');
   await psp.restoreSession(driver, sessionId);
   ```

2. **Handling HttpOnly Cookies**:
   Some cookies can't be accessed via JavaScript. PSP's Selenium adapter handles this by using WebDriver-specific APIs.

3. **Authentication Tokens in localStorage**:
   If authentication relies on tokens with expiration, you may need to refresh them:

   ```javascript
   async function refreshTokenIfNeeded(driver) {
     const isTokenExpired = await driver.executeScript(() => {
       const token = localStorage.getItem('auth_token');
       if (!token) return true;
       
       // Parse token and check expiration
       try {
         const payload = JSON.parse(atob(token.split('.')[1]));
         return payload.exp * 1000 < Date.now();
       } catch (e) {
         return true;
       }
     });
     
     if (isTokenExpired) {
       await performTokenRefresh(driver);
     }
   }
   ```

4. **Versioning Issues**:
   If you upgrade PSP, the session format might change. Consider migrating old sessions or creating new ones.

## Complete Example Project

### JavaScript / Node.js

Here's a complete example project structure for a Node.js Selenium setup with PSP:

```
selenium-psp-example/
├── package.json
├── config.js
├── sessions/
├── src/
│   ├── utils/
│   │   ├── psp-client.js
│   │   └── session-manager.js
│   └── tests/
│       ├── login.test.js
│       └── dashboard.test.js
└── .env
```

#### package.json
```json
{
  "name": "selenium-psp-example",
  "version": "1.0.0",
  "scripts": {
    "test": "mocha src/tests/**/*.test.js --timeout 30000"
  },
  "dependencies": {
    "@psp/core": "^1.0.0",
    "@psp/selenium": "^1.0.0",
    "dotenv": "^16.0.0",
    "selenium-webdriver": "^4.10.0"
  },
  "devDependencies": {
    "mocha": "^10.0.0"
  }
}
```

#### config.js
```javascript
require('dotenv').config();

module.exports = {
  storage: {
    type: process.env.PSP_STORAGE_TYPE || 'local',
    path: process.env.PSP_LOCAL_PATH || './sessions',
    
    // Cloudflare settings
    endpoint: process.env.PSP_CLOUDFLARE_ENDPOINT,
    apiKey: process.env.PSP_CLOUDFLARE_API_KEY,
    
    // S3 settings
    region: process.env.PSP_S3_REGION,
    bucket: process.env.PSP_S3_BUCKET,
    accessKeyId: process.env.PSP_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.PSP_S3_SECRET_ACCESS_KEY
  },
  baseUrl: process.env.BASE_URL || 'https://example.com',
  credentials: {
    username: process.env.TEST_USERNAME || 'user@example.com',
    password: process.env.TEST_PASSWORD || 'password123'
  }
};
```

#### src/utils/psp-client.js
```javascript
const { createPSPClient } = require('@psp/selenium');
const config = require('../../config');

// Create and export PSP client
module.exports = createPSPClient({
  storage: config.storage
});
```

#### src/utils/session-manager.js
```javascript
const { Builder } = require('selenium-webdriver');
const { until } = require('selenium-webdriver');
const By = require('selenium-webdriver').By;
const psp = require('./psp-client');
const config = require('../../config');

async function captureLoginSession() {
  const driver = await new Builder().forBrowser('chrome').build();
  
  try {
    await driver.get(`${config.baseUrl}/login`);
    
    // Perform login
    await driver.findElement(By.id('username')).sendKeys(config.credentials.username);
    await driver.findElement(By.id('password')).sendKeys(config.credentials.password);
    await driver.findElement(By.id('login-button')).click();
    
    // Wait for login to complete
    await driver.wait(until.urlContains('/dashboard'), 10000);
    
    // Capture the session
    return await psp.captureSession(driver, {
      name: 'Login Session',
      description: 'Standard user login',
      tags: ['login', 'standard']
    });
  } finally {
    await driver.quit();
  }
}

async function getSessionId() {
  try {
    const sessions = await psp.listSessions({
      tags: ['login'],
      limit: 1
    });
    
    if (sessions.length > 0) {
      return sessions[0].id;
    }
    
    return await captureLoginSession();
  } catch (error) {
    console.error('Failed to get session ID:', error);
    return await captureLoginSession();
  }
}

async function getAuthenticatedDriver() {
  const sessionId = await getSessionId();
  const driver = await new Builder().forBrowser('chrome').build();
  
  try {
    await psp.restoreSession(driver, sessionId);
    return driver;
  } catch (error) {
    await driver.quit();
    throw error;
  }
}

module.exports = {
  captureLoginSession,
  getSessionId,
  getAuthenticatedDriver
};
```

#### src/tests/dashboard.test.js
```javascript
const assert = require('assert');
const { getAuthenticatedDriver } = require('../utils/session-manager');
const By = require('selenium-webdriver').By;
const config = require('../../config');

describe('Dashboard Tests', function() {
  let driver;
  
  beforeEach(async function() {
    driver = await getAuthenticatedDriver();
  });
  
  afterEach(async function() {
    if (driver) {
      await driver.quit();
    }
  });
  
  it('should display correct username in profile', async function() {
    await driver.get(`${config.baseUrl}/dashboard/profile`);
    
    const username = await driver.findElement(By.className('username')).getText();
    assert.strictEqual(username, config.credentials.username);
  });
  
  it('should display account settings correctly', async function() {
    await driver.get(`${config.baseUrl}/dashboard/settings`);
    
    const email = await driver.findElement(By.id('email')).getAttribute('value');
    assert.strictEqual(email, config.credentials.username);
  });
});
```

This structure provides a clean separation of concerns:
- The PSP client is configured in one place
- Session management logic is isolated
- Tests only focus on assertions, not authentication
- Configuration is externalized and environment-variable driven