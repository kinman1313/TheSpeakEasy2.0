#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Firebase Rules Deployment Script');
console.log('=====================================');

// Check if Firebase CLI is installed
try {
    execSync('firebase --version', { stdio: 'pipe' });
    console.log('✅ Firebase CLI is installed');
} catch (error) {
    console.error('❌ Firebase CLI is not installed. Please install it with: npm install -g firebase-tools');
    process.exit(1);
}

// Check if user is logged in
try {
    execSync('firebase projects:list', { stdio: 'pipe' });
    console.log('✅ User is logged in to Firebase');
} catch (error) {
    console.error('❌ Not logged in to Firebase. Please run: firebase login');
    process.exit(1);
}

// Check if required files exist
const requiredFiles = [
    'firestore.rules',
    'database.rules.json',
    'firebase.json'
];

for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
        console.error(`❌ Required file ${file} not found`);
        process.exit(1);
    }
}

console.log('✅ All required files found');

// Deploy rules
const deployOptions = [
    { name: 'Firestore Rules', command: 'firebase deploy --only firestore:rules' },
    { name: 'Realtime Database Rules', command: 'firebase deploy --only database' },
    { name: 'All Rules', command: 'firebase deploy --only firestore:rules,database' }
];

const args = process.argv.slice(2);
let selectedOption = 2; // Default to all rules

if (args.includes('--firestore')) {
    selectedOption = 0;
} else if (args.includes('--database')) {
    selectedOption = 1;
} else if (args.includes('--all')) {
    selectedOption = 2;
}

const option = deployOptions[selectedOption];
console.log(`\n🔄 Deploying ${option.name}...`);

try {
    execSync(option.command, { stdio: 'inherit' });
    console.log(`\n✅ ${option.name} deployed successfully!`);
    
    // Show helpful information
    console.log('\n📋 Deployment Summary:');
    console.log('======================');
    
    if (selectedOption === 0 || selectedOption === 2) {
        console.log('• Firestore Rules: Updated security rules for Firestore collections');
    }
    
    if (selectedOption === 1 || selectedOption === 2) {
        console.log('• Realtime Database Rules: Updated security rules for RTDB (typing indicators, signaling, etc.)');
    }
    
    console.log('\n🔗 Useful Links:');
    console.log('• Firebase Console: https://console.firebase.google.com/');
    console.log('• Firestore Rules: https://console.firebase.google.com/project/thespeakeasy/firestore/rules');
    console.log('• Database Rules: https://console.firebase.google.com/project/thespeakeasy/database/rules');
    
} catch (error) {
    console.error(`\n❌ Failed to deploy ${option.name}`);
    console.error('Error:', error.message);
    process.exit(1);
}

console.log('\n🎉 Deployment completed successfully!'); 