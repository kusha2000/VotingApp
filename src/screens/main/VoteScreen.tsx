import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { getPolls } from '../../services/pollService';
import { getUserVote, subscribeToVotes } from '../../services/voteService';
import { Poll, Voter } from '../../types';
import PollCard from '../../components/PollCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors, theme } from '../../styles/colors';

const VoteScreen: React.FC = () => {
    const { user } = useAuth();
    const [polls, setPolls] = useState<Poll[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userVotes, setUserVotes] = useState<{ [pollId: string]: string }>({});
    const [voteData, setVoteData] = useState<{ [pollId: string]: any }>({});
    const [filter, setFilter] = useState<'all' | 'voted' | 'unvoted'>('all');

    const fetchPolls = async () => {
        try {
            const pollsData = await getPolls();
            setPolls(pollsData);

            if (user) {
                const votes: { [pollId: string]: string } = {};
                for (const poll of pollsData) {
                    const userVote = await getUserVote(poll.id, user.uid);
                    if (userVote) {
                        votes[poll.id] = userVote;
                    }
                }
                setUserVotes(votes);
            }
        } catch (error) {
            console.error('Error fetching polls:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchPolls();
        setRefreshing(false);
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
        const optionVoters: { [optionId: string]: Voter[] } = {};
        let totalVotes = 0;

        Object.keys(votes).forEach(optionId => {
            const optionVoteData = votes[optionId];
            if (optionVoteData && typeof optionVoteData === 'object') {
                const votersArray: Voter[] = Object.entries(optionVoteData).map(([userId, voteData]: [string, any]) => {
                    const userName = voteData.userName || voteData.name || 'Anonymous';
                    const userAvatar = voteData.userAvatar || voteData.profilePic;

                    let avatarUri;
                    if (userAvatar && userAvatar.trim() !== '') {
                        if (userAvatar.startsWith('data:image/')) {
                            avatarUri = userAvatar;
                        }
                        else if (userAvatar.match(/^[A-Za-z0-9+/=]+$/)) {
                            avatarUri = `data:image/jpeg;base64,${userAvatar}`;
                        }
                        else {
                            avatarUri = userAvatar;
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

    const getFilteredPolls = () => {
        switch (filter) {
            case 'voted':
                return polls.filter(poll => userVotes[poll.id]);
            case 'unvoted':
                return polls.filter(poll => !userVotes[poll.id]);
            default:
                return polls;
        }
    };

    const getFilterStats = () => {
        const voted = polls.filter(poll => userVotes[poll.id]).length;
        const unvoted = polls.length - voted;
        return { voted, unvoted, total: polls.length };
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    const filteredPolls = getFilteredPolls();
    const stats = getFilterStats();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Your Votes</Text>
                <Text style={styles.subtitle}>
                    {stats.voted} voted • {stats.unvoted} pending
                </Text>
            </View>

            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={[
                        styles.filterButton,
                        filter === 'all' && styles.activeFilterButton
                    ]}
                    onPress={() => setFilter('all')}
                >
                    <Text style={[
                        styles.filterText,
                        filter === 'all' && styles.activeFilterText
                    ]}>
                        All ({stats.total})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.filterButton,
                        filter === 'unvoted' && styles.activeFilterButton
                    ]}
                    onPress={() => setFilter('unvoted')}
                >
                    <Text style={[
                        styles.filterText,
                        filter === 'unvoted' && styles.activeFilterText
                    ]}>
                        Pending ({stats.unvoted})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.filterButton,
                        filter === 'voted' && styles.activeFilterButton
                    ]}
                    onPress={() => setFilter('voted')}
                >
                    <Text style={[
                        styles.filterText,
                        filter === 'voted' && styles.activeFilterText
                    ]}>
                        Voted ({stats.voted})
                    </Text>
                </TouchableOpacity>
            </View>

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
                            name={filter === 'voted' ? 'checkmark-done-outline' :
                                filter === 'unvoted' ? 'time-outline' :
                                    'list-outline'}
                            size={80}
                            color={colors.textLight}
                        />
                        <Text style={styles.emptyTitle}>
                            {filter === 'voted' ? 'No Votes Yet' :
                                filter === 'unvoted' ? 'All Caught Up!' :
                                    'No Polls Available'}
                        </Text>
                        <Text style={styles.emptyText}>
                            {filter === 'voted' ? 'You haven\'t voted on any polls yet. Check out the available polls!' :
                                filter === 'unvoted' ? 'You\'ve voted on all available polls. Great job!' :
                                    'No polls are available right now. Create one to get started!'}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.pollsList}>
                        {filteredPolls.map((poll) => {
                            const voteStats = calculateVotePercentages(poll.id, poll);
                            const userVote = userVotes[poll.id];

                            return (
                                <PollCard
                                    key={poll.id}
                                    poll={poll}
                                    voteStats={voteStats}
                                    userVote={userVote}
                                    onVote={() => { }}
                                    onComment={() => { }}
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
        padding: theme.spacing.lg,
        paddingTop: 60,
        borderBottomLeftRadius: theme.borderRadius.lg,
        borderBottomRightRadius: theme.borderRadius.lg,
    },
    title: {
        fontSize: theme.fontSize.xl,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        fontSize: theme.fontSize.md,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    filterContainer: {
        flexDirection: 'row',
        padding: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    filterButton: {
        flex: 1,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: colors.surface,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
    },
    activeFilterButton: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterText: {
        fontSize: theme.fontSize.sm,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    activeFilterText: {
        color: 'white',
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
    },
});

export default VoteScreen;