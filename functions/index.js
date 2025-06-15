/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const tmp = require("tmp");
const fs = require("fs");
const path = require("path");

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();
const storage = getStorage();

// FFmpeg will be loaded dynamically when needed
let ffmpeg;
let ffmpegPath;

function initializeFFmpeg() {
    if (!ffmpeg) {
        try {
            ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
            ffmpeg = require("fluent-ffmpeg");
            ffmpeg.setFfmpegPath(ffmpegPath);
            logger.info("FFmpeg initialized successfully");
        } catch (error) {
            logger.error("Failed to initialize FFmpeg:", error);
            throw error;
        }
    }
    return ffmpeg;
}

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

/**
 * Cloud Function to transcode uploaded audio files to MP3
 * Triggers when a file is uploaded to Firebase Storage
 */
exports.transcodeAudio = onObjectFinalized({
    cpu: 2,
    memory: "1GiB",
    timeoutSeconds: 540,
    bucket: "thespeakeasy.firebasestorage.app",
}, async (event) => {
    const filePath = event.data.name;
    const contentType = event.data.contentType;
    const bucket = storage.bucket(event.data.bucket);

    logger.info(`Processing file: ${filePath}, contentType: ${contentType}`);

    // Only process audio files
    if (!contentType || !contentType.startsWith("audio/")) {
        logger.info(`Skipping non-audio file: ${filePath}`);
        return null;
    }

    // Skip if already processed (avoid infinite loops)
    if (filePath.includes("_mp3") || filePath.endsWith(".mp3")) {
        logger.info(`Skipping already processed file: ${filePath}`);
        return null;
    }

    // Only process voice messages and audio uploads
    if (!filePath.includes("voice_messages/") && !filePath.includes("audio/")) {
        logger.info(`Skipping non-voice message audio: ${filePath}`);
        return null;
    }

    try {
        // Initialize FFmpeg
        const ffmpegInstance = initializeFFmpeg();

        // Create temporary files
        const tempInputFile = tmp.fileSync({ suffix: path.extname(filePath) });
        const tempOutputFile = tmp.fileSync({ suffix: ".mp3" });

        logger.info(`Created temp files: ${tempInputFile.name}, ${tempOutputFile.name}`);

        // Download the original file
        await bucket.file(filePath).download({ destination: tempInputFile.name });
        logger.info(`Downloaded original file to: ${tempInputFile.name}`);

        // Transcode to MP3
        await new Promise((resolve, reject) => {
            ffmpegInstance(tempInputFile.name)
                .audioCodec("libmp3lame")
                .audioBitrate(128)
                .audioChannels(1) // Mono for voice messages
                .audioFrequency(44100)
                .format("mp3")
                .on("start", (commandLine) => {
                    logger.info(`FFmpeg command: ${commandLine}`);
                })
                .on("progress", (progress) => {
                    logger.info(`Processing: ${progress.percent}% done`);
                })
                .on("end", () => {
                    logger.info("Transcoding completed successfully");
                    resolve();
                })
                .on("error", (err) => {
                    logger.error("FFmpeg error:", err);
                    reject(err);
                })
                .save(tempOutputFile.name);
        });

        // Generate MP3 file path
        const mp3FilePath = filePath.replace(/\.[^/.]+$/, "_mp3.mp3");

        // Upload the MP3 file
        await bucket.upload(tempOutputFile.name, {
            destination: mp3FilePath,
            metadata: {
                contentType: "audio/mpeg",
                metadata: {
                    originalFile: filePath,
                    transcoded: "true",
                    transcodedAt: new Date().toISOString(),
                },
            },
        });

        logger.info(`Uploaded MP3 file to: ${mp3FilePath}`);

        // Get the download URL for the MP3 file
        const mp3File = bucket.file(mp3FilePath);
        const [mp3Url] = await mp3File.getSignedUrl({
            action: "read",
            expires: "03-09-2491", // Far future date
        });

        logger.info(`Generated MP3 URL: ${mp3Url}`);

        // Update Firestore documents that reference this audio file
        await updateFirestoreWithMp3Url(filePath, mp3Url);

        // Clean up temporary files
        tempInputFile.removeCallback();
        tempOutputFile.removeCallback();

        logger.info(`Successfully transcoded ${filePath} to ${mp3FilePath}`);
        return null;

    } catch (error) {
        logger.error("Error transcoding audio:", error);
        throw error;
    }
});

/**
 * Update Firestore documents with the MP3 URL
 */
async function updateFirestoreWithMp3Url(originalFilePath, mp3Url) {
    try {
        // Search for messages that contain the original file URL
        const collections = ["messages", "rooms", "directMessages"];

        for (const collectionName of collections) {
            // Query messages in the main collection
            const messagesQuery = await db.collection(collectionName)
                .where("voiceMessageUrl", "==", `gs://thespeakeasy.firebasestorage.app/${originalFilePath}`)
                .get();

            for (const doc of messagesQuery.docs) {
                await doc.ref.update({
                    mp3Url: mp3Url,
                    transcodedAt: new Date(),
                });
                logger.info(`Updated message ${doc.id} in ${collectionName} with MP3 URL`);
            }

            // Also check for audioUrl field
            const audioQuery = await db.collection(collectionName)
                .where("audioUrl", "==", `gs://thespeakeasy.firebasestorage.app/${originalFilePath}`)
                .get();

            for (const doc of audioQuery.docs) {
                await doc.ref.update({
                    mp3Url: mp3Url,
                    transcodedAt: new Date(),
                });
                logger.info(`Updated audio message ${doc.id} in ${collectionName} with MP3 URL`);
            }

            // Check subcollections (room messages, DM messages)
            if (collectionName === "rooms") {
                const roomsSnapshot = await db.collection("rooms").get();
                for (const roomDoc of roomsSnapshot.docs) {
                    const roomMessagesQuery = await roomDoc.ref.collection("messages")
                        .where("voiceMessageUrl", "==", `gs://thespeakeasy.firebasestorage.app/${originalFilePath}`)
                        .get();

                    for (const messageDoc of roomMessagesQuery.docs) {
                        await messageDoc.ref.update({
                            mp3Url: mp3Url,
                            transcodedAt: new Date(),
                        });
                        logger.info(`Updated room message ${messageDoc.id} with MP3 URL`);
                    }
                }
            }

            if (collectionName === "directMessages") {
                const dmsSnapshot = await db.collection("directMessages").get();
                for (const dmDoc of dmsSnapshot.docs) {
                    const dmMessagesQuery = await dmDoc.ref.collection("messages")
                        .where("voiceMessageUrl", "==", `gs://thespeakeasy.firebasestorage.app/${originalFilePath}`)
                        .get();

                    for (const messageDoc of dmMessagesQuery.docs) {
                        await messageDoc.ref.update({
                            mp3Url: mp3Url,
                            transcodedAt: new Date(),
                        });
                        logger.info(`Updated DM message ${messageDoc.id} with MP3 URL`);
                    }
                }
            }
        }

        logger.info(`Completed Firestore updates for ${originalFilePath}`);
    } catch (error) {
        logger.error("Error updating Firestore with MP3 URL:", error);
        throw error;
    }
}
