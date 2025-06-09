const fs = require('fs');
const path = require('path');

const soundFiles = [
    // Message sounds
    { name: 'message1.mp3', description: 'Classic message sound' },
    { name: 'message2.mp3', description: 'Soft chime message sound' },
    { name: 'message3.mp3', description: 'Bubble pop message sound' },
    { name: 'message4.mp3', description: 'Digital message sound' },

    // Call sounds
    { name: 'call1.mp3', description: 'Classic ring call sound' },
    { name: 'call2.mp3', description: 'Modern call sound' },
    { name: 'call3.mp3', description: 'Gentle call sound' },

    // DM sounds
    { name: 'dm1.mp3', description: 'Notification DM sound' },
    { name: 'dm2.mp3', description: 'Whisper DM sound' },
    { name: 'dm3.mp3', description: 'Alert DM sound' },
];

const soundsDir = path.join(__dirname, '..', 'public', 'sounds');

// Ensure sounds directory exists
if (!fs.existsSync(soundsDir)) {
    fs.mkdirSync(soundsDir, { recursive: true });
}

console.log('Creating placeholder sound files...\n');

soundFiles.forEach(({ name, description }) => {
    const filePath = path.join(soundsDir, name);
    const content = `# Placeholder for ${description}\n# Replace with actual sound file`;

    fs.writeFileSync(filePath, content);
    console.log(`✅ Created: ${name}`);
});

console.log('\n✨ All placeholder sound files created!');
console.log('Replace these with actual MP3 files for your app.'); 