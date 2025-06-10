import { storage } from '@/lib/firebase'; // Assuming storage is exported from firebase.ts
import { ref as storageRef, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
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
 * Uploads a file to Firebase Storage with progress tracking
 */
export async function uploadFile(
  userId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<{
  downloadURL: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}> {
  if (!storage) {
    throw new Error("Firebase Storage is not initialized.");
  }
  if (!userId) {
    throw new Error("User ID is required for uploading file.");
  }
  if (!file) {
    throw new Error("File is required for uploading.");
  }

  // Validate file size (50MB limit)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    throw new Error("File size exceeds 50MB limit.");
  }

  // Determine file category for storage path
  const fileCategory = getFileCategory(file.type);
  const fileExtension = file.name.split('.').pop() || 'unknown';
  const uniqueFilename = `${uuidv4()}.${fileExtension}`;
  const filePath = `${fileCategory}/${userId}/${uniqueFilename}`;
  const fileRef = storageRef(storage, filePath);

  console.log(`Uploading file to: ${filePath}`);

  try {
    const metadata = {
      contentType: file.type || 'application/octet-stream',
      customMetadata: {
        originalName: file.name,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString()
      }
    };

    // Use resumable upload for progress tracking
    const uploadTask = uploadBytesResumable(fileRef, file, metadata);

    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          // Progress tracking
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload is ${progress}% done`);
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          console.error("Error uploading file:", error);
          reject(new Error(`Failed to upload file: ${error.message}`));
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('File available at', downloadURL);

            resolve({
              downloadURL,
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type
            });
          } catch (error) {
            reject(new Error(`Failed to get download URL: ${error instanceof Error ? error.message : String(error)}`));
          }
        }
      );
    });
  } catch (error) {
    console.error("Error setting up file upload:", error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Uploads an image file with optimization
 */
export async function uploadImage(
  userId: string,
  imageFile: File,
  onProgress?: (progress: number) => void
): Promise<{
  downloadURL: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}> {
  // Validate image file
  if (!imageFile.type.startsWith('image/')) {
    throw new Error("File must be an image.");
  }

  // Validate image size (10MB limit for images)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (imageFile.size > maxSize) {
    throw new Error("Image size exceeds 10MB limit.");
  }

  return uploadFile(userId, imageFile, onProgress);
}

/**
 * Get file category for storage organization
 */
function getFileCategory(fileType: string): string {
  if (fileType.startsWith('image/')) return 'images';
  if (fileType.startsWith('video/')) return 'videos';
  if (fileType.startsWith('audio/')) return 'audio';
  if (fileType.includes('pdf')) return 'documents';
  if (fileType.includes('text') || fileType.includes('document') || fileType.includes('spreadsheet')) {
    return 'documents';
  }
  return 'files';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file icon based on file type
 */
export function getFileIcon(fileType: string): string {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.startsWith('video/')) return '🎥';
  if (fileType.startsWith('audio/')) return '🎵';
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('text')) return '📝';
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📊';
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📽️';
  if (fileType.includes('zip') || fileType.includes('rar')) return '📦';
  return '📎';
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
