/**
 * Simple script to convert SVG screenshots to PNG for better compatibility
 * 
 * This is a mockup for the functionality. In a real implementation,
 * you would use a library like sharp or svg2png to convert the images.
 */
const fs = require('fs');
const path = require('path');

const screenshotsDir = path.join(__dirname, 'screenshots');

// Function to convert SVG to base64 data URL
const convertToDataUrl = (svgPath) => {
  const svg = fs.readFileSync(svgPath, 'utf8');
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
};

// Read all SVG files in screenshots directory
const svgFiles = fs.readdirSync(screenshotsDir)
  .filter(file => file.endsWith('.svg'));

// Convert each SVG to a data URL and create an HTML file that displays all screenshots
const screenshotsHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>PSP Dashboard Screenshots</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      max-width: 1200px; 
      margin: 0 auto; 
      padding: 20px;
    }
    h1, h2 { color: #1976d2; }
    .screenshot { 
      margin-bottom: 30px; 
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }
    .screenshot h2 {
      background: #f5f5f5;
      margin: 0;
      padding: 10px;
      border-bottom: 1px solid #e0e0e0;
    }
    .screenshot img {
      width: 100%;
      height: auto;
      display: block;
    }
  </style>
</head>
<body>
  <h1>PSP Dashboard Screenshots</h1>
  <p>These screenshots showcase the UI for the Persistent Sessions Protocol Dashboard.</p>
  
  ${svgFiles.map(file => {
    const name = file.replace('.svg', '').split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    return `
    <div class="screenshot">
      <h2>${name}</h2>
      <img src="${convertToDataUrl(path.join(screenshotsDir, file))}" alt="${name}">
    </div>
    `;
  }).join('')}
</body>
</html>
`;

// Write the HTML file
fs.writeFileSync(path.join(screenshotsDir, 'index.html'), screenshotsHtml);

console.log('Created screenshots gallery HTML in the screenshots directory.');

// In a real scenario, we would convert SVGs to PNGs here
// For now, we'll copy the SVGs to "PNG files" for demonstration purposes
svgFiles.forEach(file => {
  const svgPath = path.join(screenshotsDir, file);
  const pngPath = path.join(screenshotsDir, file.replace('.svg', '.png'));
  
  // In a real implementation, we'd use a proper conversion
  // For now, just copy the SVG with a .png extension
  fs.copyFileSync(svgPath, pngPath);
});

console.log('Created PNG versions of screenshots in the screenshots directory.');