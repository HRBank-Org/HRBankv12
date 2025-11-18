import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/config';

// Import screens
import DashboardScreen from '../screens/DashboardScreen';
import ShiftsScreen from '../screens/shifts/ShiftsScreen';
import ShiftDetailsScreen from '../screens/shifts/ShiftDetailsScreen';
import ClockInOutScreen from '../screens/attendance/ClockInOutScreen';
import TimesheetsScreen from '../screens/timesheets/TimesheetsScreen';
import DocumentsScreen from '../screens/documents/DocumentsScreen';
import UploadDocumentScreen from '../screens/documents/UploadDocumentScreen';
import AvailabilityScreen from '../screens/availability/AvailabilityScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Home Stack
const HomeStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: COLORS.primary },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' },
    }}
  >
    <Stack.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{ title: 'HR Bank' }}
    />
    <Stack.Screen
      name="ClockInOut"
      component={ClockInOutScreen}
      options={{ title: 'Clock In/Out' }}
    />
  </Stack.Navigator>
);

// Shifts Stack
const ShiftsStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: COLORS.primary },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' },
    }}
  >
    <Stack.Screen
      name="ShiftsList"
      component={ShiftsScreen}
      options={{ title: 'Available Shifts' }}
    />
    <Stack.Screen
      name="ShiftDetails"
      component={ShiftDetailsScreen}
      options={{ title: 'Shift Details' }}
    />
  </Stack.Navigator>
);

// Profile Stack
const ProfileStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: COLORS.primary },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' },
    }}
  >
    <Stack.Screen
      name="ProfileMain"
      component={ProfileScreen}
      options={{ title: 'Profile' }}
    />
    <Stack.Screen
      name="EditProfile"
      component={EditProfileScreen}
      options={{ title: 'Edit Profile' }}
    />
    <Stack.Screen
      name="Documents"
      component={DocumentsScreen}
      options={{ title: 'My Documents' }}
    />
    <Stack.Screen
      name="UploadDocument"
      component={UploadDocumentScreen}
      options={{ title: 'Upload Document' }}
    />
    <Stack.Screen
      name="Timesheets"
      component={TimesheetsScreen}
      options={{ title: 'Timesheets' }}
    />
    <Stack.Screen
      name="Availability"
      component={AvailabilityScreen}
      options={{ title: 'My Availability' }}
    />
  </Stack.Navigator>
);

const MainNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Shifts') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Shifts" component={ShiftsStack} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
};

export default MainNavigator;
