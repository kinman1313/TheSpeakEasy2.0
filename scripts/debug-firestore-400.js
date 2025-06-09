// Debug script for Firestore 400 errors
console.log('🔍 Firestore 400 Error Debugging Guide\n');

console.log('1. CHECK FIRESTORE RULES:');
console.log('   - Open Firebase Console > Firestore Database > Rules');
console.log('   - Verify the rules match the firestore.rules file we created');
console.log('   - If not, copy and paste the rules from firestore.rules\n');

console.log('2. CHECK COMPOSITE INDEXES:');
console.log('   - Open Firebase Console > Firestore Database > Indexes');
console.log('   - Look for any "NEEDS INDEX" errors in browser console');
console.log('   - Click the link in the error to create the index automatically\n');

console.log('3. VERIFY AUTHENTICATION:');
console.log('   - Open browser DevTools > Application > Local Storage');
console.log('   - Clear all Firebase-related entries');
console.log('   - Sign out and sign back in\n');

console.log('4. CHECK FIRESTORE QUERIES:');
console.log('   ✅ Removed orderBy from RoomManager.tsx');
console.log('   ✅ Removed orderBy from ChatApp.tsx');
console.log('   ✅ Removed orderBy from ChatRoom.tsx');
console.log('   ✅ Removed orderBy from chat-interface.tsx\n');

console.log('5. COMMON 400 ERROR CAUSES:');
console.log('   - Missing security rules (now fixed with firestore.rules)');
console.log('   - Invalid query combinations (array-contains + orderBy without index)');
console.log('   - Expired authentication tokens');
console.log('   - Malformed query parameters\n');

console.log('6. DEPLOY FIRESTORE RULES:');
console.log('   Run: npm run deploy:firestore-rules');
console.log('   Or: firebase deploy --only firestore:rules\n');

console.log('7. TEST QUERIES MANUALLY:');
console.log('   Open Firebase Console > Firestore Database');
console.log('   Try to manually query the collections');
console.log('   Check if you can read/write data\n');

console.log('If errors persist after all these steps:');
console.log('- Check Network tab for detailed 400 error response');
console.log('- Look for "Missing or insufficient permissions" errors');
console.log('- Verify App Check is not enforced (should show warnings only)'); 