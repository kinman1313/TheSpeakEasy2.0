const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Deploying Firestore Security Rules...\n');

// Deploy only Firestore rules
exec('firebase deploy --only firestore:rules', (error, stdout, stderr) => {
    if (error) {
        console.error('❌ Error deploying Firestore rules:', error);
        console.error('Error details:', stderr);
        process.exit(1);
    }

    console.log('✅ Firestore rules deployed successfully!\n');
    console.log(stdout);

    console.log('\n📋 Next steps:');
    console.log('1. Clear your browser cache and cookies');
    console.log('2. Sign out and sign back in');
    console.log('3. The 400 errors should now be resolved');
    console.log('\nIf you still see errors, check the Firebase Console for any composite index requirements.');
}); 