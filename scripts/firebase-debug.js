#!/usr/bin/env node

/**
 * Comprehensive Firebase Debugging Tool
 * Diagnoses Firebase authentication and provides Firestore security rules
 */

require('dotenv').config()

console.log('🔍 Firebase Debugging Tool\n')

// Check if we're getting the project correctly
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
console.log(`📋 Project ID: ${projectId}`)

if (projectId !== 'thespeakeasy') {
    console.log('⚠️  Warning: Project ID mismatch!')
    console.log('   Expected: thespeakeasy')
    console.log(`   Found: ${projectId}`)
}

console.log('\n🚨 FIRESTORE 400 ERRORS DIAGNOSIS:')
console.log('The 400 Bad Request errors you\'re seeing are typically caused by:')
console.log('1. ❌ Restrictive Firestore security rules')
console.log('2. ❌ User not authenticated when Firestore connects')
console.log('3. ❌ Database not properly initialized')

console.log('\n📝 RECOMMENDED FIRESTORE SECURITY RULES:')
console.log('Go to Firebase Console → Firestore Database → Rules and use these:')
console.log('\n' + '='.repeat(60))
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
console.log('='.repeat(60))

console.log('\n🔧 STEPS TO FIX:')
console.log('1. Go to https://console.firebase.google.com/')
console.log(`2. Select your "${projectId}" project`)
console.log('3. Go to Firestore Database → Rules tab')
console.log('4. Replace the rules with the ones above')
console.log('5. Click "Publish"')
console.log('6. Refresh your app')

console.log('\n🔍 TESTING AUTHENTICATION:')
console.log('Open your browser console and run:')
console.log('firebase.auth().currentUser')
console.log('This should show your logged-in user, not null')

console.log('\n📚 ALTERNATIVE - PERMISSIVE RULES (DEVELOPMENT ONLY):')
console.log('If you want to test quickly, use these TEMPORARY rules:')
console.log('\n' + '-'.repeat(40))
console.log(`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`)
console.log('-'.repeat(40))
console.log('⚠️  WARNING: Only use these permissive rules during development!')

console.log('\n✅ Expected Result:')
console.log('After updating security rules, the 400 errors should disappear')
console.log('and your real-time features should work properly.') 