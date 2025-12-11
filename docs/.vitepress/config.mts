import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "PSP",
  description: "Persistent Sessions Protocol - The Universal Browser Session Standard",
  base: "/PSP-PersistentSessionsProtocol/", // IMPORTANT: Repository name for GitHub Pages
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'API', link: '/api/cli' },
      { text: 'GitHub', link: 'https://github.com/samihalawa/PSP-PersistentSessionsProtocol' }
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Introduction', link: '/guide/introduction' },
          { text: 'Quick Start', link: '/guide/quick-start' },
          { text: 'Architecture', link: '/guide/architecture' }
        ]
      },
      {
        text: 'API Reference',
        items: [
          { text: 'CLI', link: '/api/cli' },
          { text: 'Server', link: '/api/server' },
          { text: 'SDKs', link: '/api/sdk' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/samihalawa/PSP-PersistentSessionsProtocol' }
    ]
  }
})
