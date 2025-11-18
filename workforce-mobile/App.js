import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { LocationProvider } from './src/context/LocationContext';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'react-native';

export default function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <NavigationContainer>
          <StatusBar barStyle="light-content" backgroundColor="#30496d" />
          <AppNavigator />
        </NavigationContainer>
      </LocationProvider>
    </AuthProvider>
  );
}
