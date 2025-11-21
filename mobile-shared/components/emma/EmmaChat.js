import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import emmaService from '../../services/emma.service';
import colors from '../../constants/colors';
import { EMMA_CONFIG } from '../../constants/config';

const EmmaChat = ({ visible, onClose, initialMessages = [] }) => {
  const [messages, setMessages] = useState(initialMessages);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (visible && messages.length === 0) {
      loadConversation();
    }
  }, [visible]);

  const loadConversation = async () => {
    setLoading(true);
    try {
      const result = await emmaService.getConversation();
      if (result.success && result.data.messages) {
        setMessages(result.data.messages);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setSendingMessage(true);

    try {
      const result = await emmaService.sendMessage(inputText.trim());
      
      if (result.success && result.data.reply) {
        const emmaMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.data.reply,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, emmaMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: EMMA_CONFIG.FILE_TYPES,
        copyToCacheDirectory: true,
      });

      if (result.type === 'success') {
        // Check file size
        if (result.size > EMMA_CONFIG.MAX_FILE_SIZE) {
          Alert.alert('File Too Large', 'Please select a file smaller than 10MB');
          return;
        }

        setSendingMessage(true);

        const parseResult = await emmaService.parseResume({
          uri: result.uri,
          name: result.name,
          type: result.mimeType,
        });

        if (parseResult.success) {
          const emmaMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: 'I've successfully parsed your resume! Here's what I found...',
            timestamp: new Date().toISOString(),
            data: parseResult.data,
          };
          setMessages((prev) => [...prev, emmaMessage]);
          Alert.alert('Success', 'Resume parsed successfully!');
        } else {
          Alert.alert('Error', parseResult.message || 'Failed to parse resume');
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      Alert.alert('Error', 'Failed to upload file');
    } finally {
      setSendingMessage(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.emmaMessage]}>
        {!isUser && (
          <Image
            source={{ uri: EMMA_CONFIG.AVATAR_URL }}
            style={styles.emmaAvatar}
          />
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.emmaBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.emmaText]}>
            {item.content}
          </Text>
          <Text style={[styles.timestamp, isUser && styles.userTimestamp]}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={{ uri: EMMA_CONFIG.AVATAR_URL }}
              style={styles.headerAvatar}
            />
            <View>
              <Text style={styles.headerTitle}>Emma</Text>
              <Text style={styles.headerSubtitle}>Your HR Bank Assistant</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={colors.workforce.text} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.chatContainer}
          keyboardVerticalOffset={0}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.workforce.primary} />
              <Text style={styles.loadingText}>Loading conversation...</Text>
            </View>
          ) : (
            <>
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messagesList}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                onLayout={() => flatListRef.current?.scrollToEnd()}
              />

              {sendingMessage && (
                <View style={styles.typingIndicator}>
                  <Image
                    source={{ uri: EMMA_CONFIG.AVATAR_URL }}
                    style={styles.typingAvatar}
                  />
                  <View style={styles.typingBubble}>
                    <View style={styles.typingDots}>
                      <View style={[styles.dot, styles.dot1]} />
                      <View style={[styles.dot, styles.dot2]} />
                      <View style={[styles.dot, styles.dot3]} />
                    </View>
                  </View>
                </View>
              )}
            </>
          )}

          {/* Input */}
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.attachButton}
              onPress={handleFileUpload}
              disabled={sendingMessage}
            >
              <Ionicons name="attach-outline" size={24} color={colors.workforce.primary} />
            </TouchableOpacity>
            
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your message..."
              placeholderTextColor={colors.workforce.textMuted}
              multiline
              maxLength={EMMA_CONFIG.MAX_MESSAGE_LENGTH}
              editable={!sendingMessage}
            />
            
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || sendingMessage) && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || sendingMessage}
            >
              <Ionicons
                name="send"
                size={20}
                color={inputText.trim() && !sendingMessage ? colors.white : colors.workforce.textMuted}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.workforce.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.workforce.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.workforce.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.workforce.textLight,
  },
  closeButton: {
    padding: 4,
  },
  chatContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.workforce.textLight,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  emmaMessage: {
    justifyContent: 'flex-start',
  },
  emmaAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: 12,
  },
  userBubble: {
    backgroundColor: colors.emma.userBubble,
    borderBottomRightRadius: 4,
  },
  emmaBubble: {
    backgroundColor: colors.emma.emmaBubble,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: colors.emma.userText,
  },
  emmaText: {
    color: colors.emma.emmaText,
  },
  timestamp: {
    fontSize: 11,
    color: colors.workforce.textMuted,
    marginTop: 4,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  typingIndicator: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  typingAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  typingBubble: {
    backgroundColor: colors.emma.emmaBubble,
    borderRadius: 16,
    padding: 12,
    borderBottomLeftRadius: 4,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.workforce.textMuted,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.workforce.border,
    gap: 8,
  },
  attachButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.workforce.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    color: colors.workforce.text,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.workforce.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.workforce.background,
  },
});

export default EmmaChat;
