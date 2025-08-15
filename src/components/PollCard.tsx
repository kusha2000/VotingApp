import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    Animated,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Comments, Poll, Voter } from '../types';
import { colors, theme } from '../styles/colors';

interface PollCardProps {
    poll: Poll;
    voteStats: { count: number; percentage: number; voters: Voter[] }[];
    userVote?: string;
    comments?: Comments[],
    onVote: (optionId: string,) => void;
    onComment: (comment: string,) => void;
}

const PollCard: React.FC<PollCardProps> = ({
    poll,
    voteStats,
    userVote,
    comments,
    onVote,
    onComment
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [expandAnimation] = useState(new Animated.Value(0));
    const [newComments, setNewComments] = useState("");
    const handleSubmit = () => {
        if (!newComments.trim()) return; // avoid empty submissions
        console.log('Submitted comment:', newComments);
        onComment(newComments);
        setNewComments('');
    };

    const totalVotes = voteStats.reduce((sum, stat) => sum + stat.count, 0);
    const hasVoted = !!userVote;

    const toggleExpanded = () => {
        const toValue = isExpanded ? 0 : 1;
        setIsExpanded(!isExpanded);

        Animated.timing(expandAnimation, {
            toValue,
            duration: 300,
            useNativeDriver: false,
        }).start();
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const getOptionColor = (optionId: string, isSelected: boolean) => {
        if (isSelected) return colors.primary;
        return colors.surface;
    };

    const getTextColor = (optionId: string, isSelected: boolean) => {
        if (isSelected) return 'white';
        return colors.text;
    };

    const renderVoterAvatars = (voters: Voter[]) => {
        if (!voters || voters.length === 0) return null;

        const displayVoters = voters.slice(-5);
        const remainingCount = Math.max(0, voters.length - 5);

        return (
            <View style={styles.votersContainer}>
                <View style={styles.avatarStack}>
                    {displayVoters.map((voter, index) => (
                        <View
                            key={voter.id}
                            style={[
                                styles.avatarWrapper,
                                { zIndex: displayVoters.length - index, right: index * 12 }
                            ]}
                        >
                            <Image
                                source={{ uri: voter.avatar }}
                                style={styles.voterAvatar}
                            />
                        </View>
                    ))}
                    {remainingCount > 0 && (
                        <View style={[styles.avatarWrapper, styles.remainingCount, { right: displayVoters.length * 12 }]}>
                            <Text style={styles.remainingText}>+{remainingCount}</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.collapsedContent}
                onPress={toggleExpanded}
                activeOpacity={0.7}
            >
                <View style={styles.mainContent}>
                    <View style={styles.imageSection}>
                        {poll.image ? (
                            <Image
                                source={{ uri: `data:image/jpeg;base64,${poll.image}` }}
                                style={styles.pollImageSmall}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={styles.placeholderImage}>
                                <Ionicons name="bar-chart" size={24} color={colors.primary} />
                            </View>
                        )}
                    </View>

                    <View style={styles.infoSection}>
                        <Text style={styles.title} numberOfLines={2}>
                            {poll.title}
                        </Text>
                        <Text style={styles.description} numberOfLines={2}>
                            {poll.description}
                        </Text>

                        <View style={styles.metaInfo}>
                            <View style={styles.voteInfo}>
                                <Ionicons name="people" size={14} color={colors.textSecondary} />
                                <Text style={styles.voteCount}>{totalVotes} votes</Text>
                            </View>
                            <Text style={styles.timestamp}>
                                {formatDate(poll.createdAt)}
                            </Text>
                        </View>

                        {hasVoted && (
                            <View style={styles.votedBadgeContainer}>
                                <View style={styles.votedBadge}>
                                    <Ionicons name="checkmark" size={12} color="white" />
                                </View>
                                <Text style={styles.votedText}>You voted</Text>
                            </View>
                        )}
                    </View>

                    <View>

                    </View>

                    <View style={styles.expandButton}>
                        <Animated.View
                            style={{
                                transform: [{
                                    rotate: expandAnimation.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0deg', '180deg']
                                    })
                                }]
                            }}
                        >
                            <Ionicons name="chevron-down" size={20} color={colors.primary} />
                        </Animated.View>
                    </View>
                </View>
            </TouchableOpacity>

            <Animated.View
                style={[
                    styles.expandedContent,
                    {
                        maxHeight: expandAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 1000]
                        }),
                        opacity: expandAnimation
                    }
                ]}
            >
                <View style={styles.divider} />

                <View style={styles.optionsContainer}>
                    {poll.options.map((option, index) => {
                        const isSelected = userVote === option.id;
                        const percentage = voteStats[index]?.percentage || 0;
                        const count = voteStats[index]?.count || 0;
                        const voters = voteStats[index]?.voters || [];

                        return (
                            <TouchableOpacity
                                key={option.id}
                                style={[
                                    styles.optionButton,
                                    {
                                        backgroundColor: getOptionColor(option.id, isSelected),
                                        borderColor: getOptionColor(option.id, isSelected),
                                    },
                                ]}
                                onPress={() => !hasVoted && onVote(option.id)}
                                disabled={hasVoted}
                            >
                                <View style={styles.optionContent}>
                                    <View style={styles.optionLeft}>
                                        <View style={styles.radioContainer}>
                                            {hasVoted ? (
                                                isSelected ? (
                                                    <Ionicons name="checkmark-circle" size={20} color="white" />
                                                ) : (
                                                    <View style={styles.radioEmpty} />
                                                )
                                            ) : (
                                                <View style={styles.radioEmpty} />
                                            )}
                                        </View>
                                        <View style={styles.optionTextContainer}>
                                            <Text
                                                style={[
                                                    styles.optionText,
                                                    { color: getTextColor(option.id, isSelected) },
                                                ]}
                                            >
                                                {option.text}
                                            </Text>
                                            {voters.length > 0 && (
                                                <View style={styles.optionVoters}>
                                                    {renderVoterAvatars(voters)}
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    {totalVotes > 0 && (
                                        <View style={styles.optionRight}>
                                            <Text
                                                style={[
                                                    styles.percentageText,
                                                    { color: getTextColor(option.id, isSelected) },
                                                ]}
                                            >
                                                {percentage.toFixed(1)}%
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.countText,
                                                    { color: getTextColor(option.id, isSelected) },
                                                ]}
                                            >
                                                {count} votes
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {totalVotes > 0 && (
                                    <View
                                        style={[
                                            styles.progressBar,
                                            {
                                                width: `${percentage}%`,
                                                backgroundColor: isSelected
                                                    ? 'rgba(255, 255, 255, 0.3)'
                                                    : 'rgba(108, 99, 255, 0.1)',
                                            },
                                        ]}
                                    />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
                <View style={styles.commentsContainer}>
                    {!comments || comments.length === 0 ? (
                        <Text style={styles.noCommentsText}>No comments yet.</Text>
                    ) : (
                        comments.map(comment => (
                            <View key={comment.id.toString()} style={styles.commentItem}>
                                {/* If you have userName saved in comment, use it, else fallback to userId */}
                                <Text style={styles.commentUser}>{comment.userName || comment.userId}:</Text>
                                <Text style={styles.commentText}>{comment.comment}</Text>  {/* note: comment.comment */}
                            </View>
                        ))
                    )}
                </View>
                <View style={styles.commentRow}>
                    <TextInput
                        value={newComments}
                        onChangeText={setNewComments}
                        placeholder="Write a comment..."
                        style={styles.commentInput}
                    />
                    <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                        <Text style={styles.submitButtonText}>Comment</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.card,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.md,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    collapsedContent: {
        padding: theme.spacing.lg,
    },
    mainContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    imageSection: {
        marginRight: theme.spacing.md,
    },
    pollImageSmall: {
        width: 60,
        height: 60,
        borderRadius: theme.borderRadius.md,
    },
    placeholderImage: {
        width: 60,
        height: 60,
        borderRadius: theme.borderRadius.md,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoSection: {
        flex: 1,
    },
    title: {
        fontSize: theme.fontSize.lg,
        fontWeight: '600',
        color: colors.text,
        marginBottom: theme.spacing.xs,
        lineHeight: 20,
    },
    description: {
        fontSize: theme.fontSize.md,
        color: colors.textSecondary,
        lineHeight: 18,
        marginBottom: theme.spacing.sm,
    },
    metaInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    voteInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    voteCount: {
        fontSize: theme.fontSize.sm,
        color: colors.textSecondary,
        marginLeft: 4,
        fontWeight: '500',
    },
    timestamp: {
        fontSize: theme.fontSize.sm,
        color: colors.textLight,
    },
    votedBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: theme.spacing.sm,
    },
    votedBadge: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.success,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.xs,
    },
    votedText: {
        fontSize: theme.fontSize.xs,
        color: colors.success,
        fontWeight: '500',
    },
    expandButton: {
        marginLeft: theme.spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    expandedContent: {
        overflow: 'hidden',
    },
    divider: {
        height: 1,
        backgroundColor: colors.divider,
        marginHorizontal: theme.spacing.lg,
    },
    optionsContainer: {
        padding: theme.spacing.lg,
        paddingTop: theme.spacing.md,
    },
    optionButton: {
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.sm,
        borderWidth: 2,
        position: 'relative',
        overflow: 'hidden',
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: theme.spacing.md,
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flex: 1,
    },
    optionTextContainer: {
        flex: 1,
    },
    optionRight: {
        alignItems: 'flex-end',
    },
    radioContainer: {
        marginRight: theme.spacing.md,
        marginTop: 2,
    },
    radioEmpty: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.border,
    },
    optionText: {
        fontSize: theme.fontSize.md,
        fontWeight: '500',
        lineHeight: 20,
        marginBottom: theme.spacing.xs,
    },
    optionVoters: {
        marginTop: theme.spacing.xs,
    },
    votersContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarStack: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 20,
    },
    avatarWrapper: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: 'white',
    },
    voterAvatar: {
        width: 18,
        height: 18,
        borderRadius: 9,
    },
    remainingCount: {
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    remainingText: {
        fontSize: 9,
        color: 'white',
        fontWeight: '600',
    },
    percentageText: {
        fontSize: theme.fontSize.md,
        fontWeight: '600',
    },
    countText: {
        fontSize: theme.fontSize.xs,
        marginTop: 2,
    },
    progressBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: '100%',
        borderRadius: theme.borderRadius.md - 2,
    },
    commentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
    },
    commentInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 6,
        marginRight: 8,
    },
    submitButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    commentsContainer: {
        marginTop: 12,
        paddingHorizontal: 12,
        maxHeight: 200,
    },

    commentItem: {
        flexDirection: 'row',
        marginBottom: 8,
    },

    commentUser: {
        fontWeight: 'bold',
        marginRight: 6,
        color: colors.primary,
    },

    commentText: {
        flex: 1,
        color: colors.text,
    },

    noCommentsText: {
        fontStyle: 'italic',
        color: colors.textSecondary,
        paddingHorizontal: 12,
    },


});

export default PollCard;