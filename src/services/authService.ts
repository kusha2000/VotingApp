import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { auth, firestore } from '../../config/firebase';
import { doc, setDoc } from 'firebase/firestore';

export const signUp = async (email: string, password: string, displayName?: string) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (displayName && user) {
            await updateProfile(user, { displayName });
        }

        if (user) {
            const userDocRef = doc(firestore, 'users', user.uid);
            await setDoc(userDocRef, {
                name: displayName || '',
                email: user.email,
                userID: user.uid,
                profilePic: user.photoURL || '',
                pollsCreated: 0,
                pollsVoted: 0,
                createdAt: new Date().toISOString(),
            });
        }

        return user;
    } catch (error) {
        throw error;
    }
};

export const signIn = async (email: string, password: string) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        throw error;
    }
};

export const logOut = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        throw error;
    }
};