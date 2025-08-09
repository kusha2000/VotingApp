import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import SplashScreen from '../components/SplashScreen';

const AppNavigator: React.FC = () => {
    const { user, loading } = useAuth();
    const [showSplash, setShowSplash] = useState(true);

    useEffect(() => {
        if (!loading) {
            const timer = setTimeout(() => {
                setShowSplash(false);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [loading]);

    const handleSplashFinish = () => {
        if (!loading) {
            setShowSplash(false);
        }
    };

    if (loading || showSplash) {
        return <SplashScreen onFinish={handleSplashFinish} />;
    }

    return (
        <NavigationContainer>
            {user ? <MainTabs /> : <AuthStack />}
        </NavigationContainer>
    );
};

export default AppNavigator;