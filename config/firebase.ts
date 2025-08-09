
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: "AIzaSyChZ9xnWeBsyInRUBF_lYwbGiLnOvYHpXI",
    authDomain: "voting-app-2b57e.firebaseapp.com",
    projectId: "voting-app-2b57e",
    storageBucket: "voting-app-2b57e.firebasestorage.app",
    messagingSenderId: "423372420794",
    appId: "1:423372420794:web:e22f9edfd5a001126d3483"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export const firestore = getFirestore(app);
export const realtimeDb = getDatabase(app);