import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../mobile-shared/contexts/AuthContext';
import Button from '../../../mobile-shared/components/common/Button';
import Input from '../../../mobile-shared/components/common/Input';
import colors from '../../../mobile-shared/constants/colors';

const SignupScreen = ({ navigation }) => {
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Full name validation
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    // Phone validation
    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/[^\d]/g, ''))) {
      newErrors.phone = 'Phone number must be 10 digits';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const signupData = {
        full_name: formData.full_name.trim(),
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone.replace(/[^\d]/g, ''),
        password: formData.password,
      };

      const result = await signup(signupData);

      if (result.success) {
        Alert.alert(
          'Success!',
          'Account created successfully. Please check your email to verify your account.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      } else {
        Alert.alert('Signup Failed', result.message || 'Could not create account');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join HR Bank as a workforce member</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Full Name"
              value={formData.full_name}
              onChangeText={(text) => handleInputChange('full_name', text)}
              placeholder="Enter your full name"
              leftIcon="person-outline"
              error={errors.full_name}
            />

            <Input
              label="Email"
              value={formData.email}
              onChangeText={(text) => handleInputChange('email', text)}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail-outline"
              error={errors.email}
            />

            <Input
              label="Phone Number"
              value={formData.phone}
              onChangeText={(text) => handleInputChange('phone', text)}
              placeholder="(123) 456-7890"
              keyboardType="phone-pad"
              leftIcon="call-outline"
              error={errors.phone}
            />

            <Input
              label="Password"
              value={formData.password}
              onChangeText={(text) => handleInputChange('password', text)}
              placeholder="Create a password"
              secureTextEntry
              leftIcon="lock-closed-outline"
              error={errors.password}
            />

            <Input
              label="Confirm Password"
              value={formData.confirmPassword}
              onChangeText={(text) => handleInputChange('confirmPassword', text)}
              placeholder="Confirm your password"
              secureTextEntry
              leftIcon="lock-closed-outline"
              error={errors.confirmPassword}
            />

            <Button
              title="Create Account"
              onPress={handleSignup}
              loading={loading}
              size="large"
              style={styles.signupButton}
            />

            <Text style={styles.termsText}>
              By signing up, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>

          {/* Login Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.workforce.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.workforce.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.workforce.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.workforce.textLight,
  },
  form: {
    marginBottom: 24,
  },
  signupButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  termsText: {
    fontSize: 12,
    color: colors.workforce.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: colors.workforce.textLight,
  },
  loginLink: {
    fontSize: 14,
    color: colors.workforce.primary,
    fontWeight: '600',
  },
});

export default SignupScreen;
