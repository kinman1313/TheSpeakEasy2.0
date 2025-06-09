#!/usr/bin/env node

/**
 * Complete Database Security Rules Setup
 * Provides rules for both Firestore and Realtime Database
 */

require('dotenv').config()

console.log('🗄️  Complete Database Security Rules Setup\n')

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
console.log(`📋 Project: ${projectId}`)

console.log('\n🔥 FIRESTORE RULES (Main Chat Data)')
console.log('Go to: Firebase Console → Firestore Database → Rules')
console.log('='.repeat(65))
console.log(`// Firestore Security Rules for ${projectId}
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Messages in lobby (public chat)  
    match /messages/{messageId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // Room messages - users can read/write if they're members
    match /rooms/{roomId}/messages/{messageId} {
      allow read, write: if request.auth != null &&
        request.auth.uid in get(/databases/$(database)/documents/rooms/$(roomId)).data.members;
    }
    
    // Rooms - users can read rooms they're members of
    match /rooms/{roomId} {
      allow read: if request.auth != null &&
        request.auth.uid in resource.data.members;
      allow write: if request.auth != null &&
        (request.auth.uid == resource.data.ownerId || 
         request.auth.uid in resource.data.members);
    }
    
    // Direct messages - only participants can access
    match /directMessages/{dmId} {
      allow read, write: if request.auth != null &&
        request.auth.uid in resource.data.participants;
    }
    
    // DM messages - only participants can access  
    match /directMessages/{dmId}/messages/{messageId} {
      allow read, write: if request.auth != null &&
        request.auth.uid in get(/databases/$(database)/documents/directMessages/$(dmId)).data.participants;
    }
    
    // Presence data
    match /presence/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`)
console.log('='.repeat(65))

console.log('\n⚡ REALTIME DATABASE RULES (WebRTC + Presence)')
console.log('Go to: Firebase Console → Realtime Database → Rules')
console.log('-'.repeat(65))
console.log(`{
  "rules": {
    "status": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid == $uid"
      }
    },
    "webrtc": {
      "offers": {
        "$callId": {
          ".read": "auth != null",
          ".write": "auth != null"
        }
      },
      "answers": {
        "$callId": {
          ".read": "auth != null", 
          ".write": "auth != null"
        }
      },
      "iceCandidates": {
        "$callId": {
          ".read": "auth != null",
          ".write": "auth != null"
        }
      },
      "declines": {
        "$callId": {
          ".read": "auth != null",
          ".write": "auth != null"
        }
      },
      "hangUps": {
        "$callId": {
          ".read": "auth != null",
          ".write": "auth != null"
        }
      }
    }
  }
}`)
console.log('-'.repeat(65))

console.log('\n🎯 SETUP STEPS:')
console.log('\n1️⃣  FIRESTORE RULES:')
console.log('   • Go to https://console.firebase.google.com/')
console.log(`   • Select "${projectId}" project`)
console.log('   • Navigate: Firestore Database → Rules tab')
console.log('   • Copy the Firestore rules above')
console.log('   • Click "Publish"')

console.log('\n2️⃣  REALTIME DATABASE RULES:')
console.log('   • In same Firebase project')
console.log('   • Navigate: Realtime Database → Rules tab')
console.log('   • Copy the Realtime Database rules above')
console.log('   • Click "Publish"')

console.log('\n🔧 WHAT EACH DATABASE HANDLES:')
console.log('\n📄 Firestore (Document Database):')
console.log('   • Chat messages')
console.log('   • Rooms and direct messages')
console.log('   • User profiles')
console.log('   • Message history')

console.log('\n⚡ Realtime Database (JSON Tree):')
console.log('   • WebRTC call signaling')
console.log('   • User online/offline status')
console.log('   • Real-time presence')
console.log('   • Call coordination')

console.log('\n🎉 AFTER SETUP:')
console.log('   ✅ 400 Bad Request errors → GONE')
console.log('   ✅ Room creation → WORKING')
console.log('   ✅ Real-time messages → WORKING')
console.log('   ✅ Video/voice calls → WORKING')
console.log('   ✅ User presence → WORKING')

console.log('\n⚠️  QUICK TEST MODE (Development Only):')
console.log('If you want to test immediately, use these permissive rules:')
console.log('\nFirestore: allow read, write: if request.auth != null;')
console.log('Realtime DB: ".read": "auth != null", ".write": "auth != null"')
console.log('(Remember to replace with secure rules later!)') 