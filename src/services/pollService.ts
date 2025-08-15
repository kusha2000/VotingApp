import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, increment, serverTimestamp } from 'firebase/firestore';
import { Poll } from '../types';
import { auth, firestore } from '../../config/firebase';
import { realtimeDb } from '../../config/firebase';
import { get, push, ref, set } from 'firebase/database';

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


export const addComment = async (pollId: String, userId: String, comment: String) => {
    // const commentsRef = collection(realtimeDb, `polls/${pollId}/comments`);
    // await addDoc(commentsRef, {
    //     userId,
    //     comment,
    //     createdAt: serverTimestamp(),
    // });

    const commentsRef = ref(realtimeDb, `polls/${pollId}/comments`);
    await push(commentsRef, {
        userId: userId,
        comment: comment || 'no',
        createdAt: Date.now(),
    });
    console.log("Submitted");

}

export const getComments = async (pollId: string) => {
    try {
        const commentsRef = ref(realtimeDb, `polls/${pollId}/comments`);
        const snapshot = await get(commentsRef);

        if (snapshot.exists()) {
            const commentsData = snapshot.val();
            // Convert object {commentId: {...}} → array
            return Object.entries(commentsData).map(([commentId, data]: [string, any]) => ({
                id: commentId,
                ...data
            }));
        }
        return [];
    } catch (error) {
        console.error("Error fetching comments:", error);
        throw error;
    }
};


// export const getComments = async (pollId: String) => {
//     const q = query(collection(realtimeDb, `polls/${pollId}/comments`), orderBy('createdAt', 'desc'));
//     const querySnapshot = await getDocs(q);
//     const snapshot = await getDocs(q);
//     return querySnapshot.docs.map(doc => ({
//         id: doc.id,
//         ...doc.data(),
//     }));
// } 