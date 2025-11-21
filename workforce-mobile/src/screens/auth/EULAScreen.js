import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../../mobile-shared/components/common/Button';
import colors from '../../../mobile-shared/constants/colors';
import api from '../../../mobile-shared/services/api';
import storage from '../../../mobile-shared/utils/storage';

const EULAScreen = ({ navigation, route }) => {
  const scrollViewRef = useRef(null);
  const [eulaContent, setEulaContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  React.useEffect(() => {
    fetchEULA();
  }, []);

  const fetchEULA = async () => {
    try {
      const response = await api.get('/eula/check');
      
      if (response.data.success) {
        if (response.data.data.accepted) {
          // Already accepted, navigate to main app
          // This will be handled by navigation
        } else {
          setEulaContent(response.data.data.content);
        }
      }
    } catch (error) {
      console.error('Error fetching EULA:', error);
      Alert.alert('Error', 'Could not load terms. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = ({ nativeEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const paddingToBottom = 20;
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

    if (isCloseToBottom && !scrolledToBottom) {
      setScrolledToBottom(true);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);

    try {
      const response = await api.post('/eula/accept');
      
      if (response.data.success) {
        await storage.saveEULAAcceptance(true);
        
        // Navigate will be handled by App navigator
        // This is just to clear the EULA screen
        if (route.params?.onAccept) {
          route.params.onAccept();
        }
      } else {
        Alert.alert('Error', 'Could not accept terms. Please try again.');
      }
    } catch (error) {
      console.error('Error accepting EULA:', error);
      Alert.alert('Error', 'Could not accept terms. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      'Terms Required',
      'You must accept the Terms of Service to use HR Bank.',
      [
        { text: 'Review Again', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => {
            // Log out user
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.workforce.primary} />
        <Text style={styles.loadingText}>Loading Terms...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.subtitle}>Please read and accept to continue</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <Text style={styles.eulaText}>{eulaContent}</Text>
      </ScrollView>

      {!scrolledToBottom && (
        <View style={styles.scrollIndicator}>
          <Text style={styles.scrollIndicatorText}>
            ↓ Please scroll to the bottom to continue
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Button
          title="Accept"
          onPress={handleAccept}
          loading={accepting}
          disabled={!scrolledToBottom}
          style={styles.acceptButton}
        />
        <Button
          title="Decline"
          onPress={handleDecline}
          variant="outline"
          disabled={accepting}
          style={styles.declineButton}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.workforce.textLight,
  },
  header: {
    padding: 20,
    backgroundColor: colors.workforce.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  eulaText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.workforce.text,
  },
  scrollIndicator: {
    padding: 12,
    backgroundColor: colors.workforce.primaryLight,
    alignItems: 'center',
  },
  scrollIndicatorText: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.workforce.border,
    backgroundColor: colors.white,
  },
  acceptButton: {
    marginBottom: 12,
  },
  declineButton: {
    backgroundColor: colors.white,
  },
});

export default EULAScreen;
