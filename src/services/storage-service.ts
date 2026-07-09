'use client';

import { storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

/**
 * Uploads a base64 photo to Firebase Storage and returns the public download URL.
 * If the provided URL is already a remote URL, it returns it as is.
 */
async function uploadPhoto(folder: string, id: string, dataUrl: string): Promise<string> {
  if (!dataUrl) return '';
  
  // If it's already a hosted URL, just return it.
  if (dataUrl.startsWith('http') || dataUrl.startsWith('https')) {
    return dataUrl;
  }

  // If it's not a base64 data URI, we can't process it as an image upload.
  if (!dataUrl.startsWith('data:image')) {
    return dataUrl;
  }

  try {
    const storageRef = ref(storage, `${folder}/${id}/photo.jpg`);
    
    // Upload the base64 string
    await uploadString(storageRef, dataUrl, 'data_url');
    
    // Get the resulting download URL
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error) {
    console.error(`Error uploading photo to ${folder}:`, error);
    // Fallback to the original dataUrl (base64) if upload fails
    return dataUrl;
  }
}

export async function uploadContactPhoto(personId: string, dataUrl: string): Promise<string> {
  return uploadPhoto('contacts', personId, dataUrl);
}

export async function uploadGroupPhoto(groupId: string, dataUrl: string): Promise<string> {
  return uploadPhoto('groups', groupId, dataUrl);
}
