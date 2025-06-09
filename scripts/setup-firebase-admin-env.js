console.log('🔧 Firebase Admin SDK Environment Setup\n');

console.log('You need to set up Firebase Admin SDK credentials for server-side operations.\n');

console.log('Follow these steps:\n');

console.log('1. Go to Firebase Console: https://console.firebase.google.com/project/thespeakeasy/settings/serviceaccounts/adminsdk');
console.log('   (Note: Using lowercase "thespeakeasy" as the project ID)\n');

console.log('2. Click "Generate new private key"');
console.log('3. Save the downloaded JSON file\n');

console.log('4. Create a .env file in your project root with these variables:\n');

console.log('FIREBASE_PROJECT_ID=thespeakeasy');
console.log('FIREBASE_CLIENT_EMAIL=<from-service-account-json>');
console.log('FIREBASE_PRIVATE_KEY="<from-service-account-json>"');
console.log('');
console.log('# Also add the public config for client-side:');
console.log('NEXT_PUBLIC_FIREBASE_API_KEY=<your-api-key>');
console.log('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=thespeakeasy.firebaseapp.com');
console.log('NEXT_PUBLIC_FIREBASE_PROJECT_ID=thespeakeasy');
console.log('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=thespeakeasy.appspot.com');
console.log('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<your-sender-id>');
console.log('NEXT_PUBLIC_FIREBASE_APP_ID=<your-app-id>\n');

console.log('Example .env file structure:');
console.log('```');
console.log('# Firebase Admin SDK (for server-side)');
console.log('FIREBASE_PROJECT_ID=thespeakeasy');
console.log('FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@thespeakeasy.iam.gserviceaccount.com');
console.log('FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYOUR_PRIVATE_KEY_HERE\\n-----END PRIVATE KEY-----\\n"');
console.log('');
console.log('# Firebase Client SDK (for client-side)');
console.log('NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
console.log('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=thespeakeasy.firebaseapp.com');
console.log('NEXT_PUBLIC_FIREBASE_PROJECT_ID=thespeakeasy');
console.log('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=thespeakeasy.appspot.com');
console.log('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012');
console.log('NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456789');
console.log('```\n');

console.log('⚠️  IMPORTANT:');
console.log('- Make sure to use double quotes around the FIREBASE_PRIVATE_KEY value');
console.log('- Keep the \\n characters in the private key as they are');
console.log('- Never commit the .env file to git');
console.log('- Add .env to your .gitignore file\n');

console.log('After creating the .env file, restart your development server.'); 