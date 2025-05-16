# PSP Simple UI

A lightweight, dependency-free UI for managing persistent browser sessions with PSP.

## Features

- Simple HTML/CSS/JS implementation (no React, Next.js, etc.)
- Authentication with Supabase
- Session management (create, list, view, delete)
- Import/export sessions
- Load sessions into the current browser

## Setup

1. Create a Supabase account and project at [supabase.com](https://supabase.com)

2. Configure authentication in your Supabase project:
   - Enable Email/Password sign-up
   - Configure email templates
   - Add your deployment URL to the allowed redirect URLs

3. Edit `config.js` to add your Supabase credentials and API endpoint:
   ```js
   const SUPABASE_CONFIG = {
     url: 'https://your-project.supabase.co',
     key: 'your-anon-key',
   };
   
   const DEFAULT_API_ENDPOINT = 'https://your-worker.workers.dev';
   ```

4. Deploy your Cloudflare Worker for storage:
   ```bash
   cd ../storage-worker
   npm run deploy
   ```

5. Deploy this UI to Cloudflare Pages, Netlify, or any static hosting:
   ```bash
   # Using Cloudflare Pages
   npx wrangler pages publish . --project-name psp-ui
   
   # Or just use any static file hosting
   ```

## Usage

1. Open the deployed UI in your browser
2. Sign up or log in using your email
3. Configure the API endpoint (your deployed Cloudflare Worker URL)
4. Start creating and managing sessions!

## Local Development

To run locally:

```bash
# Using any simple HTTP server
npx serve

# Or with Python
python -m http.server 8080
```

## Capture Methods

The UI supports multiple ways to capture browser sessions:

1. **Current Browser Tab**: Captures the storage state of the current page
2. **Specific URL**: Creates a session template for a specific URL
3. **Upload Session File**: Import a previously exported session

## Limitations

When capturing the current browser tab, note these limitations:

- Cookies marked as HttpOnly cannot be read by JavaScript
- You can only access cookies for the current domain
- Cross-domain localStorage/sessionStorage is not accessible

For more powerful capture capabilities, use the PSP browser extensions or the programmatic API with Playwright/Selenium.