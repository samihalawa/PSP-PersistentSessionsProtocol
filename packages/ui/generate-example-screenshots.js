/**
 * Simple script to generate example screenshots for the PSP Dashboard UI
 */
const fs = require('fs');
const path = require('path');

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Function to create placeholder images
const createPlaceholderImage = (name, width = 1280, height = 800) => {
  console.log(`Creating placeholder screenshot: ${name}`);
  
  // Create SVG with example UI content
  const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f5f5f5"/>
  
  <!-- Header -->
  <rect x="0" y="0" width="${width}" height="64" fill="#1976d2"/>
  <text x="24" y="40" font-family="Arial" font-size="24" font-weight="bold" fill="white">PSP Dashboard - ${name}</text>
  
  <!-- Sidebar -->
  <rect x="0" y="64" width="240" height="${height - 64}" fill="#ffffff"/>
  <rect x="0" y="64" width="240" height="${height - 64}" fill="#ffffff" stroke="#e0e0e0" stroke-width="1"/>
  
  <!-- Navigation Items -->
  <rect x="12" y="100" width="216" height="40" rx="4" fill="${name === 'Dashboard' ? '#e3f2fd' : 'transparent'}"/>
  <text x="56" y="125" font-family="Arial" font-size="16" fill="#333333">Dashboard</text>
  
  <rect x="12" y="150" width="216" height="40" rx="4" fill="${name === 'Sessions' ? '#e3f2fd' : 'transparent'}"/>
  <text x="56" y="175" font-family="Arial" font-size="16" fill="#333333">Sessions</text>
  
  <rect x="12" y="200" width="216" height="40" rx="4" fill="${name === 'Recorder' ? '#e3f2fd' : 'transparent'}"/>
  <text x="56" y="225" font-family="Arial" font-size="16" fill="#333333">Recorder</text>
  
  <rect x="12" y="250" width="216" height="40" rx="4" fill="${name === 'History' ? '#e3f2fd' : 'transparent'}"/>
  <text x="56" y="275" font-family="Arial" font-size="16" fill="#333333">History</text>
  
  <rect x="12" y="300" width="216" height="40" rx="4" fill="${name === 'Settings' ? '#e3f2fd' : 'transparent'}"/>
  <text x="56" y="325" font-family="Arial" font-size="16" fill="#333333">Settings</text>
  
  <!-- Content Area -->
  <rect x="260" y="84" width="${width - 280}" height="60" rx="4" fill="#ffffff"/>
  <text x="280" y="124" font-family="Arial" font-size="24" fill="#333333">${name}</text>
  
  <!-- Page Content - Different for each page -->
  ${getPageSpecificContent(name, width, height)}
  
  <!-- Footer -->
  <rect x="0" y="${height - 40}" width="${width}" height="40" fill="#f5f5f5"/>
  <text x="${width / 2}" y="${height - 15}" font-family="Arial" font-size="14" fill="#757575" text-anchor="middle">PSP v0.1.0 | Persistent Sessions Protocol</text>
</svg>
  `;
  
  // Write SVG file
  fs.writeFileSync(path.join(screenshotsDir, `${name.toLowerCase().replace(/\s+/g, '-')}.svg`), svg);
};

// Generate content for different pages
function getPageSpecificContent(pageName, width, height) {
  switch(pageName) {
    case 'Dashboard':
      return `
        <!-- Stats Cards -->
        <rect x="260" y="160" width="300" height="120" rx="4" fill="#ffffff" stroke="#e0e0e0" stroke-width="1"/>
        <text x="280" y="190" font-family="Arial" font-size="18" fill="#333333">Active Sessions</text>
        <text x="280" y="240" font-family="Arial" font-size="32" fill="#1976d2">24</text>
        
        <rect x="580" y="160" width="300" height="120" rx="4" fill="#ffffff" stroke="#e0e0e0" stroke-width="1"/>
        <text x="600" y="190" font-family="Arial" font-size="18" fill="#333333">Total Recordings</text>
        <text x="600" y="240" font-family="Arial" font-size="32" fill="#1976d2">142</text>
        
        <rect x="900" y="160" width="300" height="120" rx="4" fill="#ffffff" stroke="#e0e0e0" stroke-width="1"/>
        <text x="920" y="190" font-family="Arial" font-size="18" fill="#333333">Storage Used</text>
        <text x="920" y="240" font-family="Arial" font-size="32" fill="#1976d2">2.4 GB</text>
        
        <!-- Chart -->
        <rect x="260" y="300" width="940" height="400" rx="4" fill="#ffffff" stroke="#e0e0e0" stroke-width="1"/>
        <text x="280" y="330" font-family="Arial" font-size="18" fill="#333333">Sessions Activity</text>
        
        <!-- Chart Elements -->
        <rect x="280" y="360" width="900" height="320" fill="#ffffff"/>
        <path d="M280,680 L1180,680" stroke="#e0e0e0" stroke-width="1"/>
        <path d="M280,360 L280,680" stroke="#e0e0e0" stroke-width="1"/>
        
        <!-- Chart Data -->
        <path d="M280,600 C400,580 500,500 600,540 C700,580 800,480 900,460 C1000,440 1100,420 1180,380" stroke="#1976d2" stroke-width="3" fill="none"/>
      `;
    case 'Sessions':
      return `
        <!-- Toolbar -->
        <rect x="260" y="160" width="940" height="60" rx="4" fill="#ffffff" stroke="#e0e0e0" stroke-width="1"/>
        <rect x="280" y="175" width="200" height="30" rx="15" fill="#f5f5f5"/>
        <text x="310" y="195" font-family="Arial" font-size="14" fill="#757575">Search sessions...</text>
        
        <rect x="1080" y="175" width="100" height="30" rx="15" fill="#1976d2"/>
        <text x="1105" y="195" font-family="Arial" font-size="14" fill="white">Create</text>
        
        <!-- Sessions Table -->
        <rect x="260" y="240" width="940" height="400" rx="4" fill="#ffffff" stroke="#e0e0e0" stroke-width="1"/>
        
        <!-- Table Header -->
        <rect x="260" y="240" width="940" height="40" fill="#f5f5f5"/>
        <text x="280" y="265" font-family="Arial" font-size="14" font-weight="bold" fill="#333333">Name</text>
        <text x="520" y="265" font-family="Arial" font-size="14" font-weight="bold" fill="#333333">Status</text>
        <text x="680" y="265" font-family="Arial" font-size="14" font-weight="bold" fill="#333333">Framework</text>
        <text x="840" y="265" font-family="Arial" font-size="14" font-weight="bold" fill="#333333">Created</text>
        <text x="1080" y="265" font-family="Arial" font-size="14" font-weight="bold" fill="#333333">Actions</text>
        
        <!-- Table Rows -->
        <rect x="260" y="280" width="940" height="60" fill="#ffffff" stroke="#e0e0e0" stroke-width="1"/>
        <text x="280" y="315" font-family="Arial" font-size="14" fill="#333333">Login Session</text>
        <rect x="520" y="295" width="80" height="30" rx="15" fill="#e8f5e9"/>
        <text x="535" y="315" font-family="Arial" font-size="14" fill="#2e7d32">Active</text>
        <text x="680" y="315" font-family="Arial" font-size="14" fill="#333333">Playwright</text>
        <text x="840" y="315" font-family="Arial" font-size="14" fill="#333333">2025-05-15</text>
        <text x="1080" y="315" font-family="Arial" font-size="14" fill="#1976d2">View Session</text>
        
        <rect x="260" y="340" width="940" height="60" fill="#ffffff" stroke="#e0e0e0" stroke-width="1"/>
        <text x="280" y="375" font-family="Arial" font-size="14" fill="#333333">E-commerce Checkout</text>
        <rect x="520" y="355" width="80" height="30" rx="15" fill="#e8f5e9"/>
        <text x="535" y="375" font-family="Arial" font-size="14" fill="#2e7d32">Active</text>
        <text x="680" y="375" font-family="Arial" font-size="14" fill="#333333">Selenium</text>
        <text x="840" y="375" font-family="Arial" font-size="14" fill="#333333">2025-05-14</text>
        <text x="1080" y="375" font-family="Arial" font-size="14" fill="#1976d2">View Session</text>
        
        <rect x="260" y="400" width="940" height="60" fill="#ffffff" stroke="#e0e0e0" stroke-width="1"/>
        <text x="280" y="435" font-family="Arial" font-size="14" fill="#333333">User Settings</text>
        <rect x="520" y="415" width="90" height="30" rx="15" fill="#ffebee"/>
        <text x="535" y="435" font-family="Arial" font-size="14" fill="#c62828">Expired</text>
        <text x="680" y="435" font-family="Arial" font-size="14" fill="#333333">Playwright</text>
        <text x="840" y="435" font-family="Arial" font-size="14" fill="#333333">2025-05-10</text>
        <text x="1080" y="435" font-family="Arial" font-size="14" fill="#1976d2">View Session</text>
      `;
    case 'Session Details':
      return `
        <!-- Session Card -->
        <rect x="260" y="160" width="940" height="120" rx="4" fill="#ffffff" stroke="#e0e0e0" stroke-width="1"/>
        <text x="280" y="190" font-family="Arial" font-size="18" fill="#333333">Login Session</text>
        <rect x="280" y="205" width="80" height="30" rx="15" fill="#e8f5e9"/>
        <text x="295" y="225" font-family="Arial" font-size="14" fill="#2e7d32">Active</text>
        <text x="380" y="225" font-family="Arial" font-size="14" fill="#757575">Created: 2025-05-15 • Framework: Playwright</text>
        <text x="280" y="255" font-family="Arial" font-size="14" fill="#757575">ID: sess_a1b2c3d4e5f6</text>
        
        <!-- Tabs -->
        <rect x="260" y="300" width="940" height="50" rx="4" fill="#ffffff" stroke="#e0e0e0" stroke-width="1"/>
        <rect x="260" y="300" width="156" height="50" fill="#e3f2fd"/>
        <text x="320" y="330" font-family="Arial" font-size="14" font-weight="bold" fill="#1976d2">Metadata</text>
        <text x="476" y="330" font-family="Arial" font-size="14" fill="#757575">Cookies</text>
        <text x="576" y="330" font-family="Arial" font-size="14" fill="#757575">Storage</text>
        <text x="676" y="330" font-family="Arial" font-size="14" fill="#757575">Network</text>
        <text x="776" y="330" font-family="Arial" font-size="14" fill="#757575">DOM</text>
        <text x="876" y="330" font-family="Arial" font-size="14" fill="#757575">Recording</text>
        
        <!-- Content -->
        <rect x="260" y="350" width="940" height="300" rx="4" fill="#ffffff" stroke="#e0e0e0" stroke-width="1"/>
        <text x="280" y="380" font-family="Arial" font-size="16" font-weight="bold" fill="#333333">Session Metadata</text>
        
        <!-- Metadata Key-Value Pairs -->
        <text x="280" y="420" font-family="Arial" font-size="14" font-weight="bold" fill="#757575">Browser:</text>
        <text x="380" y="420" font-family="Arial" font-size="14" fill="#333333">Chrome 112.0.5615.121</text>
        
        <text x="280" y="450" font-family="Arial" font-size="14" font-weight="bold" fill="#757575">OS:</text>
        <text x="380" y="450" font-family="Arial" font-size="14" fill="#333333">macOS 13.4</text>
        
        <text x="280" y="480" font-family="Arial" font-size="14" font-weight="bold" fill="#757575">URL:</text>
        <text x="380" y="480" font-family="Arial" font-size="14" fill="#333333">https://example.com/login</text>
        
        <text x="280" y="510" font-family="Arial" font-size="14" font-weight="bold" fill="#757575">User Agent:</text>
        <text x="380" y="510" font-family="Arial" font-size="14" fill="#333333">Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)</text>
        
        <text x="280" y="540" font-family="Arial" font-size="14" font-weight="bold" fill="#757575">Created:</text>
        <text x="380" y="540" font-family="Arial" font-size="14" fill="#333333">2025-05-15 14:32:10</text>
        
        <text x="280" y="570" font-family="Arial" font-size="14" font-weight="bold" fill="#757575">Expires:</text>
        <text x="380" y="570" font-family="Arial" font-size="14" fill="#333333">2025-05-22 14:32:10 (7 days)</text>
        
        <text x="280" y="600" font-family="Arial" font-size="14" font-weight="bold" fill="#757575">Size:</text>
        <text x="380" y="600" font-family="Arial" font-size="14" fill="#333333">256 KB</text>
        
        <!-- Actions -->
        <rect x="260" y="670" width="940" height="60" rx="4" fill="#ffffff" stroke="#e0e0e0" stroke-width="1"/>
        <rect x="280" y="685" width="120" height="30" rx="15" fill="#1976d2"/>
        <text x="305" y="705" font-family="Arial" font-size="14" fill="white">Edit Session</text>
        
        <rect x="420" y="685" width="120" height="30" rx="15" fill="#f5f5f5"/>
        <text x="445" y="705" font-family="Arial" font-size="14" fill="#333333">Export</text>
        
        <rect x="560" y="685" width="120" height="30" rx="15" fill="#f5f5f5"/>
        <text x="585" y="705" font-family="Arial" font-size="14" fill="#333333">Share</text>
        
        <rect x="1060" y="685" width="120" height="30" rx="15" fill="#ffebee"/>
        <text x="1085" y="705" font-family="Arial" font-size="14" fill="#c62828">Delete</text>
      `;
    case 'Recorder':
      return `
        <!-- Recorder Interface -->
        <rect x="260" y="160" width="940" height="520" rx="4" fill="#ffffff" stroke="#e0e0e0" stroke-width="1"/>
        
        <!-- URL Bar -->
        <rect x="280" y="180" width="800" height="40" rx="4" fill="#f5f5f5"/>
        <text x="300" y="205" font-family="Arial" font-size="14" fill="#757575">https://example.com</text>
        <rect x="1100" y="180" width="80" height="40" rx="4" fill="#1976d2"/>
        <text x="1122" y="205" font-family="Arial" font-size="14" fill="white">Go</text>
        
        <!-- Browser Preview -->
        <rect x="280" y="240" width="900" height="360" rx="4" fill="#f5f5f5"/>
        <text x="630" y="420" font-family="Arial" font-size="18" fill="#757575" text-anchor="middle">Browser Preview</text>
        
        <!-- Recording Controls -->
        <rect x="280" y="620" width="900" height="40" rx="4" fill="#ffffff"/>
        
        <rect x="280" y="620" width="120" height="40" rx="20" fill="#f44336"/>
        <text x="305" y="645" font-family="Arial" font-size="14" fill="white">● Record</text>
        
        <rect x="420" y="620" width="120" height="40" rx="20" fill="#f5f5f5"/>
        <text x="458" y="645" font-family="Arial" font-size="14" fill="#333333">Stop</text>
        
        <rect x="560" y="620" width="120" height="40" rx="20" fill="#f5f5f5"/>
        <text x="590" y="645" font-family="Arial" font-size="14" fill="#333333">Pause</text>
        
        <rect x="780" y="620" width="200" height="40" rx="20" fill="#f5f5f5"/>
        <text x="800" y="645" font-family="Arial" font-size="14" fill="#333333">Recording time: 00:00</text>
        
        <rect x="1000" y="620" width="180" height="40" rx="20" fill="#4caf50"/>
        <text x="1027" y="645" font-family="Arial" font-size="14" fill="white">Save Session</text>
      `;
    case 'History':
      return `
        <!-- History Timeline -->
        <rect x="260" y="160" width="940" height="520" rx="4" fill="#ffffff" stroke="#e0e0e0" stroke-width="1"/>
        <text x="280" y="190" font-family="Arial" font-size="16" font-weight="bold" fill="#333333">Session History</text>
        
        <!-- Timeline Item 1 -->
        <rect x="280" y="220" width="900" height="80" rx="4" fill="#f5f5f5"/>
        <circle cx="320" cy="260" r="10" fill="#1976d2"/>
        <text x="350" y="245" font-family="Arial" font-size="16" font-weight="bold" fill="#333333">Session Created</text>
        <text x="350" y="270" font-family="Arial" font-size="14" fill="#757575">2025-05-15 14:32:10</text>
        <text x="600" y="260" font-family="Arial" font-size="14" fill="#333333">Initial login session captured with Playwright</text>
        
        <!-- Timeline Item 2 -->
        <rect x="280" y="320" width="900" height="80" rx="4" fill="#f5f5f5"/>
        <circle cx="320" cy="360" r="10" fill="#4caf50"/>
        <text x="350" y="345" font-family="Arial" font-size="16" font-weight="bold" fill="#333333">Session Modified</text>
        <text x="350" y="370" font-family="Arial" font-size="14" fill="#757575">2025-05-15 15:45:22</text>
        <text x="600" y="360" font-family="Arial" font-size="14" fill="#333333">Updated cookies and localStorage</text>
        
        <!-- Timeline Item 3 -->
        <rect x="280" y="420" width="900" height="80" rx="4" fill="#f5f5f5"/>
        <circle cx="320" cy="460" r="10" fill="#ff9800"/>
        <text x="350" y="445" font-family="Arial" font-size="16" font-weight="bold" fill="#333333">Session Shared</text>
        <text x="350" y="470" font-family="Arial" font-size="14" fill="#757575">2025-05-16 09:12:45</text>
        <text x="600" y="460" font-family="Arial" font-size="14" fill="#333333">Session shared with team members via secure link</text>
        
        <!-- Timeline Item 4 -->
        <rect x="280" y="520" width="900" height="80" rx="4" fill="#f5f5f5"/>
        <circle cx="320" cy="560" r="10" fill="#9c27b0"/>
        <text x="350" y="545" font-family="Arial" font-size="16" font-weight="bold" fill="#333333">Recording Added</text>
        <text x="350" y="570" font-family="Arial" font-size="14" fill="#757575">2025-05-16 10:30:18</text>
        <text x="600" y="560" font-family="Arial" font-size="14" fill="#333333">Added user checkout flow recording</text>
      `;
    case 'Settings':
      return `
        <!-- Settings Page -->
        <rect x="260" y="160" width="940" height="520" rx="4" fill="#ffffff" stroke="#e0e0e0" stroke-width="1"/>
        
        <!-- Settings Categories -->
        <rect x="280" y="180" width="240" height="480" rx="4" fill="#f5f5f5"/>
        <rect x="280" y="180" width="240" height="60" fill="#e3f2fd"/>
        <text x="310" y="215" font-family="Arial" font-size="16" fill="#1976d2">General</text>
        
        <rect x="280" y="240" width="240" height="60" fill="#f5f5f5"/>
        <text x="310" y="275" font-family="Arial" font-size="16" fill="#333333">Storage</text>
        
        <rect x="280" y="300" width="240" height="60" fill="#f5f5f5"/>
        <text x="310" y="335" font-family="Arial" font-size="16" fill="#333333">API Keys</text>
        
        <rect x="280" y="360" width="240" height="60" fill="#f5f5f5"/>
        <text x="310" y="395" font-family="Arial" font-size="16" fill="#333333">Notifications</text>
        
        <rect x="280" y="420" width="240" height="60" fill="#f5f5f5"/>
        <text x="310" y="455" font-family="Arial" font-size="16" fill="#333333">Security</text>
        
        <rect x="280" y="480" width="240" height="60" fill="#f5f5f5"/>
        <text x="310" y="515" font-family="Arial" font-size="16" fill="#333333">Advanced</text>
        
        <!-- Settings Content -->
        <text x="560" y="215" font-family="Arial" font-size="20" font-weight="bold" fill="#333333">General Settings</text>
        
        <!-- Setting 1 -->
        <rect x="560" y="250" width="600" height="60" rx="4" fill="#f5f5f5"/>
        <text x="580" y="285" font-family="Arial" font-size="16" fill="#333333">Dark Mode</text>
        <rect x="1080" y="265" width="60" height="30" rx="15" fill="#1976d2"/>
        <circle cx="1120" cy="280" r="12" fill="white"/>
        
        <!-- Setting 2 -->
        <rect x="560" y="330" width="600" height="60" rx="4" fill="#f5f5f5"/>
        <text x="580" y="365" font-family="Arial" font-size="16" fill="#333333">Auto-save Sessions</text>
        <rect x="1080" y="345" width="60" height="30" rx="15" fill="#1976d2"/>
        <circle cx="1120" cy="360" r="12" fill="white"/>
        
        <!-- Setting 3 -->
        <rect x="560" y="410" width="600" height="60" rx="4" fill="#f5f5f5"/>
        <text x="580" y="445" font-family="Arial" font-size="16" fill="#333333">Session Expiry</text>
        <rect x="980" y="425" width="160" height="30" rx="4" fill="white" stroke="#e0e0e0" stroke-width="1"/>
        <text x="1000" y="445" font-family="Arial" font-size="14" fill="#333333">7 days</text>
        
        <!-- Setting 4 -->
        <rect x="560" y="490" width="600" height="60" rx="4" fill="#f5f5f5"/>
        <text x="580" y="525" font-family="Arial" font-size="16" fill="#333333">Default Storage Location</text>
        <rect x="980" y="505" width="160" height="30" rx="4" fill="white" stroke="#e0e0e0" stroke-width="1"/>
        <text x="1000" y="525" font-family="Arial" font-size="14" fill="#333333">Local</text>
      `;
    default:
      return '';
  }
}

// Generate screenshots for each main page
createPlaceholderImage('Dashboard');
createPlaceholderImage('Sessions');
createPlaceholderImage('Session Details');
createPlaceholderImage('Recorder');
createPlaceholderImage('History');
createPlaceholderImage('Settings');
createPlaceholderImage('Dashboard Dark', 1280, 800);

console.log('Generated example screenshots in the screenshots directory.');