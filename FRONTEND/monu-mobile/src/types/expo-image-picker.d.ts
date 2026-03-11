declare module 'expo-image-picker' {
  export type MediaTypeOptions = 'images' | 'videos' | 'all';
  export const MediaTypeOptions: {
    Images: MediaTypeOptions;
    Videos: MediaTypeOptions;
    All: MediaTypeOptions;
  };

  export interface ImagePickerAsset {
    uri: string;
    fileName?: string;
    mimeType?: string;
    width: number;
    height: number;
  }

  export interface ImagePickerResult {
    canceled: boolean;
    assets: ImagePickerAsset[];
  }

  export function requestMediaLibraryPermissionsAsync(): Promise<{ granted: boolean }>;
  export function launchImageLibraryAsync(options?: {
    mediaTypes?: MediaTypeOptions;
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
  }): Promise<ImagePickerResult>;
}
