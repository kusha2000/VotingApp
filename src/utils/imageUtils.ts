import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert } from 'react-native';

export interface ImagePickerResult {
    success: boolean;
    base64?: string;
    error?: string;
}

export const requestImagePermissions = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert(
            'Permission Required',
            'Sorry, we need camera roll permissions to select images.'
        );
        return false;
    }
    return true;
};

export const pickImage = async (): Promise<ImagePickerResult> => {
    try {
        const hasPermission = await requestImagePermissions();
        if (!hasPermission) {
            return { success: false, error: 'Permission denied' };
        }

        // Launch image picker
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9], 
            quality: 0.8,
            base64: false, 
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
            return { success: false, error: 'Image selection cancelled' };
        }

        const selectedImage = result.assets[0];

        const manipulatedImage = await ImageManipulator.manipulateAsync(
            selectedImage.uri,
            [
                { resize: { width: 800 } }, 
            ],
            {
                compress: 0.7,
                format: ImageManipulator.SaveFormat.JPEG,
                base64: true,
            }
        );

        if (!manipulatedImage.base64) {
            return { success: false, error: 'Failed to process image' };
        }

        const base64Size = manipulatedImage.base64.length * 0.75;
        const maxSize = 500 * 1024;

        if (base64Size > maxSize) {
            const furtherCompressed = await ImageManipulator.manipulateAsync(
                selectedImage.uri,
                [
                    { resize: { width: 600 } }, 
                ],
                {
                    compress: 0.5,
                    format: ImageManipulator.SaveFormat.JPEG,
                    base64: true,
                }
            );

            if (!furtherCompressed.base64) {
                return { success: false, error: 'Failed to compress image' };
            }

            return { success: true, base64: furtherCompressed.base64 };
        }

        return { success: true, base64: manipulatedImage.base64 };

    } catch (error) {
        console.error('Error picking image:', error);
        return { success: false, error: 'Failed to select image' };
    }
};

export const takePhoto = async (): Promise<ImagePickerResult> => {
    try {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                'Permission Required',
                'Sorry, we need camera permissions to take photos.'
            );
            return { success: false, error: 'Camera permission denied' };
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
            base64: false,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
            return { success: false, error: 'Photo capture cancelled' };
        }

        const photo = result.assets[0];

        const manipulatedImage = await ImageManipulator.manipulateAsync(
            photo.uri,
            [
                { resize: { width: 800 } },
            ],
            {
                compress: 0.7,
                format: ImageManipulator.SaveFormat.JPEG,
                base64: true,
            }
        );

        if (!manipulatedImage.base64) {
            return { success: false, error: 'Failed to process photo' };
        }

        return { success: true, base64: manipulatedImage.base64 };

    } catch (error) {
        console.error('Error taking photo:', error);
        return { success: false, error: 'Failed to take photo' };
    }
};