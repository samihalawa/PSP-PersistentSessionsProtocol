const { description } = require('../../package.json');

module.exports = {
  title: 'PersistentSessionsProtocol',
  description: description,
  head: [
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }],
    ['link', { rel: 'icon', href: '/favicon.ico' }]
  ],
  themeConfig: {
    repo: 'PersistentSessionsProtocol/psp',
    docsDir: 'docs',
    editLinks: true,
    editLinkText: 'Edit this page on GitHub',
    lastUpdated: 'Last Updated',
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Protocol', link: '/protocol/' },
      { text: 'API', link: '/api/' },
      { text: 'Examples', link: '/examples/' },
    ],
    sidebar: {
      '/guide/': [
        {
          title: 'Guide',
          collapsable: false,
          children: [
            '',
            'getting-started',
            'installation',
            'configuration',
            'usage',
            'security',
            'faq',
          ]
        }
      ],
      '/protocol/': [
        {
          title: 'Protocol',
          collapsable: false,
          children: [
            '',
            'data-model',
            'implementing-adapters',
            'storage-providers',
            'security-model',
          ]
        }
      ],
      '/api/': [
        {
          title: 'API Reference',
          collapsable: false,
          children: [
            '',
            'core',
            'adapters',
            'storage',
            'server',
          ]
        }
      ],
      '/examples/': [
        {
          title: 'Examples',
          collapsable: false,
          children: [
            '',
            'playwright',
            'selenium',
            'custom-adapter',
          ]
        }
      ],
    }
  },
  plugins: [
    '@vuepress/plugin-back-to-top',
    '@vuepress/plugin-medium-zoom',
  ]
}