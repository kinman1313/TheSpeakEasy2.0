#!/usr/bin/env node

/**
 * Firebase Configuration Diagnostic Tool
 * Run this script to check if your Firebase environment variables are properly configured
 */

// Load environment variables from .env file
require('dotenv').config()

console.log('🔍 Firebase Configuration Diagnostic\n')

// Check client-side environment variables
const clientEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
]

// Check server-side environment variables
const serverEnvVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY'
]

console.log('📱 Client-side Configuration (NEXT_PUBLIC_*):')
let clientConfigured = true
clientEnvVars.forEach(envVar => {
    const value = process.env[envVar]
    const status = value ? '✅' : '❌'
    const displayValue = value ? (value.length > 20 ? value.substring(0, 20) + '...' : value) : 'NOT SET'
    console.log(`${status} ${envVar}: ${displayValue}`)
    if (!value) clientConfigured = false
})

console.log('\n🔒 Server-side Configuration (Admin SDK):')
let serverConfigured = true
serverEnvVars.forEach(envVar => {
    const value = process.env[envVar]
    const status = value ? '✅' : '❌'
    const displayValue = value ? (envVar === 'FIREBASE_PRIVATE_KEY' ? '[PRIVATE KEY SET]' :
        value.length > 30 ? value.substring(0, 30) + '...' : value) : 'NOT SET'
    console.log(`${status} ${envVar}: ${displayValue}`)
    if (!value) serverConfigured = false
})

console.log('\n📋 Summary:')
console.log(`Client Configuration: ${clientConfigured ? '✅ Complete' : '❌ Missing variables'}`)
console.log(`Server Configuration: ${serverConfigured ? '✅ Complete' : '❌ Missing variables'}`)

if (!clientConfigured || !serverConfigured) {
    console.log('\n🚨 Issues Found:')
    console.log('1. Create a .env.local file in your project root')
    console.log('2. Add the missing environment variables')
    console.log('3. Restart your development server')
    console.log('4. Run this script again to verify')
} else {
    console.log('\n🎉 All Firebase environment variables are configured!')
}

console.log('\n💡 Need help getting these values?')
console.log('• Go to https://console.firebase.google.com/')
console.log('• Select your project → Settings → General tab')
console.log('• For admin SDK: Settings → Service Accounts → Generate new private key') 