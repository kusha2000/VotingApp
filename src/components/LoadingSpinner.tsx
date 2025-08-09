import React from 'react';
import {
    View,
    ActivityIndicator,
    Text,
    StyleSheet,
} from 'react-native';
import { colors, theme } from '../styles/colors';

interface LoadingSpinnerProps {
    message?: string;
    size?: 'small' | 'large';
    color?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    message = 'Loading...',
    size = 'large',
    color = colors.primary,
}) => {
    return (
        <View style={styles.container}>
            <ActivityIndicator size={size} color={color} />
            {message && <Text style={styles.message}>{message}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
        padding: theme.spacing.lg,
    },
    message: {
        marginTop: theme.spacing.md,
        fontSize: theme.fontSize.md,
        color: colors.textSecondary,
        textAlign: 'center',
    },
});

export default LoadingSpinner;