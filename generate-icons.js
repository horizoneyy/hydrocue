/* global __dirname, Buffer */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgCode = `
<svg width="1024" height="1024" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="waterGradDeep" x1="0%" x2="0%" y1="0%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="50%" stop-color="#0284C7" />
      <stop offset="100%" stop-color="#0369A1" />
    </linearGradient>
    <linearGradient id="waterSurfaceGlint" x1="0%" x2="100%" y1="0%" y2="0%">
      <stop offset="0%" stop-color="#BAE6FD" stop-opacity="0.95" />
      <stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#38BDF8" stop-opacity="0.5" />
    </linearGradient>
    <linearGradient id="glassSpecular" x1="0%" x2="100%" y1="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.85" />
      <stop offset="60%" stop-color="#BAE6FD" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#38BDF8" stop-opacity="0" />
    </linearGradient>
    <clipPath id="innerDropletMask">
      <path d="M100 22 C100 22 45 80 45 120 C45 152 70 178 100 178 C130 178 155 152 155 120 C155 80 100 22 100 22 Z" />
    </clipPath>
  </defs>

  <!-- Background Layer (White background as requested originally) -->
  <rect width="200" height="200" fill="#FFFFFF" />

  <!-- Drop Shadow -->
  <ellipse cx="100" cy="186" fill="#0284C7" opacity="0.16" rx="30" ry="5.5" />
  
  <!-- Droplet Base Shell -->
  <path d="M100 22 C100 22 45 80 45 120 C45 152 70 178 100 178 C130 178 155 152 155 120 C155 80 100 22 100 22 Z" fill="#F0F9FF" stroke="#BAE6FD" stroke-width="2.5" />
  
  <!-- Masked Internal Liquid (Half Filled) -->
  <g clip-path="url(#innerDropletMask)">
    <!-- Translated Y to be half filled (-10px) -->
    <g transform="translate(0, -10)">
      <!-- Back Wave -->
      <g opacity="0.45" transform="translate(120, 0)">
        <path d="M-120 102 Q -90 92 -60 102 T 0 102 T 60 102 T 120 102 T 180 102 T 240 102 T 300 102 T 360 102 L 360 300 L -120 300 Z" fill="#0284C7" />
      </g>
      
      <!-- Front Wave -->
      <g transform="translate(0, 0)">
        <path d="M-120 108 Q -90 120 -60 108 T 0 108 T 60 108 T 120 108 T 180 108 T 240 108 T 300 108 T 360 108 L 360 300 L -120 300 Z" fill="url(#waterGradDeep)" />
      </g>
      
      <!-- Static Bubbles -->
      <circle cx="86" cy="162" r="4" fill="#FFFFFF" opacity="0.8" />
      <circle cx="115" cy="158" r="3.2" fill="#E0F2FE" opacity="0.9" />
      <circle cx="100" cy="168" r="3.8" fill="#FFFFFF" opacity="0.85" />
      <circle cx="122" cy="145" r="2.2" fill="#FFFFFF" opacity="0.7" />
      <circle cx="92" cy="138" fill="#E0F2FE" opacity="0.7" r="2" />
      <circle cx="108" cy="128" fill="#FFFFFF" opacity="0.8" r="2.5" />
    </g>
  </g>
  
  <!-- Droplet Reflection Speculars -->
  <path d="M100 28 C90 42 66 78 63 108 C62 118 64 132 70 142 C67 132 66 120 70 106 C76 82 94 48 98 38 Z" fill="url(#glassSpecular)" />
  <!-- Apex Glint Highlight -->
  <ellipse cx="100" cy="38" fill="#FFFFFF" opacity="0.8" rx="2.5" ry="5.5" transform="rotate(-15 100 38)" />
  <circle cx="128" cy="80" fill="#FFFFFF" opacity="0.55" r="3" />
</svg>
`;

async function buildIcons() {
  const imagesDir = path.join(__dirname, 'assets', 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  // 1024x1024 Icon
  await sharp(Buffer.from(svgCode))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(imagesDir, 'icon.png'));

  // 1024x1024 Splash Icon (Transparent background for splash might be better, but we used white in SVG)
  // Let's modify SVG for splash to be transparent background
  const transparentSvgCode = svgCode.replace('<rect width="200" height="200" fill="#FFFFFF" />', '');
  
  await sharp(Buffer.from(transparentSvgCode))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(imagesDir, 'splash-icon.png'));

  // 1024x1024 Adaptive Icon Foreground (transparent)
  await sharp(Buffer.from(transparentSvgCode))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(imagesDir, 'android-icon-foreground.png'));

  // Adaptive Icon Background
  const bgSvg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><rect width="1024" height="1024" fill="#FFFFFF"/></svg>`;
  await sharp(Buffer.from(bgSvg))
    .png()
    .toFile(path.join(imagesDir, 'android-icon-background.png'));

  // Web Favicon
  await sharp(Buffer.from(transparentSvgCode))
    .resize(256, 256)
    .png()
    .toFile(path.join(imagesDir, 'favicon.png'));

  console.log('Icons generated successfully!');
}

buildIcons().catch(console.error);
