import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, increment } from 'firebase/firestore';
import { Poll } from '../types';
import { auth, firestore } from '../../config/firebase';

export const createPoll = async (pollData: Omit<Poll, 'id' | 'createdAt' | 'totalVotes'>) => {
    try {
        const docRef = await addDoc(collection(firestore, 'polls'), {
            ...pollData,
            createdAt: new Date(),
            totalVotes: 0,
        });

        const currentUser = auth.currentUser;
        if (currentUser) {
            const userDocRef = doc(firestore, 'users', currentUser.uid);

            await updateDoc(userDocRef, {
                pollsCreated: increment(1),
            });
        }

        return docRef.id;
    } catch (error) {
        throw error;
    }
};

export const getPolls = async (): Promise<Poll[]> => {
    try {
        const q = query(collection(firestore, 'polls'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt.toDate(),
        } as Poll));
    } catch (error) {
        throw error;
    }
};

export const updatePollVoteCount = async (pollId: string, increment: number) => {
    try {
        const pollRef = doc(firestore, 'polls', pollId);
        await updateDoc(pollRef, {
            totalVotes: increment,
        });
    } catch (error) {
        throw error;
    }
};