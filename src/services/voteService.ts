import { ref, set, get, push, onValue, off, update } from 'firebase/database';
import { realtimeDb } from '../../config/firebase';
import { Vote, VoteData } from '../types';

export const castVote = async (vote: Omit<Vote, 'timestamp'> & { userName?: string; userAvatar?: string | null }) => {
    try {
        const voteRef = ref(realtimeDb, `votes/${vote.pollId}/${vote.optionId}/${vote.userId}`);
        await set(voteRef, {
            pollId: vote.pollId,
            optionId: vote.optionId,
            userId: vote.userId,
            userName: vote.userName || 'Anonymous',
            userAvatar: vote.userAvatar, 
            timestamp: Date.now(),
        });
    } catch (error) {
        throw error;
    }
};

export const getUserVote = async (pollId: string, userId: string): Promise<string | null> => {
    try {
        const votesRef = ref(realtimeDb, `votes/${pollId}`);
        const snapshot = await get(votesRef);
        if (snapshot.exists()) {
            const votes = snapshot.val();
            for (const optionId in votes) {
                if (votes[optionId][userId]) {
                    return optionId;
                }
            }
        }
        return null;
    } catch (error) {
        throw error;
    }
};

export const updateUserProfileInVotes = async (userId: string, updates: { userName?: string; userAvatar?: string }) => {
    try {
        const votesRef = ref(realtimeDb, 'votes');
        const snapshot = await get(votesRef);
        
        if (snapshot.exists()) {
            const allVotes = snapshot.val();
            const updatePromises: Promise<void>[] = [];
            
            Object.keys(allVotes).forEach(pollId => {
                const pollVotes = allVotes[pollId];
                
                Object.keys(pollVotes).forEach(optionId => {
                    const optionVotes = pollVotes[optionId];
                    
                    if (optionVotes[userId]) {
                        const userVoteRef = ref(realtimeDb, `votes/${pollId}/${optionId}/${userId}`);
                        const updateData: any = {};
                        
                        if (updates.userName !== undefined) {
                            updateData.userName = updates.userName;
                        }
                        if (updates.userAvatar !== undefined) {
                            updateData.userAvatar = updates.userAvatar;
                        }
                        
                        updatePromises.push(update(userVoteRef, updateData));
                    }
                });
            });
            
            await Promise.all(updatePromises);
            console.log(`Updated ${updatePromises.length} vote records for user ${userId}`);
        }
    } catch (error) {
        console.error('Error updating user profile in votes:', error);
        throw error;
    }
};

export const subscribeToVotes = (pollId: string, callback: (votes: any) => void) => {
    const votesRef = ref(realtimeDb, `votes/${pollId}`);
    onValue(votesRef, callback);
    return () => off(votesRef);
};