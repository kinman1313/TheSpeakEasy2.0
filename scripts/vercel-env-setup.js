console.log('🚀 Vercel Environment Variables Setup\n');

console.log('You need to add these environment variables to Vercel:\n');

console.log('1. Go to your Vercel dashboard: https://vercel.com/dashboard');
console.log('2. Select your project (TheSpeakEasy2.0)');
console.log('3. Go to Settings → Environment Variables');
console.log('4. Add each of these variables:\n');

const envVars = [
    { name: 'FIREBASE_PROJECT_ID', value: 'thespeakeasy', description: 'Firebase project ID' },
    { name: 'FIREBASE_CLIENT_EMAIL', value: 'firebase-adminsdk-xxxxx@thespeakeasy.iam.gserviceaccount.com', description: 'From service account JSON' },
    { name: 'FIREBASE_PRIVATE_KEY', value: '-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n', description: 'From service account JSON (with \\n)' },
    { name: 'NEXT_PUBLIC_FIREBASE_API_KEY', value: 'AIzaSy...', description: 'Your Firebase API key' },
    { name: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', value: 'thespeakeasy.firebaseapp.com', description: 'Firebase auth domain' },
    { name: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', value: 'thespeakeasy', description: 'Firebase project ID' },
    { name: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', value: 'thespeakeasy.appspot.com', description: 'Firebase storage bucket' },
    { name: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', value: '123456789012', description: 'Firebase messaging sender ID' },
    { name: 'NEXT_PUBLIC_FIREBASE_APP_ID', value: '1:123456789012:web:...', description: 'Firebase app ID' }
];

console.log('Environment Variables to Add:');
console.log('─'.repeat(80));
envVars.forEach(({ name, value, description }) => {
    console.log(`\n${name}`);
    console.log(`Description: ${description}`);
    console.log(`Example: ${value}`);
});

console.log('\n' + '─'.repeat(80));
console.log('\n⚠️  IMPORTANT for FIREBASE_PRIVATE_KEY:');
console.log('1. Copy the entire private key INCLUDING "-----BEGIN" and "-----END" lines');
console.log('2. In Vercel, paste it WITH the \\n characters');
console.log('3. Do NOT add quotes in Vercel (Vercel handles that automatically)');
console.log('4. Make sure there are no extra spaces or line breaks\n');

console.log('🔧 Steps in Vercel:');
console.log('1. Click "Add Variable"');
console.log('2. Enter the Key (variable name)');
console.log('3. Paste the Value');
console.log('4. Select environments: ✓ Production ✓ Preview ✓ Development');
console.log('5. Click "Save"\n');

console.log('After adding all variables:');
console.log('1. Trigger a new deployment (push a commit or click "Redeploy")');
console.log('2. Check the Function logs in Vercel for any errors');
console.log('3. Your app should now work in production! 🎉'); 