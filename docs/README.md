# PSP Documentation Website

This directory contains the static GitHub Pages website for the Persistent Sessions Protocol (PSP).

## Structure

- `index.html` - Main landing page with features, platform showcase, and getting started guide
- `ui.html` - Interactive demo interface for PSP session management
- `guide/` - Step-by-step documentation and tutorials
- `api/` - Complete API reference documentation
- `platforms/` - Platform-specific integration guides
- `examples/` - Code examples and real-world scenarios
- `security/` - Security best practices and guidelines
- `adapters/` - Custom adapter development documentation

## Live Website

Visit the live website at: https://samihalawa.github.io/PSP-PersistentSessionsProtocol/

## Local Development

Since this is a static website using only HTML, CSS, and JavaScript, you can serve it locally with any static file server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js http-server
npx http-server docs

# Using PHP
php -S localhost:8000
```

Then open http://localhost:8000 in your browser.

## Features

- ✅ Pure static HTML/CSS/JavaScript - no build process required
- ✅ Fully responsive design with modern UI components
- ✅ CDN-based dependencies (TailwindCSS, Font Awesome)
- ✅ Interactive demo interface
- ✅ Complete documentation suite
- ✅ GitHub Pages ready deployment