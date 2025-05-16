# PSP Stagehand Adapter

This package provides a Stagehand adapter for the Persistent Sessions Protocol. It allows you to capture, store, and restore browser sessions when using the Stagehand automation framework.

## Installation

```bash
npm install @psp/stagehand
```

## Usage

```javascript
import { Stagehand } from '@stagehand/core';
import { StagehandAdapter } from '@psp/stagehand';

async function stagehandExample() {
  // Initialize Stagehand
  const stagehand = await Stagehand.create();
  
  // Create PSP adapter
  const adapter = new StagehandAdapter();
  
  // Create a session
  const session = await adapter.createSession(stagehand, {
    name: 'stagehand-session',
    description: 'Stagehand authenticated session'
  });
  
  // Navigate to a website
  await stagehand.goto('https://example.com/login');
  
  // Fill form and submit using Stagehand's reliable element selection
  await stagehand.withinForm('Login', async form => {
    await form.fillField('Username', 'user@example.com');
    await form.fillField('Password', 'password123');
    await form.submit();
  });
  
  // Wait for navigation
  await stagehand.waitFor({ pageLoad: true });
  
  // Capture the authenticated session
  await session.capture();
  
  console.log(`Session saved with ID: ${session.getId()}`);
  
  // Later, restore the session
  const newStagehand = await Stagehand.create();
  
  // Load the saved session
  const savedSession = await adapter.loadSession(session.getId());
  
  // Restore the session to the new browser
  await savedSession.restore(newStagehand);
  
  // Navigate to a protected page - already authenticated
  await newStagehand.goto('https://example.com/dashboard');
  
  // Verify we're logged in
  const username = await newStagehand.text('username-display');
  console.log(`Logged in as: ${username}`);
}
```

## Features

- **Reliable Element Selection**: Works with Stagehand's powerful element selection strategies.
- **Form State Capture**: Optionally capture and restore form field values.
- **Selector Registry**: Save and restore Stagehand's selector registry.
- **Event Recording & Playback**: Record user interactions and play them back.

## Configuration Options

The Stagehand adapter accepts the following configuration options:

```javascript
const adapter = new StagehandAdapter({
  stagehandOptions: {
    // Whether to include selector strategy in session capture
    captureSelectors: true,
    
    // Whether to include form state in session capture
    captureFormState: true
  }
});
```

## License

MIT