#!/usr/bin/env node

// This script copies the logo to create placeholder icons
// In production, you should generate proper icons with correct sizes

const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, '../public/assets/wedai_logo_notext_nobg.png');
const iconsDir = path.join(__dirname, '../public/icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// List of required icon sizes based on manifest.json and index.html
const iconSizes = [
  '32x32',
  '70x70',
  '144x144',
  '150x150',
  '152x152',
  '180x180',
  '192x192',
  '310x310',
  '512x512'
];

// Copy logo as placeholder for each size
iconSizes.forEach(size => {
  const [width, height] = size.split('x');
  const destPath = path.join(iconsDir, `icon-${size}.png`);
  
  try {
    fs.copyFileSync(logoPath, destPath);
    console.log(`Created placeholder icon: icon-${size}.png`);
  } catch (err) {
    console.error(`Error creating icon-${size}.png:`, err.message);
  }
});

// Copy logo as social preview
const socialPreviewPath = path.join(iconsDir, 'social-preview.png');
fs.copyFileSync(logoPath, socialPreviewPath);
console.log('Created social preview image');

console.log('\n✅ Placeholder icons created successfully!');
console.log('Note: For production, generate properly sized icons using a tool like:');
console.log('- https://realfavicongenerator.net/');
console.log('- https://www.pwabuilder.com/imageGenerator');