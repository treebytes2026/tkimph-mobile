import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { UploadFile } from '@/lib/api';

const imageMediaTypes: ImagePicker.MediaType[] = ['images'];

function fileNameFromUri(uri: string, fallback: string) {
  const clean = uri.split('?')[0] ?? uri;
  return clean.split('/').pop() || fallback;
}

export async function pickImageUpload(): Promise<UploadFile | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission is required to upload images.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    mediaTypes: imageMediaTypes,
    quality: 0.86,
  });

  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.fileName || fileNameFromUri(asset.uri, 'upload.jpg'),
    type: asset.mimeType || 'image/jpeg',
    file: asset.file,
  };
}

export async function pickProofUpload(): Promise<UploadFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  });

  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.name || fileNameFromUri(asset.uri, 'payment-proof.pdf'),
    type: asset.mimeType || 'application/octet-stream',
    file: asset.file,
  };
}
