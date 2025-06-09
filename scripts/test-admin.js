#!/usr/bin/env node

require('dotenv').config()

console.log('🔥 FIREBASE ADMIN DIAGNOSTIC\n')

// Check environment variables
console.log('📋 Environment Variables:')
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID)
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL)
console.log('FIREBASE_PRIVATE_KEY exists:', !!process.env.FIREBASE_PRIVATE_KEY)
console.log('')

// Test Firebase Admin initialization
try {
    const { adminDb, adminAuth } = require('../lib/firebase-admin.ts')

    console.log('✅ Firebase Admin SDK imported successfully')

    // Test simple admin operation
    console.log('🧪 Testing Admin Auth...')

    // Test Firestore connection
    console.log('🧪 Testing Firestore connection...')

    // Try to list collections (this will fail if Firestore doesn't exist)
    adminDb.collection('test').get()
        .then(() => {
            console.log('✅ Firestore connection successful!')
        })
        .catch((error) => {
            console.error('❌ Firestore connection failed:')
            console.error('Error code:', error.code)
            console.error('Error message:', error.message)

            if (error.code === 5 || error.code === 'NOT_FOUND') {
                console.log('\n🚨 FIRESTORE DATABASE NOT FOUND!')
                console.log('📋 SOLUTION:')
                console.log('1. Go to: https://console.firebase.google.com/')
                console.log('2. Select project: thespeakeasy')
                console.log('3. Click "Firestore Database"')
                console.log('4. Click "Create database"')
                console.log('5. Choose "Start in test mode" or use your rules')
                console.log('6. Select a location (us-central1 recommended)')
                console.log('7. Click "Done"')
            }
        })

} catch (error) {
    console.error('❌ Firebase Admin initialization failed:')
    console.error(error.message)
} 