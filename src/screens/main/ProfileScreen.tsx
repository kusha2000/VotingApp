import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    Modal,
    TextInput,
    Image,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '../../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { logOut } from '../../services/authService';
import { getPolls } from '../../services/pollService';
import { getUserVote } from '../../services/voteService';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors, theme } from '../../styles/colors';
import { EditProfileData } from '../../types';
import { updateUserProfileInVotes } from '../../services/voteService';

type InfoModalType = 'privacy' | 'support' | 'about' | null;

const ProfileScreen: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState<InfoModalType>(null);
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const [editData, setEditData] = useState<EditProfileData>({
        name: user?.name || '',
        age: user?.age || '',
        address: user?.address || '',
    });
    const [stats, setStats] = useState({
        totalPolls: 0,
        pollsVoted: 0,
        pollsCreated: 0,
    });

    useEffect(() => {
        fetchUserStats();
        loadProfilePic();
    }, [user]);

    useEffect(() => {
        const refreshStats = () => {
            fetchUserStats();
        };

        refreshStats();
    }, []);

    const loadProfilePic = () => {
        if (user?.profilePic) {
            setProfilePic(user.profilePic);
        }
    };

    const fetchUserStats = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const polls = await getPolls();
            const totalPolls = polls.length;
            const pollsCreated = polls.filter(poll => poll.createdBy === user.uid).length;

            let pollsVoted = 0;
            const votePromises = polls.map(poll => getUserVote(poll.id, user.uid));
            const votes = await Promise.all(votePromises);
            pollsVoted = votes.filter(vote => vote !== null).length;

            setStats({
                totalPolls,
                pollsVoted,
                pollsCreated,
            });
        } catch (error) {
            console.error('Error fetching user stats:', error);
            Alert.alert('Error', 'Failed to load statistics');
        } finally {
            setLoading(false);
        }
    };

    const requestPermissions = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please grant camera roll permissions to upload profile picture.');
            return false;
        }
        return true;
    };

    const convertImageToBase64 = async (uri: string): Promise<string> => {
        try {
            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
            });
            return `data:image/jpeg;base64,${base64}`;
        } catch (error) {
            console.error('Error converting image to base64:', error);
            throw error;
        }
    };

    const updateProfilePicInFirestore = async (base64Image: string) => {
        if (!user?.uid) return;

        try {
            const userDocRef = doc(firestore, 'users', user.uid);
            await updateDoc(userDocRef, {
                profilePic: base64Image,
            });

            await updateUserProfileInVotes(user.uid, {
                userAvatar: base64Image,
                userName: user.name
            });

            if (refreshUser) {
                await refreshUser();
            }
        } catch (error) {
            console.error('Error updating profile picture:', error);
            throw error;
        }
    };

    const handleProfilePicChange = async () => {
        const hasPermission = await requestPermissions();
        if (!hasPermission) return;

        Alert.alert(
            'Change Profile Picture',
            'Choose an option',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Choose from Gallery',
                    onPress: pickImageFromGallery,
                },
                {
                    text: 'Take Photo',
                    onPress: takePhoto,
                },
            ]
        );
    };

    const pickImageFromGallery = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
            });

            if (!result.canceled && result.assets[0]) {
                setLoading(true);
                const base64Image = await convertImageToBase64(result.assets[0].uri);
                await updateProfilePicInFirestore(base64Image);
                setProfilePic(base64Image);
                Alert.alert('Success', 'Profile picture updated successfully!');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update profile picture');
            console.error('Error picking image:', error);
        } finally {
            setLoading(false);
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please grant camera permissions to take a photo.');
            return;
        }

        try {
            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
            });

            if (!result.canceled && result.assets[0]) {
                setLoading(true);
                const base64Image = await convertImageToBase64(result.assets[0].uri);
                await updateProfilePicInFirestore(base64Image);
                setProfilePic(base64Image);
                Alert.alert('Success', 'Profile picture updated successfully!');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update profile picture');
            console.error('Error taking photo:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditProfile = () => {
        setEditData({
            name: user?.name || '',
            age: user?.age?.toString() || '',
            address: user?.address || '',
        });
        setShowEditDialog(true);
    };

    const saveProfileChanges = async () => {
        if (!user?.uid) return;

        if (!editData.name.trim()) {
            Alert.alert('Error', 'Name cannot be empty');
            return;
        }

        try {
            setLoading(true);
            const userDocRef = doc(firestore, 'users', user.uid);
            const updateData = {
                name: editData.name.trim(),
                age: editData.age.trim(),
                address: editData.address.trim(),
            };

            await updateDoc(userDocRef, updateData);


            if (editData.name.trim() !== user.name) {
                await updateUserProfileInVotes(user.uid, {
                    userName: editData.name.trim(),
                    userAvatar: user.profilePic
                });
            }

            if (refreshUser) {
                await refreshUser();
            }

            setShowEditDialog(false);
            Alert.alert('Success', 'Profile updated successfully!');

            await fetchUserStats();
        } catch (error) {
            Alert.alert('Error', 'Failed to update profile');
            console.error('Error updating profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await logOut();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to logout');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleRefresh = async () => {
        await fetchUserStats();
    };

    const handleContact = async (type: 'email' | 'whatsapp') => {
        try {
            if (type === 'email') {
                await Linking.openURL('mailto:kushanandarawewa1@gmail.com?subject=VoteWise Support');
            } else {
                await Linking.openURL('https://wa.me/94714249784?text=Hello, I need help with VoteWise');
            }
        } catch (error) {
            Alert.alert('Error', 'Could not open the application');
        }
    };

    const StatCard = ({
        icon,
        title,
        value,
        color = colors.primary
    }: {
        icon: string;
        title: string;
        value: number;
        color?: string;
    }) => (
        <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: color }]}>
                <Ionicons name={icon as any} size={24} color="white" />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statTitle}>{title}</Text>
        </View>
    );

    const MenuOption = ({
        icon,
        title,
        onPress,
        color = colors.text,
        showArrow = true
    }: {
        icon: string;
        title: string;
        onPress: () => void;
        color?: string;
        showArrow?: boolean;
    }) => (
        <TouchableOpacity style={styles.menuOption} onPress={onPress}>
            <View style={styles.menuLeft}>
                <Ionicons name={icon as any} size={24} color={color} />
                <Text style={[styles.menuTitle, { color }]}>{title}</Text>
            </View>
            {showArrow && (
                <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            )}
        </TouchableOpacity>
    );

    const InfoModalContent = () => {
        const getModalConfig = () => {
            switch (showInfoModal) {
                case 'privacy':
                    return {
                        title: 'Privacy & Security',
                        icon: 'shield-checkmark',
                        color: '#4CAF50',
                        content: [
                            { icon: 'lock-closed', text: 'End-to-end encryption for all data' },
                            { icon: 'eye-off', text: 'We never sell your personal information' },
                            { icon: 'shield-half', text: 'GDPR & CCPA compliant' },
                            { icon: 'server', text: 'Secure cloud storage with AWS' },
                            { icon: 'refresh', text: 'Regular security audits & updates' },
                            { icon: 'person-remove', text: 'Right to delete your account anytime' },
                            { icon: 'time', text: '24/7 security monitoring' },
                            { icon: 'checkmark-circle', text: 'Two-factor authentication available' }
                        ]
                    };
                case 'support':
                    return {
                        title: 'Help & Support',
                        icon: 'headset',
                        color: '#2196F3',
                        content: [
                            {
                                icon: 'mail',
                                text: 'Email Support',
                                subtitle: 'kushanandarawewa1@gmail.com',
                                action: () => handleContact('email')
                            },
                            {
                                icon: 'logo-whatsapp',
                                text: 'WhatsApp Support',
                                subtitle: '+94 71 424 9784',
                                action: () => handleContact('whatsapp')
                            },
                            { icon: 'time', text: 'Response time: Within 24 hours' },
                            { icon: 'chatbubbles', text: 'Live chat available Mon-Fri' },
                            { icon: 'document-text', text: 'Comprehensive FAQ section' },
                            { icon: 'school', text: 'Video tutorials & guides' }
                        ]
                    };
                case 'about':
                    return {
                        title: 'About VoteWise',
                        icon: 'information-circle',
                        color: '#FF9800',
                        content: [
                            { icon: 'phone-portrait', text: 'VoteWise v1.0.0' },
                            { icon: 'person', text: 'Developer: Kushan Andarawewa' },
                            { icon: 'logo-react', text: 'Built with React Native' },
                            { icon: 'server', text: 'Powered by Firebase' },
                            { icon: 'design-services', text: 'Modern UI/UX Design' },
                            { icon: 'calendar', text: '© 2025 VoteWise. All rights reserved.' },
                            {
                                icon: 'mail',
                                text: 'Contact Developer',
                                subtitle: 'kushanandarawewa1@gmail.com',
                                action: () => handleContact('email')
                            }
                        ]
                    };
                default:
                    return null;
            }
        };

        const config = getModalConfig();
        if (!config) return null;

        return (
            <Modal
                visible={showInfoModal !== null}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowInfoModal(null)}
            >
                <View style={styles.infoModalOverlay}>
                    <View style={styles.infoModalContent}>

                        <View style={[styles.infoModalHeader, { backgroundColor: config.color }]}>
                            <View style={styles.infoModalHeaderContent}>
                                <View style={styles.infoModalIconContainer}>
                                    <Ionicons name={config.icon as any} size={28} color="white" />
                                </View>
                                <Text style={styles.infoModalTitle}>{config.title}</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowInfoModal(null)}
                                style={styles.infoModalCloseButton}
                            >
                                <Ionicons name="close" size={24} color="white" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.infoModalBody} showsVerticalScrollIndicator={false}>
                            {config.content.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.infoModalItem,
                                        item.action && styles.infoModalItemClickable
                                    ]}
                                    onPress={item.action}
                                    disabled={!item.action}
                                >
                                    <View style={styles.infoModalItemLeft}>
                                        <View style={[styles.infoModalItemIcon, { backgroundColor: `${config.color}15` }]}>
                                            <Ionicons name={item.icon as any} size={20} color={config.color} />
                                        </View>
                                        <View style={styles.infoModalItemText}>
                                            <Text style={styles.infoModalItemTitle}>{item.text}</Text>
                                            {item.subtitle && (
                                                <Text style={styles.infoModalItemSubtitle}>{item.subtitle}</Text>
                                            )}
                                        </View>
                                    </View>
                                    {item.action && (
                                        <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>


                        <View style={styles.infoModalFooter}>
                            <TouchableOpacity
                                style={[styles.infoModalButton, { backgroundColor: config.color }]}
                                onPress={() => setShowInfoModal(null)}
                            >
                                <Text style={styles.infoModalButtonText}>Got it!</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.avatarContainer}
                    onPress={handleProfilePicChange}
                >
                    {profilePic ? (
                        <Image source={{ uri: profilePic }} style={styles.profileImage} />
                    ) : (
                        <Ionicons name="person" size={40} color="white" />
                    )}
                    <View style={styles.cameraIcon}>
                        <Ionicons name="camera" size={16} color="white" />
                    </View>
                </TouchableOpacity>
                <Text style={styles.displayName}>
                    {user?.name || 'Anonymous User'}
                </Text>
                <Text style={styles.email}>{user?.email}</Text>
            </View>

            <View style={styles.statsSection}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Your Activity</Text>
                    <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
                        <Ionicons name="refresh" size={20} color={colors.primary} />
                    </TouchableOpacity>
                </View>
                <View style={styles.statsGrid}>
                    <StatCard
                        icon="bar-chart-outline"
                        title="Total Polls"
                        value={stats.totalPolls}
                        color={colors.primary}
                    />
                    <StatCard
                        icon="checkmark-circle-outline"
                        title="Polls Voted"
                        value={stats.pollsVoted}
                        color={colors.success}
                    />
                    <StatCard
                        icon="create-outline"
                        title="Polls Created"
                        value={stats.pollsCreated}
                        color={colors.secondary}
                    />
                </View>
            </View>

            <View style={styles.menuSection}>
                <Text style={styles.sectionTitle}>Settings</Text>
                <View style={styles.menuContainer}>
                    <MenuOption
                        icon="person-outline"
                        title="Edit Profile"
                        onPress={handleEditProfile}
                    />
                    <MenuOption
                        icon="shield-outline"
                        title="Privacy & Security"
                        onPress={() => setShowInfoModal('privacy')}
                    />
                    <MenuOption
                        icon="help-circle-outline"
                        title="Help & Support"
                        onPress={() => setShowInfoModal('support')}
                    />
                    <MenuOption
                        icon="information-circle-outline"
                        title="About"
                        onPress={() => setShowInfoModal('about')}
                    />
                </View>
            </View>

            <View style={styles.logoutSection}>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={24} color={colors.error} />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>VoteWise © 2025</Text>
                <Text style={styles.footerText}>Created By Kushan Andarawewa</Text>
            </View>

            <Modal
                visible={showEditDialog}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowEditDialog(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Profile</Text>
                            <TouchableOpacity
                                onPress={() => setShowEditDialog(false)}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Name *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={editData.name}
                                    onChangeText={(text) => setEditData(prev => ({ ...prev, name: text }))}
                                    placeholder="Enter your name"
                                    placeholderTextColor={colors.textLight}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Age</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={editData.age}
                                    onChangeText={(text) => setEditData(prev => ({ ...prev, age: text }))}
                                    placeholder="Enter your age"
                                    placeholderTextColor={colors.textLight}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Address</Text>
                                <TextInput
                                    style={[styles.textInput, styles.textArea]}
                                    value={editData.address}
                                    onChangeText={(text) => setEditData(prev => ({ ...prev, address: text }))}
                                    placeholder="Enter your address"
                                    placeholderTextColor={colors.textLight}
                                    multiline={true}
                                    numberOfLines={3}
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setShowEditDialog(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={saveProfileChanges}
                            >
                                <Text style={styles.saveButtonText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <InfoModalContent />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        backgroundColor: colors.primary,
        alignItems: 'center',
        paddingTop: theme.spacing.xl,
        paddingBottom: theme.spacing.xl,
        borderBottomLeftRadius: theme.borderRadius.lg,
        borderBottomRightRadius: theme.borderRadius.lg,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.md,
        position: 'relative',
    },
    profileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.primary,
        borderRadius: 12,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    displayName: {
        fontSize: theme.fontSize.xl,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: theme.spacing.xs,
    },
    email: {
        fontSize: theme.fontSize.md,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    statsSection: {
        padding: theme.spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    sectionTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: '600',
        color: colors.text,
    },
    refreshButton: {
        padding: theme.spacing.sm,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        alignItems: 'center',
        marginHorizontal: theme.spacing.xs,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    statIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.sm,
    },
    statValue: {
        fontSize: theme.fontSize.xl,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: theme.spacing.xs,
    },
    statTitle: {
        fontSize: theme.fontSize.sm,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    menuSection: {
        padding: theme.spacing.lg,
    },
    menuContainer: {
        backgroundColor: colors.card,
        borderRadius: theme.borderRadius.md,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    menuOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuTitle: {
        fontSize: theme.fontSize.md,
        marginLeft: theme.spacing.md,
        fontWeight: '500',
    },
    logoutSection: {
        padding: theme.spacing.lg,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.card,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.lg,
        borderWidth: 2,
        borderColor: colors.error,
    },
    logoutText: {
        fontSize: theme.fontSize.md,
        color: colors.error,
        fontWeight: '600',
        marginLeft: theme.spacing.sm,
    },
    footer: {
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    footerText: {
        fontSize: theme.fontSize.sm,
        color: colors.textLight,
        marginBottom: theme.spacing.xs,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    modalContent: {
        backgroundColor: colors.card,
        borderRadius: theme.borderRadius.lg,
        width: '100%',
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    modalTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: '600',
        color: colors.text,
    },
    closeButton: {
        padding: theme.spacing.xs,
    },
    modalBody: {
        padding: theme.spacing.lg,
        maxHeight: 400,
    },
    inputGroup: {
        marginBottom: theme.spacing.lg,
    },
    inputLabel: {
        fontSize: theme.fontSize.md,
        fontWeight: '500',
        color: colors.text,
        marginBottom: theme.spacing.sm,
    },
    textInput: {
        borderWidth: 1,
        borderColor: colors.divider,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        fontSize: theme.fontSize.md,
        color: colors.text,
        backgroundColor: colors.background,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    modalFooter: {
        flexDirection: 'row',
        padding: theme.spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
        gap: theme.spacing.md,
    },
    modalButton: {
        flex: 1,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    saveButton: {
        backgroundColor: colors.primary,
    },
    cancelButtonText: {
        fontSize: theme.fontSize.md,
        fontWeight: '600',
        color: colors.text,
    },
    saveButtonText: {
        fontSize: theme.fontSize.md,
        fontWeight: '600',
        color: 'white',
    },

    infoModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    infoModalContent: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 12,
    },
    infoModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.lg,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    infoModalHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    infoModalIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing.md,
    },
    infoModalTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: 'bold',
        color: 'white',
        flex: 1,
    },
    infoModalCloseButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoModalBody: {
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.lg,
        maxHeight: '70%',
    },
    infoModalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.sm,
        marginBottom: theme.spacing.xs,
        borderRadius: theme.borderRadius.md,
        backgroundColor: colors.background,
    },
    infoModalItemClickable: {
        backgroundColor: `${colors.primary}08`,
        borderWidth: 1,
        borderColor: `${colors.primary}20`,
    },
    infoModalItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    infoModalItemIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing.md,
    },
    infoModalItemText: {
        flex: 1,
    },
    infoModalItemTitle: {
        fontSize: theme.fontSize.md,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    infoModalItemSubtitle: {
        fontSize: theme.fontSize.sm,
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
    infoModalFooter: {
        padding: theme.spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
    },
    infoModalButton: {
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    infoModalButtonText: {
        fontSize: theme.fontSize.md,
        fontWeight: '700',
        color: 'white',
    }
});

export default ProfileScreen;