import React, { useState } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Image,
  View,
  Text,
} from 'react-native';
import EmmaChat from './EmmaChat';
import colors from '../../constants/colors';
import { EMMA_CONFIG } from '../../constants/config';

const EmmaFloatingButton = ({ showNotification = false, notificationText = '' }) => {
  const [chatVisible, setChatVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setChatVisible(true)}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: EMMA_CONFIG.AVATAR_URL }}
          style={styles.avatar}
        />
        {showNotification && (
          <View style={styles.notificationBadge}>
            <View style={styles.notificationDot} />
          </View>
        )}
      </TouchableOpacity>

      <EmmaChat
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
  },
});

export default EmmaFloatingButton;
