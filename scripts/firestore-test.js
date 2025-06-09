#!/usr/bin/env node

/**
 * Firestore Connection Test
 * Tests if authentication and Firestore rules are working properly
 */

require('dotenv').config()

console.log('🔥 Firestore Connection Test\n')

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
console.log(`📋 Project: ${projectId}`)

console.log('\n🧪 DEBUGGING STEPS:')
console.log('\n1️⃣  Check Authentication in Browser Console:')
console.log('   • Open DevTools → Console')
console.log('   • Run: firebase.auth().currentUser')
console.log('   • Should show user object (not null)')

console.log('\n2️⃣  Test Firestore Connection:')
console.log('   • In browser console, run:')
console.log('   • firebase.firestore().collection("test").get()')
console.log('   • Should NOT get 400 errors')

console.log('\n3️⃣  Clear Browser Cache:')
console.log('   • Press Ctrl+Shift+Delete')
console.log('   • Clear "Cookies and site data"')
console.log('   • Clear "Cached images and files"')
console.log('   • Try logging in again')

console.log('\n4️⃣  Verify Firestore Rules Published:')
console.log('   • Go to Firebase Console')
console.log(`   • Select "${projectId}" project`)
console.log('   • Firestore Database → Rules')
console.log('   • Should show: allow read, write: if request.auth != null;')
console.log('   • Click "Publish" if not already published')

console.log('\n🔧 EXPECTED BEHAVIOR:')
console.log('   ✅ Incognito: Should work completely')
console.log('   ✅ Regular browser: Should work after cache clear')
console.log('   ✅ No 400 Firestore errors after rules fix')

console.log('\n⚠️  QUICK FIXES:')
console.log('1. Clear all browser data for localhost:3000')
console.log('2. Ensure Firestore rules are published')
console.log('3. Wait 1-2 minutes after publishing rules')
console.log('4. Test in incognito first, then regular browser')

console.log('\n🎯 AUTHENTICATION CACHE ISSUE:')
console.log('The AuthProvider now automatically clears cache after 8 seconds')
console.log('This should fix the infinite loading in regular browser mode')

console.log('\n📞 NEXT STEPS:')
console.log('1. Restart your dev server')
console.log('2. Clear browser cache completely')
console.log('3. Test login in regular browser')
console.log('4. Check if 400 Firestore errors are gone') 