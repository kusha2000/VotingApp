import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, firestore } from '../../config/firebase';
import { User } from '../types';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    refreshUser: async () => { },
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUserData = useCallback(async (firebaseUser: any) => {
        try {
            const userDocRef = doc(firestore, 'users', firebaseUser.uid);
            const userSnap = await getDoc(userDocRef);

            if (userSnap.exists()) {
                const userData = userSnap.data();
                const userObject = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    name: userData.name || firebaseUser.displayName || '',
                    profilePic: userData.profilePic || firebaseUser.photoURL || '',
                    age: userData.age || '',
                    address: userData.address || '',
                    pollsCreated: userData.pollsCreated || 0,
                    pollsVoted: userData.pollsVoted || 0,
                };
                setUser(userObject);
            } else {
                const userObject = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    age: '',
                    address: '',
                    name: firebaseUser.displayName || '',
                    profilePic: firebaseUser.photoURL || '',
                    pollsCreated: 0,
                    pollsVoted: 0,
                };
                setUser(userObject);
            }
        } catch (err) {
            console.error("Error fetching user data:", err);
            setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                age: '',
                address: '',
                name: firebaseUser.displayName || '',
                profilePic: firebaseUser.photoURL || '',
                pollsCreated: 0,
                pollsVoted: 0,
            });
        }
    }, []);

    const refreshUser = useCallback(async () => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            await fetchUserData(currentUser);
        }
    }, [fetchUserData]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                await fetchUserData(firebaseUser);
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [fetchUserData]);

    return (
        <AuthContext.Provider value={{ user, loading, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};