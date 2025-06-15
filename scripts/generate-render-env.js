#!/usr/bin/env node

/**
 * Helper script to convert .env file to Render-compatible format
 * Usage: node scripts/generate-render-env.js
 */

const fs = require('fs');
const path = require('path');

function generateRenderEnvFormat() {
  // Check for .env files in order of preference
  const envPaths = [
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), '.env')
  ];
  
  let envPath = null;
  for (const envFilePath of envPaths) {
    if (fs.existsSync(envFilePath)) {
      envPath = envFilePath;
      break;
    }
  }
  
  if (!envPath) {
    console.log('❌ No .env or .env.local file found');
    console.log('💡 Create a .env file with your environment variables first');
    console.log('📋 Use .env.example as a template');
    return;
  }

  console.log(`📁 Reading environment variables from: ${path.basename(envPath)}`);
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  console.log('🎯 RENDER ENVIRONMENT VARIABLES');
  console.log('================================');
  console.log('Copy and paste these into Render Dashboard > Environment Variables:');
  console.log('');
  
  const envVars = [];
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=');
      
      if (key && value) {
        envVars.push({ key: key.trim(), value: value.trim() });
        console.log(`${key.trim()}=${value.trim()}`);
      }
    }
  });
  
  console.log('');
  console.log('================================');
  console.log(`✅ Found ${envVars.length} environment variables`);
  console.log('');
  console.log('🚀 RENDER DEPLOYMENT STEPS:');
  console.log('1. Go to render.com');
  console.log('2. Create new Web Service');
  console.log('3. Connect your GitHub repo');
  console.log('4. Set Build Command: npm install && npm run build');
  console.log('5. Set Start Command: npm run custom-start');
  console.log('6. Copy the environment variables above');
  console.log('7. Deploy!');
  console.log('');
  
  // Save to file for easy copying
  const renderEnvPath = path.join(process.cwd(), 'render-env-vars.txt');
  const renderEnvContent = envVars.map(env => `${env.key}=${env.value}`).join('\n');
  fs.writeFileSync(renderEnvPath, renderEnvContent);
  
  console.log(`💾 Environment variables saved to: ${renderEnvPath}`);
  console.log('📋 You can also copy from this file');
}

// Run the script
generateRenderEnvFormat();