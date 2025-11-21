import React, { useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../../mobile-shared/contexts/AuthContext';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import EULAScreen from '../screens/auth/EULAScreen';
import VideoCallScreen from '../screens/video/VideoCallScreen';
import api from '../../mobile-shared/services/api';
import { View, ActivityIndicator } from 'react-native';
import colors from '../../mobile-shared/constants/colors';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [eulaAccepted, setEulaAccepted] = useState(null);
  const [checkingEula, setCheckingEula] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      checkEULAStatus();
    } else {
      setCheckingEula(false);
      setEulaAccepted(null);
    }
  }, [isAuthenticated]);

  const checkEULAStatus = async () => {
    try {
      const response = await api.get('/eula/check');
      if (response.data.success) {
        setEulaAccepted(response.data.data.accepted);
      }
    } catch (error) {
      console.error('Error checking EULA status:', error);
      // If error, assume not accepted to be safe
      setEulaAccepted(false);
    } finally {
      setCheckingEula(false);
    }
  };

  const handleEulaAccept = () => {
    setEulaAccepted(true);
  };

  // Show loading while checking auth and EULA status
  if (authLoading || (isAuthenticated && checkingEula)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.workforce.background }}>
        <ActivityIndicator size="large" color={colors.workforce.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : eulaAccepted === false ? (
        <Stack.Screen
          name="EULA"
          component={EULAScreen}
          initialParams={{ onAccept: handleEulaAccept }}
        />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainNavigator} />
          <Stack.Screen
            name="VideoCall"
            component={VideoCallScreen}
            options={{
              presentation: 'fullScreenModal',
              headerShown: false,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
