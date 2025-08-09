import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/styles/colors';

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="auto" backgroundColor={colors.primary} />
      <AppNavigator />
    </AuthProvider>
  );
}