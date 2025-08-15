import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Image,
    ActionSheetIOS,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { createPoll } from '../../services/pollService';
import { PollOption, PollCategory, POLL_CATEGORIES } from '../../types';
import { colors, theme } from '../../styles/colors';
import { pickImage, takePhoto } from '../../utils/imageUtils';
import Comments from '../../components/Comments';

interface CreatePollScreenProps {
    navigation: any;
}

const CreatePollScreen: React.FC<CreatePollScreenProps> = ({ navigation }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [options, setOptions] = useState<string[]>(['', '']);
    const [image, setImage] = useState<string | null>(null);
    const [category, setCategory] = useState<PollCategory>(PollCategory.OTHER);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [loading, setLoading] = useState(false);

    const addOption = () => {
        if (options.length < 6) {
            setOptions([...options, '']);
        } else {
            Alert.alert('Limit Reached', 'Maximum 6 options allowed per poll');
        }
    };

    const removeOption = (index: number) => {
        if (options.length > 2) {
            const newOptions = options.filter((_, i) => i !== index);
            setOptions(newOptions);
        }
    };

    const updateOption = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const showImagePicker = () => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', 'Take Photo', 'Choose from Library', 'Remove Image'],
                    cancelButtonIndex: 0,
                    destructiveButtonIndex: image ? 3 : -1,
                },
                async (buttonIndex) => {
                    if (buttonIndex === 1) {
                        handleTakePhoto();
                    } else if (buttonIndex === 2) {
                        handlePickImage();
                    } else if (buttonIndex === 3 && image) {
                        setImage(null);
                    }
                }
            );
        } else {
            Alert.alert(
                'Select Image',
                'Choose how you want to add an image to your poll',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Take Photo', onPress: handleTakePhoto },
                    { text: 'Choose from Library', onPress: handlePickImage },
                    ...(image ? [{ text: 'Remove Image', onPress: () => setImage(null), style: 'destructive' as const }] : []),
                ]
            );
        }
    };

    const handlePickImage = async () => {
        const result = await pickImage();
        if (result.success && result.base64) {
            setImage(result.base64);
        } else if (result.error) {
            Alert.alert('Error', result.error);
        }
    };

    const handleTakePhoto = async () => {
        const result = await takePhoto();
        if (result.success && result.base64) {
            setImage(result.base64);
        } else if (result.error) {
            Alert.alert('Error', result.error);
        }
    };

    const getSelectedCategory = () => {
        return POLL_CATEGORIES.find(cat => cat.id === category) || POLL_CATEGORIES[POLL_CATEGORIES.length - 1];
    };

    const handleCategorySelect = (categoryId: PollCategory) => {
        setCategory(categoryId);
        setShowCategoryDropdown(false);
    };

    const validateAndCreatePoll = async () => {
        if (!title.trim()) {
            Alert.alert('Validation Error', 'Please enter a poll title');
            return;
        }

        if (!description.trim()) {
            Alert.alert('Validation Error', 'Please enter a poll description');
            return;
        }

        const validOptions = options.filter(opt => opt.trim() !== '');
        if (validOptions.length < 2) {
            Alert.alert('Validation Error', 'Please provide at least 2 options');
            return;
        }

        if (!user) {
            Alert.alert('Error', 'You must be logged in to create a poll');
            return;
        }

        setLoading(true);

        try {
            const pollOptions: PollOption[] = validOptions.map((option, index) => ({
                id: `option_${index}`,
                text: option.trim(),
                votes: 0,
            }));

            const pollData = {
                title: title.trim(),
                description: description.trim(),
                options: pollOptions,
                createdBy: user.uid,
                category: category,
                ...(image && { image }),
            };

            await createPoll(pollData);

            Alert.alert(
                'Success!',
                'Your poll has been created successfully',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            setTitle('');
                            setDescription('');
                            setOptions(['', '']);
                            setImage(null);
                            setCategory(PollCategory.OTHER);
                            navigation.navigate('Home');
                        },
                    },
                ]
            );
        } catch (error) {
            console.error('Error creating poll:', error);
            Alert.alert('Error', 'Failed to create poll. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Ionicons name="create-outline" size={40} color={colors.primary} />
                    <Text style={styles.headerTitle}>Create New Poll</Text>
                    <Text style={styles.headerSubtitle}>
                        Ask a question and let others vote
                    </Text>
                </View>

                <View style={styles.form}>


                    <View style={styles.section}>
                        <Text style={styles.label}>Poll Title *</Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="What's your question?"
                                placeholderTextColor={colors.textSecondary}
                                value={title}
                                onChangeText={setTitle}
                                maxLength={100}
                            />
                        </View>
                        <Text style={styles.characterCount}>{title.length}/100</Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Description *</Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Provide more context about your poll..."
                                placeholderTextColor={colors.textSecondary}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={3}
                                maxLength={300}
                            />
                        </View>
                        <Text style={styles.characterCount}>{description.length}/300</Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Category *</Text>
                        <View style={styles.dropdownContainer}>
                            <TouchableOpacity
                                style={styles.categorySelector}
                                onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                            >
                                <View style={styles.categoryDisplay}>
                                    <View style={[
                                        styles.categoryIconSmall,
                                        { backgroundColor: getSelectedCategory().color }
                                    ]}>
                                        <Ionicons
                                            name={getSelectedCategory().icon as any}
                                            size={20}
                                            color="white"
                                        />
                                    </View>
                                    <Text style={styles.categoryText}>{getSelectedCategory().label}</Text>
                                </View>
                                <Ionicons
                                    name={showCategoryDropdown ? "chevron-up" : "chevron-down"}
                                    size={20}
                                    color={colors.textSecondary}
                                />
                            </TouchableOpacity>

                            {showCategoryDropdown && (
                                <View style={styles.dropdown}>
                                    {POLL_CATEGORIES.map((cat) => (
                                        <TouchableOpacity
                                            key={cat.id}
                                            style={[
                                                styles.dropdownItem,
                                                category === cat.id && styles.selectedDropdownItem
                                            ]}
                                            onPress={() => handleCategorySelect(cat.id)}
                                        >
                                            <View style={[styles.categoryIconSmall, { backgroundColor: cat.color }]}>
                                                <Ionicons name={cat.icon as any} size={20} color="white" />
                                            </View>
                                            <Text style={[
                                                styles.dropdownItemText,
                                                category === cat.id && styles.selectedDropdownItemText
                                            ]}>
                                                {cat.label}
                                            </Text>
                                            {category === cat.id && (
                                                <Ionicons name="checkmark" size={20} color={colors.primary} />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.label}>Poll Image</Text>
                            <TouchableOpacity
                                style={styles.imageButton}
                                onPress={showImagePicker}
                            >
                                <Ionicons
                                    name={image ? "image" : "camera-outline"}
                                    size={20}
                                    color="white"
                                />
                                <Text style={styles.imageButtonText}>
                                    {image ? 'Change Image' : 'Add Image'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {image && (
                            <View style={styles.imagePreviewContainer}>
                                <Image
                                    source={{ uri: `data:image/jpeg;base64,${image}` }}
                                    style={styles.imagePreview}
                                    resizeMode="cover"
                                />
                                <TouchableOpacity
                                    style={styles.removeImageButton}
                                    onPress={() => setImage(null)}
                                >
                                    <Ionicons name="close-circle" size={24} color={colors.error} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.label}>Options *</Text>
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={addOption}
                                disabled={options.length >= 6}
                            >
                                <Ionicons name="add" size={20} color="white" />
                                <Text style={styles.addButtonText}>Add Option</Text>
                            </TouchableOpacity>
                        </View>

                        {options.map((option, index) => (
                            <View key={index} style={styles.optionContainer}>
                                <View style={styles.optionInputContainer}>
                                    <Text style={styles.optionNumber}>{index + 1}</Text>
                                    <TextInput
                                        style={styles.optionInput}
                                        placeholder={`Option ${index + 1}`}
                                        placeholderTextColor={colors.textSecondary}
                                        value={option}
                                        onChangeText={(value) => updateOption(index, value)}
                                        maxLength={50}
                                    />
                                    {options.length > 2 && (
                                        <TouchableOpacity
                                            style={styles.removeButton}
                                            onPress={() => removeOption(index)}
                                        >
                                            <Ionicons name="close" size={20} color={colors.error} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <Text style={styles.optionCharacterCount}>{option.length}/50</Text>
                            </View>
                        ))}
                    </View>

                    <TouchableOpacity
                        style={[styles.createButton, loading && styles.disabledButton]}
                        onPress={validateAndCreatePoll}
                        disabled={loading}
                    >
                        <Ionicons
                            name="checkmark-circle-outline"
                            size={24}
                            color="white"
                            style={styles.buttonIcon}
                        />
                        <Text style={styles.createButtonText}>
                            {loading ? 'Creating Poll...' : 'Create Poll'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
    },
    header: {
        alignItems: 'center',
        padding: theme.spacing.xl,
        backgroundColor: colors.surface,
        borderBottomLeftRadius: theme.borderRadius.lg,
        borderBottomRightRadius: theme.borderRadius.lg,
    },
    headerTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: 'bold',
        color: colors.text,
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.sm,
    },
    headerSubtitle: {
        fontSize: theme.fontSize.md,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    form: {
        padding: theme.spacing.lg,
    },
    section: {
        marginBottom: theme.spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    label: {
        fontSize: theme.fontSize.md,
        fontWeight: '600',
        color: colors.text,
        marginBottom: theme.spacing.sm,
    },
    dropdownContainer: {
        position: 'relative',
        zIndex: 1000,
    },
    categorySelector: {
        backgroundColor: colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 2,
        borderColor: colors.border,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    categoryDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    categoryIconSmall: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    categoryText: {
        fontSize: theme.fontSize.md,
        fontWeight: '500',
        color: colors.text,
    },
    dropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 2,
        borderColor: colors.border,
        borderTopWidth: 0,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        maxHeight: 250,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 1001,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    selectedDropdownItem: {
        backgroundColor: colors.primary + '10',
    },
    dropdownItemText: {
        flex: 1,
        fontSize: theme.fontSize.md,
        color: colors.text,
        marginLeft: theme.spacing.sm,
    },
    selectedDropdownItemText: {
        color: colors.primary,
        fontWeight: '600',
    },
    inputContainer: {
        backgroundColor: colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 2,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    input: {
        padding: theme.spacing.md,
        fontSize: theme.fontSize.md,
        color: colors.text,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    characterCount: {
        fontSize: theme.fontSize.sm,
        color: colors.textLight,
        alignSelf: 'flex-end',
        marginTop: theme.spacing.xs,
    },
    imageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.secondary || colors.primary,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
    },
    imageButtonText: {
        color: 'white',
        fontSize: theme.fontSize.sm,
        fontWeight: '500',
        marginLeft: theme.spacing.xs,
    },
    imagePreviewContainer: {
        position: 'relative',
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
        backgroundColor: colors.surface,
    },
    imagePreview: {
        width: '100%',
        height: 200,
        borderRadius: theme.borderRadius.md,
    },
    removeImageButton: {
        position: 'absolute',
        top: theme.spacing.sm,
        right: theme.spacing.sm,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 12,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
    },
    addButtonText: {
        color: 'white',
        fontSize: theme.fontSize.sm,
        fontWeight: '500',
        marginLeft: theme.spacing.xs,
    },
    optionContainer: {
        marginBottom: theme.spacing.md,
    },
    optionInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 2,
        borderColor: colors.border,
        paddingHorizontal: theme.spacing.md,
    },
    optionNumber: {
        fontSize: theme.fontSize.md,
        fontWeight: 'bold',
        color: colors.primary,
        marginRight: theme.spacing.sm,
        minWidth: 20,
    },
    optionInput: {
        flex: 1,
        paddingVertical: theme.spacing.md,
        fontSize: theme.fontSize.md,
        color: colors.text,
    },
    removeButton: {
        padding: theme.spacing.sm,
    },
    optionCharacterCount: {
        fontSize: theme.fontSize.sm,
        color: colors.textLight,
        alignSelf: 'flex-end',
        marginTop: theme.spacing.xs,
    },
    createButton: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        borderRadius: theme.borderRadius.md,
        paddingVertical: theme.spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: theme.spacing.lg,
        shadowColor: colors.primary,
        shadowOffset: {
            width: 0,
            height: 5,
        },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    disabledButton: {
        opacity: 0.6,
    },
    buttonIcon: {
        marginRight: theme.spacing.sm,
    },
    createButtonText: {
        color: 'white',
        fontSize: theme.fontSize.lg,
        fontWeight: '600',
    },
});

export default CreatePollScreen;