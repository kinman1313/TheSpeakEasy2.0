#!/usr/bin/env node

/**
 * Generate Render Environment Configuration
 * This script helps set up the correct environment variables and build settings for Render deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Generating Render deployment configuration...\n');

// Required environment variables for Render
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID',
  'NEXT_PUBLIC_FCM_VAPID_KEY',
  'FIREBASE_ADMIN_PROJECT_ID',
  'FIREBASE_ADMIN_CLIENT_EMAIL',
  'FIREBASE_ADMIN_PRIVATE_KEY',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL'
];

// Build settings for Render
const renderBuildSettings = {
  buildCommand: 'npm install && npm run build',
  startCommand: 'npm start',
  nodeVersion: '18.x',
  environment: 'node'
};

console.log('📋 Required Environment Variables for Render:');
console.log('=' .repeat(50));
requiredEnvVars.forEach((envVar, index) => {
  console.log(`${index + 1}. ${envVar}`);
});

console.log('\n🔧 Recommended Render Build Settings:');
console.log('=' .repeat(50));
console.log(`Build Command: ${renderBuildSettings.buildCommand}`);
console.log(`Start Command: ${renderBuildSettings.startCommand}`);
console.log(`Node Version: ${renderBuildSettings.nodeVersion}`);
console.log(`Environment: ${renderBuildSettings.environment}`);

// Check if .env.local exists and validate
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  console.log('\n✅ Found .env.local file');
  
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  const missingVars = requiredEnvVars.filter(envVar => 
    !envContent.includes(envVar)
  );
  
  if (missingVars.length > 0) {
    console.log('\n⚠️  Missing environment variables:');
    missingVars.forEach(envVar => {
      console.log(`   - ${envVar}`);
    });
  } else {
    console.log('✅ All required environment variables found in .env.local');
  }
} else {
  console.log('\n❌ .env.local file not found');
  console.log('   Create this file with your environment variables');
}

// Generate render.yaml for easier deployment
const renderYaml = `services:
  - type: web
    name: thespeakeasy
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: NEXT_PUBLIC_FIREBASE_API_KEY
        sync: false
      - key: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
        sync: false
      - key: NEXT_PUBLIC_FIREBASE_PROJECT_ID
        sync: false
      - key: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
        sync: false
      - key: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
        sync: false
      - key: NEXT_PUBLIC_FIREBASE_APP_ID
        sync: false
      - key: NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
        sync: false
      - key: NEXT_PUBLIC_FCM_VAPID_KEY
        sync: false
      - key: FIREBASE_ADMIN_PROJECT_ID
        sync: false
      - key: FIREBASE_ADMIN_CLIENT_EMAIL
        sync: false
      - key: FIREBASE_ADMIN_PRIVATE_KEY
        sync: false
      - key: NEXTAUTH_SECRET
        generateValue: true
      - key: NEXTAUTH_URL
        value: https://thespeakeasy.onrender.com
`;

// Write render.yaml
fs.writeFileSync('render.yaml', renderYaml);
console.log('\n📄 Generated render.yaml configuration file');

// Package.json validation
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const criticalDeps = ['next', 'react', 'react-dom', 'firebase', 'lucide-react', 'tailwindcss', 'postcss'];
const missingDeps = criticalDeps.filter(dep => 
  !packageJson.dependencies[dep] && !packageJson.devDependencies[dep]
);

if (missingDeps.length > 0) {
  console.log('\n❌ Missing critical dependencies:');
  missingDeps.forEach(dep => {
    console.log(`   - ${dep}`);
  });
} else {
  console.log('\n✅ All critical dependencies found in package.json');
}

console.log('\n🎯 Next Steps for Render Deployment:');
console.log('=' .repeat(50));
console.log('1. Push your code to GitHub');
console.log('2. Connect your GitHub repo to Render');
console.log('3. Set the environment variables in Render dashboard');
console.log('4. Use the build settings shown above');
console.log('5. Deploy!');

console.log('\n✨ Render configuration complete!');