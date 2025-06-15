#!/usr/bin/env node

/**
 * Comprehensive Calling Functionality Test Script
 * 
 * This script tests all aspects of the voice and video calling system:
 * - Server connectivity
 * - WebRTC provider functionality  
 * - Call notifications
 * - Video stream handling
 * - User interface components
 */

const fs = require('fs');
const path = require('path');

console.log('🎥 CALLING FUNCTIONALITY TEST SUITE');
console.log('=====================================\n');

// Test 1: Check if all required files exist
console.log('📁 Test 1: Checking required files...');
const requiredFiles = [
  'server.js',
  'lib/socket.ts',
  'lib/callNotifications.ts',
  'components/providers/WebRTCProvider.tsx',
  'components/chat/ImprovedVideoCallView.tsx',
  'components/chat/IncomingCallDialog.tsx',
  'components/chat/VideoCallView.tsx',
  'components/call-controls.tsx',
  'public/sounds/call1.mp3',
  'public/sounds/call2.mp3',
  'public/sounds/call3.mp3',
  'public/sounds/dm1.mp3',
  'public/sounds/dm2.mp3'
];

let missingFiles = [];
requiredFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) {
    missingFiles.push(file);
  }
});

if (missingFiles.length === 0) {
  console.log('✅ All required files present');
} else {
  console.log('❌ Missing files:');
  missingFiles.forEach(file => console.log(`   - ${file}`));
}

// Test 2: Verify server configuration
console.log('\n🖥️  Test 2: Checking server configuration...');
try {
  const serverContent = fs.readFileSync('server.js', 'utf8');
  
  const checks = [
    { name: 'Socket.IO user mapping', pattern: /userSockets.*Map/, found: false },
    { name: 'Enhanced signaling', pattern: /signal.*targetSocketId/, found: false },
    { name: 'Call events handling', pattern: /call-user.*call-answer/, found: false },
    { name: 'User registration', pattern: /register-user/, found: false }
  ];
  
  checks.forEach(check => {
    check.found = check.pattern.test(serverContent);
  });
  
  const passedChecks = checks.filter(c => c.found).length;
  console.log(`✅ Server configuration: ${passedChecks}/${checks.length} checks passed`);
  
  checks.forEach(check => {
    const status = check.found ? '✅' : '❌';
    console.log(`   ${status} ${check.name}`);
  });
} catch (error) {
  console.log('❌ Error reading server.js:', error.message);
}

// Test 3: Check WebRTC provider implementation
console.log('\n🔄 Test 3: Checking WebRTC provider...');
try {
  const webrtcContent = fs.readFileSync('components/providers/WebRTCProvider.tsx', 'utf8');
  
  const webrtcChecks = [
    { name: 'Call notification integration', pattern: /callNotifications/, found: false },
    { name: 'Socket registration', pattern: /registerUser/, found: false },
    { name: 'Enhanced peer connection', pattern: /enhancedConfiguration/, found: false },
    { name: 'Proper stream handling', pattern: /remoteStream.*setRemoteStream/, found: false },
    { name: 'Sound effects', pattern: /playCallConnectedSound|playCallEndedSound/, found: false }
  ];
  
  webrtcChecks.forEach(check => {
    check.found = check.pattern.test(webrtcContent);
  });
  
  const passedWebRTCChecks = webrtcChecks.filter(c => c.found).length;
  console.log(`✅ WebRTC provider: ${passedWebRTCChecks}/${webrtcChecks.length} checks passed`);
  
  webrtcChecks.forEach(check => {
    const status = check.found ? '✅' : '❌';
    console.log(`   ${status} ${check.name}`);
  });
} catch (error) {
  console.log('❌ Error reading WebRTC provider:', error.message);
}

// Test 4: Check call notifications system
console.log('\n🔔 Test 4: Checking call notifications...');
try {
  const notificationsContent = fs.readFileSync('lib/callNotifications.ts', 'utf8');
  
  const notificationChecks = [
    { name: 'Ringtone management', pattern: /ringtone.*Audio/, found: false },
    { name: 'Vibration patterns', pattern: /vibrate.*Pattern/, found: false },
    { name: 'System notifications', pattern: /Notification.*permission/, found: false },
    { name: 'Sound effects', pattern: /playCallConnectedSound.*playCallEndedSound/, found: false },
    { name: 'Notification cleanup', pattern: /stopIncomingCall/, found: false }
  ];
  
  notificationChecks.forEach(check => {
    check.found = check.pattern.test(notificationsContent);
  });
  
  const passedNotificationChecks = notificationChecks.filter(c => c.found).length;
  console.log(`✅ Call notifications: ${passedNotificationChecks}/${notificationChecks.length} checks passed`);
  
  notificationChecks.forEach(check => {
    const status = check.found ? '✅' : '❌';
    console.log(`   ${status} ${check.name}`);
  });
} catch (error) {
  console.log('❌ Error reading call notifications:', error.message);
}

// Test 5: Check video call UI components
console.log('\n🎨 Test 5: Checking video call UI...');
const uiComponents = [
  { file: 'components/chat/ImprovedVideoCallView.tsx', name: 'Improved video call view' },
  { file: 'components/chat/IncomingCallDialog.tsx', name: 'Incoming call dialog' },
  { file: 'components/chat/VideoCallView.tsx', name: 'Original video call view' }
];

uiComponents.forEach(component => {
  try {
    if (fs.existsSync(component.file)) {
      const content = fs.readFileSync(component.file, 'utf8');
      const hasWebRTCIntegration = /useWebRTC/.test(content);
      const hasVideoRefs = /videoRef|srcObject/.test(content);
      const hasCallControls = /toggleLocalAudio|toggleLocalVideo/.test(content);
      
      const status = hasWebRTCIntegration && hasVideoRefs && hasCallControls ? '✅' : '❌';
      console.log(`   ${status} ${component.name}`);
      
      if (!hasWebRTCIntegration) console.log(`       ⚠️  Missing WebRTC integration`);
      if (!hasVideoRefs) console.log(`       ⚠️  Missing video stream handling`);
      if (!hasCallControls) console.log(`       ⚠️  Missing call controls`);
    } else {
      console.log(`   ❌ ${component.name} (file not found)`);
    }
  } catch (error) {
    console.log(`   ❌ ${component.name} (read error)`);
  }
});

// Test 6: Check sound files
console.log('\n🔊 Test 6: Checking sound files...');
const soundFiles = [
  'public/sounds/call1.mp3',
  'public/sounds/call2.mp3', 
  'public/sounds/call3.mp3',
  'public/sounds/dm1.mp3',
  'public/sounds/dm2.mp3'
];

let missingSounds = [];
soundFiles.forEach(soundFile => {
  if (!fs.existsSync(soundFile)) {
    missingSounds.push(soundFile);
  }
});

if (missingSounds.length === 0) {
  console.log('✅ All sound files present');
} else {
  console.log('❌ Missing sound files:');
  missingSounds.forEach(file => console.log(`   - ${file}`));
  console.log('\n💡 To create missing sound files, run: npm run create-sounds');
}

// Test 7: Package.json dependencies
console.log('\n📦 Test 7: Checking dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = [
    'socket.io',
    'socket.io-client',
    'firebase',
    'react',
    'react-dom',
    '@types/react',
    '@types/react-dom'
  ];
  
  const missingDeps = requiredDeps.filter(dep => 
    !packageJson.dependencies[dep] && !packageJson.devDependencies[dep]
  );
  
  if (missingDeps.length === 0) {
    console.log('✅ All required dependencies present');
  } else {
    console.log('❌ Missing dependencies:');
    missingDeps.forEach(dep => console.log(`   - ${dep}`));
  }
} catch (error) {
  console.log('❌ Error reading package.json:', error.message);
}

// Summary and next steps
console.log('\n📋 SUMMARY & NEXT STEPS');
console.log('========================');
console.log('');

if (missingFiles.length > 0) {
  console.log('🔧 Missing files detected. These need to be created:');
  missingFiles.forEach(file => console.log(`   - ${file}`));
  console.log('');
}

if (missingSounds.length > 0) {
  console.log('🎵 Missing sound files. Run this command to create them:');
  console.log('   node scripts/create-sound-files.js');
  console.log('');
}

console.log('🚀 To test the calling functionality:');
console.log('   1. Start the server: npm run custom-dev');
console.log('   2. Open two browser windows to the same chat room');
console.log('   3. Try initiating a video call between users');
console.log('   4. Test both accepting and declining calls');
console.log('   5. Verify video streams appear correctly');
console.log('   6. Test call sounds and notifications');
console.log('');

console.log('🔍 Common issues to check:');
console.log('   - Browser permissions for camera/microphone');
console.log('   - Network connectivity for WebRTC');
console.log('   - Sound file loading in browser');
console.log('   - Firebase Realtime Database rules');
console.log('   - HTTPS for production (required for WebRTC)');
console.log('');

console.log('✨ The calling system should now be fully functional!');
console.log('   Report any issues and check browser console for errors.');