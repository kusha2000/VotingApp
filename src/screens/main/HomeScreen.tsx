import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    RefreshControl,
    Alert,
    TextInput,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { addComment, getComments, getPolls } from '../../services/pollService';
import { castVote, getUserVote, subscribeToVotes } from '../../services/voteService';
import { Poll, PollCategory, POLL_CATEGORIES } from '../../types';
import PollCard from '../../components/PollCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors, theme } from '../../styles/colors';

const HomeScreen: React.FC = () => {
    const { user } = useAuth();
    const [polls, setPolls] = useState<Poll[]>([]);
    const [filteredPolls, setFilteredPolls] = useState<Poll[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userVotes, setUserVotes] = useState<{ [pollId: string]: string }>({});
    const [voteData, setVoteData] = useState<{ [pollId: string]: any }>({});

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<PollCategory | null>(null);
    const [searchFocused, setSearchFocused] = useState(false);
    const searchAnimation = useState(new Animated.Value(0))[0];
    const [newComments, setNewComments] = useState("");
    const [pollComments, setPollComments] = useState<{ [pollId: string]: any[] }>({});

    const fetchPolls = async () => {
        try {
            const pollsData = await getPolls();
            setPolls(pollsData);

            const commentsMap: { [pollId: string]: any[] } = {};
            const votes: { [pollId: string]: string } = {};

            if (user) {
                for (const poll of pollsData) {
                    // Get user vote
                    const userVote = await getUserVote(poll.id, user.uid);
                    if (userVote) {
                        votes[poll.id] = userVote;
                    }

                    // Get comments for this poll
                    const comments = await getComments(poll.id);
                    commentsMap[poll.id] = comments || [];
                }
            }

            setUserVotes(votes);
            setPollComments(commentsMap);

        } catch (error) {
            console.error('Error fetching polls:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterPolls = useCallback(() => {
        let filtered = polls;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(poll =>
                poll.title.toLowerCase().includes(query) ||
                poll.description.toLowerCase().includes(query) ||
                poll.options.some(option => option.text.toLowerCase().includes(query))
            );
        }

        if (selectedCategory) {
            filtered = filtered.filter(poll => poll.category === selectedCategory);
        }

        setFilteredPolls(filtered);
    }, [polls, searchQuery, selectedCategory]);

    useEffect(() => {
        filterPolls();
    }, [filterPolls]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchPolls();
        setRefreshing(false);
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedCategory(null);
    };

    const handleSearchFocus = () => {
        setSearchFocused(true);
        Animated.timing(searchAnimation, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
        }).start();
    };

    const handleSearchBlur = () => {
        if (!searchQuery) {
            setSearchFocused(false);
            Animated.timing(searchAnimation, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
            }).start();
        }
    };

    const getCategoryDisplay = (categoryId: PollCategory) => {
        return POLL_CATEGORIES.find(cat => cat.id === categoryId);
    };

    useFocusEffect(
        useCallback(() => {
            fetchPolls();
        }, [user])
    );

    useEffect(() => {
        const unsubscribes: (() => void)[] = [];

        polls.forEach(poll => {
            const unsubscribe = subscribeToVotes(poll.id, (snapshot) => {
                if (snapshot.exists()) {
                    setVoteData(prev => ({
                        ...prev,
                        [poll.id]: snapshot.val()
                    }));
                }
            });
            unsubscribes.push(unsubscribe);
        });

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [polls]);

    const handleVote = async (pollId: string, optionId: string) => {
        if (!user) return;

        if (userVotes[pollId]) {
            Alert.alert('Already Voted', 'You have already voted on this poll');
            return;
        }

        try {
            await castVote({
                pollId,
                optionId,
                userId: user.uid,
                userName: user.name || 'Anonymous',
                userAvatar: user.profilePic || null,
            });

            setUserVotes(prev => ({
                ...prev,
                [pollId]: optionId
            }));

            if (!newComments) {
                return;
            }

            await addComment(pollId, user.uid, newComments);
            setNewComments("");

            Alert.alert('Success', 'Your vote has been recorded!');
        } catch (error) {
            console.error('Error casting vote:', error);
            Alert.alert('Error', 'Failed to cast vote');
        }
    };
    const handleComment = async (pollId: string, comment: string) => {
        if (!user) return;

        try {

            await addComment(pollId, user.uid, comment);
            setNewComments("");

            Alert.alert('Success', 'Your vote has been recorded!');
        } catch (error) {
            console.error('Error casting vote:', error);
            Alert.alert('Error', 'Failed to cast vote');
        }
    };

    const calculateVotePercentages = (pollId: string, poll: Poll) => {
        const votes = voteData[pollId];
        if (!votes) {
            return poll.options.map(() => ({
                count: 0,
                percentage: 0,
                voters: []
            }));
        }

        const optionCounts: { [optionId: string]: number } = {};
        const optionVoters: { [optionId: string]: any[] } = {};
        let totalVotes = 0;

        Object.keys(votes).forEach(optionId => {
            const optionVoteData = votes[optionId];
            if (optionVoteData && typeof optionVoteData === 'object') {
                const votersArray = Object.entries(optionVoteData).map(([userId, voteData]: [string, any]) => {
                    const userName = voteData.userName || voteData.name || 'Anonymous';
                    const userAvatar = voteData.userAvatar || voteData.profilePic;

                    let avatarUri;
                    if (userAvatar && userAvatar.trim() !== '' && userAvatar !== null) {
                        if (userAvatar.startsWith('data:image/')) {
                            avatarUri = userAvatar;
                        }
                        else if (userAvatar.match(/^[A-Za-z0-9+/=]+$/)) {
                            avatarUri = `data:image/jpeg;base64,${userAvatar}`;
                        }
                        else if (userAvatar.startsWith('http://') || userAvatar.startsWith('https://')) {
                            avatarUri = userAvatar;
                        }
                        else {
                            avatarUri = `data:image/jpeg;base64,${userAvatar}`;
                        }
                    } else {
                        avatarUri = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName.charAt(0))}&background=6c63ff&color=fff&size=40&bold=true`;
                    }

                    return {
                        id: userId,
                        name: userName,
                        avatar: avatarUri
                    };
                });

                optionCounts[optionId] = votersArray.length;
                optionVoters[optionId] = votersArray;
                totalVotes += votersArray.length;
            } else {
                optionCounts[optionId] = 0;
                optionVoters[optionId] = [];
            }
        });

        return poll.options.map(option => ({
            count: optionCounts[option.id] || 0,
            percentage: totalVotes > 0 ? ((optionCounts[option.id] || 0) / totalVotes) * 100 : 0,
            voters: optionVoters[option.id] || []
        }));
    };

    const renderFilterTabs = () => (
        <View style={styles.filterTabsContainer}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterTabsContent}
            >
                <TouchableOpacity
                    style={[
                        styles.filterTab,
                        selectedCategory === null && styles.selectedFilterTab
                    ]}
                    onPress={() => setSelectedCategory(null)}
                >
                    <Ionicons
                        name="grid-outline"
                        size={18}
                        color={selectedCategory === null ? 'white' : colors.textSecondary}
                    />
                    <Text style={[
                        styles.filterTabText,
                        selectedCategory === null && styles.selectedFilterTabText
                    ]}>
                        All
                    </Text>
                </TouchableOpacity>

                {POLL_CATEGORIES.map((category) => (
                    <TouchableOpacity
                        key={category.id}
                        style={[
                            styles.filterTab,
                            selectedCategory === category.id && styles.selectedFilterTab,
                            selectedCategory === category.id && { borderColor: category.color }
                        ]}
                        onPress={() => setSelectedCategory(
                            selectedCategory === category.id ? null : category.id
                        )}
                    >
                        <View style={[
                            styles.categoryTabIcon,
                            selectedCategory === category.id
                                ? { backgroundColor: category.color }
                                : { backgroundColor: 'transparent' }
                        ]}>
                            <Ionicons
                                name={category.icon as any}
                                size={16}
                                color={selectedCategory === category.id ? 'white' : category.color}
                            />
                        </View>
                        <Text style={[
                            styles.filterTabText,
                            selectedCategory === category.id && styles.selectedFilterTabText
                        ]}>
                            {category.label}
                        </Text>
                    </TouchableOpacity>
                ))}

                {(selectedCategory || searchQuery) && (
                    <TouchableOpacity
                        style={styles.clearFiltersTab}
                        onPress={clearFilters}
                    >
                        <Ionicons name="close-circle" size={18} color={colors.error} />
                        <Text style={styles.clearFiltersTabText}>Clear</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    );

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={styles.greetingContainer}>
                        <Text style={styles.greeting}>Hello, {user?.name || 'Voter'}!</Text>
                        <Text style={styles.subGreeting}>Ready to make your voice heard?</Text>
                    </View>
                </View>

                <View style={styles.searchContainer}>
                    <Animated.View style={[
                        styles.searchInputContainer,
                        {
                            borderColor: searchAnimation.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['rgba(255,255,255,0.3)', colors.primary]
                            })
                        }
                    ]}>
                        <Ionicons name="search" size={20} color="rgba(255,255,255,0.7)" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search polls..."
                            placeholderTextColor="rgba(255,255,255,0.6)"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onFocus={handleSearchFocus}
                            onBlur={handleSearchBlur}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.7)" />
                            </TouchableOpacity>
                        )}
                    </Animated.View>
                </View>
            </View>

            {renderFilterTabs()}

            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
            >
                {filteredPolls.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons
                            name={searchQuery || selectedCategory ? "search-outline" : "clipboard-outline"}
                            size={80}
                            color={colors.textLight}
                        />
                        <Text style={styles.emptyTitle}>
                            {searchQuery || selectedCategory ? 'No Polls Found' : 'No Polls Available'}
                        </Text>
                        <Text style={styles.emptyText}>
                            {searchQuery || selectedCategory
                                ? 'Try adjusting your search or filters'
                                : 'Be the first to create a poll and get the conversation started!'
                            }
                        </Text>
                        {(searchQuery || selectedCategory) && (
                            <TouchableOpacity style={styles.clearFiltersEmptyButton} onPress={clearFilters}>
                                <Text style={styles.clearFiltersEmptyText}>Clear Filters</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <View style={styles.pollsList}>
                        {filteredPolls.map((poll) => {
                            const voteStats = calculateVotePercentages(poll.id, poll);
                            const userVote = userVotes[poll.id];
                                const comments = pollComments[poll.id] || [];

                            return (
                                <PollCard
                                    key={poll.id}
                                    poll={poll}
                                    voteStats={voteStats}
                                    userVote={userVote}
                                    comments={comments}
                                    onVote={(optionId) => handleVote(poll.id, optionId)}
                                    onComment={(comment) => handleComment(poll.id, comment)}

                                />
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        backgroundColor: colors.primary,
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.xl,
        paddingBottom: theme.spacing.lg,
        borderBottomLeftRadius: theme.borderRadius.lg,
        borderBottomRightRadius: theme.borderRadius.lg,
    },
    headerTop: {
        marginBottom: theme.spacing.lg,
        marginTop: theme.spacing.lg,
    },
    greetingContainer: {
        marginBottom: theme.spacing.md,
    },
    greeting: {
        fontSize: theme.fontSize.xl,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: theme.spacing.xs,
    },
    subGreeting: {
        fontSize: theme.fontSize.md,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: theme.borderRadius.lg,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    searchInput: {
        flex: 1,
        marginLeft: theme.spacing.sm,
        fontSize: theme.fontSize.md,
        color: 'white',
    },
    filterTabsContainer: {
        backgroundColor: colors.background,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    filterTabsContent: {
        paddingHorizontal: theme.spacing.lg,
        gap: theme.spacing.sm,
    },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 2,
        borderColor: colors.border,
        marginRight: theme.spacing.sm,
        minHeight: 36,
    },
    selectedFilterTab: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    categoryTabIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.xs,
    },
    filterTabText: {
        fontSize: theme.fontSize.sm,
        fontWeight: '500',
        color: colors.textSecondary,
        paddingLeft: 10,
    },
    selectedFilterTabText: {
        color: colors.background,
        fontWeight: '600',
    },
    clearFiltersTab: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.error,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 2,
        borderColor: colors.error,
        marginLeft: theme.spacing.sm,
    },
    clearFiltersTabText: {
        fontSize: theme.fontSize.sm,
        fontWeight: '500',
        color: colors.background,
        marginLeft: theme.spacing.xs,
    },
    scrollView: {
        flex: 1,
    },
    pollsList: {
        padding: theme.spacing.md,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.xl,
        marginTop: theme.spacing.xl * 2,
    },
    emptyTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: '600',
        color: colors.text,
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.sm,
    },
    emptyText: {
        fontSize: theme.fontSize.md,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: theme.spacing.lg,
    },
    clearFiltersEmptyButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
    },
    clearFiltersEmptyText: {
        color: 'white',
        fontSize: theme.fontSize.md,
        fontWeight: '500',
    },
});

export default HomeScreen;