import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import JitsiMeet, { JitsiMeetView } from '@jitsi/react-native-sdk';
import colors from '../../../mobile-shared/constants/colors';

const VideoCallScreen = ({ route, navigation }) => {
  const { interviewId, jobId, workforceId, companyName, positionTitle } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [roomName, setRoomName] = useState('');
  const [callEnded, setCallEnded] = useState(false);

  useEffect(() => {
    // Generate a unique room name based on interview details
    const room = `hrbank-interview-${interviewId || `${jobId}-${workforceId}`}`;
    setRoomName(room);
    setLoading(false);
  }, [interviewId, jobId, workforceId]);

  const handleConferenceTerminated = (event) => {
    console.log('Conference terminated:', event);
    setCallEnded(true);
    
    // Show a brief message before navigating back
    setTimeout(() => {
      navigation.goBack();
    }, 2000);
  };

  const handleConferenceJoined = (event) => {
    console.log('Conference joined:', event);
  };

  const handleParticipantJoined = (event) => {
    console.log('Participant joined:', event);
  };

  const handleParticipantLeft = (event) => {
    console.log('Participant left:', event);
  };

  const handleEndCall = () => {
    Alert.alert(
      'End Call',
      'Are you sure you want to end this video interview?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Call',
          style: 'destructive',
          onPress: () => {
            JitsiMeet.endCall();
            navigation.goBack();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.workforce.primary} />
          <Text style={styles.loadingText}>Preparing video call...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (callEnded) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.endedContainer}>
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          <Text style={styles.endedTitle}>Call Ended</Text>
          <Text style={styles.endedText}>Thank you for attending the interview</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{companyName || 'HR Bank'}</Text>
          <Text style={styles.headerSubtitle}>
            {positionTitle || 'Video Interview'}
          </Text>
        </View>
        <TouchableOpacity style={styles.endButton} onPress={handleEndCall}>
          <Ionicons name="call" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <JitsiMeetView
        style={styles.jitsiView}
        room={roomName}
        serverURL="https://meet.jit.si"
        config={{
          subject: `Interview: ${positionTitle || 'Position'}`,
          hideConferenceSubject: false,
          hideConferenceTimer: false,
          hideEmailInSettings: true,
          disableInviteFunctions: true,
          toolbarButtons: [
            'camera',
            'chat',
            'closedcaptions',
            'desktop',
            'download',
            'embedmeeting',
            'etherpad',
            'feedback',
            'filmstrip',
            'fullscreen',
            'hangup',
            'help',
            'highlight',
            'invite',
            'linktosalesforce',
            'livestreaming',
            'microphone',
            'mute-everyone',
            'mute-video-everyone',
            'participants-pane',
            'profile',
            'raisehand',
            'recording',
            'security',
            'select-background',
            'settings',
            'shareaudio',
            'sharedvideo',
            'shortcuts',
            'stats',
            'tileview',
            'toggle-camera',
            'videoquality',
            '__end',
          ],
        }}
        featureFlags={{
          'add-people.enabled': false,
          'calendar.enabled': false,
          'call-integration.enabled': false,
          'chat.enabled': true,
          'filmstrip.enabled': true,
          'invite.enabled': false,
          'ios.recording.enabled': false,
          'live-streaming.enabled': false,
          'meeting-name.enabled': true,
          'meeting-password.enabled': false,
          'pip.enabled': true,
          'raise-hand.enabled': true,
          'recording.enabled': false,
          'tile-view.enabled': true,
          'toolbox.alwaysVisible': false,
          'video-share.enabled': false,
          'welcomepage.enabled': false,
        }}
        userInfo={{
          displayName: 'Workforce User',
          email: '',
          avatar: '',
        }}
        onConferenceTerminated={handleConferenceTerminated}
        onConferenceJoined={handleConferenceJoined}
        onParticipantJoined={handleParticipantJoined}
        onParticipantLeft={handleParticipantLeft}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.8,
    marginTop: 2,
  },
  endButton: {
    backgroundColor: colors.error,
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jitsiView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.workforce.textLight,
  },
  endedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  endedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.workforce.text,
    marginTop: 16,
  },
  endedText: {
    fontSize: 16,
    color: colors.workforce.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default VideoCallScreen;
