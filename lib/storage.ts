import { storage } from '@/lib/firebase'; // Assuming storage is exported from firebase.ts
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid'; // For generating unique filenames

/**
 * Uploads a voice message audio blob to Firebase Storage.
 * @param userId The UID of the user uploading the message.
 * @param audioBlob The audio data blob to upload.
 * @returns A Promise that resolves with the download URL of the uploaded file.
 * @throws Will throw an error if the upload fails.
 */
export async function uploadVoiceMessage(userId: string, audioBlob: Blob): Promise<string> {
  if (!storage) {
    throw new Error("Firebase Storage is not initialized.");
  }
  if (!userId) {
    throw new Error("User ID is required for uploading voice message.");
  }
  if (!audioBlob) {
    throw new Error("Audio blob is required for uploading voice message.");
  }

  const uniqueFilename = `${uuidv4()}.webm`; // Using uuid for uniqueness
  const filePath = `voice_messages/${userId}/${uniqueFilename}`;
  const fileRef = storageRef(storage, filePath);

  console.log(`Uploading voice message to: ${filePath}`);

  try {
    // Specify content type for better handling by browsers and Firebase Storage
    const metadata = { contentType: 'audio/webm' };
    const snapshot = await uploadBytes(fileRef, audioBlob, metadata);
    console.log('Uploaded a blob or file!', snapshot);

    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('File available at', downloadURL);

    return downloadURL;
  } catch (error) {
    console.error("Error uploading voice message:", error);
    // Re-throw the error to be caught by the caller, or handle more specifically
    throw new Error(`Failed to upload voice message: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Uploads an avatar image file to Firebase Storage.
 * @param userId The UID of the user uploading the avatar.
 * @param file The image file to upload.
 * @returns A Promise that resolves with the download URL of the uploaded file.
 * @throws Will throw an error if the upload fails.
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!storage) {
    throw new Error("Firebase Storage is not initialized.");
  }
  if (!userId) {
    throw new Error("User ID is required for uploading avatar.");
  }
  if (!file) {
    throw new Error("File is required for uploading avatar.");
  }

  // Generate a more unique filename using UUID to prevent overwrites and improve cache busting
  const fileExtension = file.name.split('.').pop() || 'png'; // Default to png if no extension
  const uniqueFilename = `${uuidv4()}.${fileExtension}`;
  const filePath = `avatars/${userId}/${uniqueFilename}`;
  const fileRef = storageRef(storage, filePath);

  console.log(`Uploading avatar to: ${filePath}`);

  try {
    // Content type is derived from the file itself by uploadBytes, but can be specified
    const metadata = { contentType: file.type || 'image/jpeg' }; // Fallback contentType
    const snapshot = await uploadBytes(fileRef, file, metadata);
    console.log('Uploaded avatar file!', snapshot);

    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('Avatar file available at', downloadURL);

    return downloadURL;
  } catch (error) {
    console.error("Error uploading avatar:", error);
    throw new Error(`Failed to upload avatar: ${error instanceof Error ? error.message : String(error)}`);
  }
}
