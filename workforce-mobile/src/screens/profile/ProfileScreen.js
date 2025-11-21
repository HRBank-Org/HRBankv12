import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../mobile-shared/contexts/AuthContext';
import usersService from '../../../mobile-shared/services/users.service';
import Card from '../../../mobile-shared/components/common/Card';
import Badge from '../../../mobile-shared/components/common/Badge';
import colors from '../../../mobile-shared/constants/colors';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [occupations, setOccupations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const [profileResult, occupationsResult] = await Promise.all([
        usersService.getWorkforceProfile(),
        usersService.getOccupationProfiles(),
      ]);

      if (profileResult.success) {
        setProfile(profileResult.data);
      }
      if (occupationsResult.success) {
        setOccupations(occupationsResult.data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfileData();
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const menuItems = [
    {
      id: 'documents',
      title: 'My Documents',
      icon: 'document-text-outline',
      onPress: () => Alert.alert('Coming Soon', 'Documents feature is under development'),
    },
    {
      id: 'certifications',
      title: 'Certifications',
      icon: 'medal-outline',
      onPress: () => Alert.alert('Coming Soon', 'Certifications feature is under development'),
    },
    {
      id: 'employment',
      title: 'Employment History',
      icon: 'briefcase-outline',
      onPress: () => Alert.alert('Coming Soon', 'Employment history feature is under development'),
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: 'settings-outline',
      onPress: () => Alert.alert('Coming Soon', 'Settings feature is under development'),
    },
    {
      id: 'logout',
      title: 'Logout',
      icon: 'log-out-outline',
      color: colors.error,
      onPress: handleLogout,
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.workforce.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.full_name?.charAt(0).toUpperCase() || 'W'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.full_name || 'Worker'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <Badge label="Workforce Member" variant="info" style={styles.roleBadge} />
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.rating_avg?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.completed_jobs_count || 0}</Text>
            <Text style={styles.statLabel}>Jobs Done</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{occupations.length}</Text>
            <Text style={styles.statLabel}>Occupations</Text>
          </View>
        </View>

        {/* Profile Info */}
        <Card style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color={colors.workforce.textLight} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{user?.full_name || 'Not set'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color={colors.workforce.textLight} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color={colors.workforce.textLight} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{profile?.phone || 'Not set'}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.workforce.primary} />
          </TouchableOpacity>
        </Card>

        {/* Occupations */}
        {occupations.length > 0 && (
          <Card style={styles.occupationsCard}>
            <Text style={styles.sectionTitle}>My Occupations</Text>
            {occupations.map((occupation) => (
              <View key={occupation.occupation_id} style={styles.occupationItem}>
                <View style={styles.occupationIcon}>
                  <Ionicons name="briefcase" size={20} color={colors.workforce.primary} />
                </View>
                <View style={styles.occupationContent}>
                  <Text style={styles.occupationTitle}>{occupation.occupation_title}</Text>
                  <Text style={styles.occupationCategory}>{occupation.occupation_category}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.workforce.textMuted} />
              </View>
            ))}
          </Card>
        )}

        {/* Skills */}
        {profile?.skills && profile.skills.length > 0 && (
          <Card style={styles.skillsCard}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsContainer}>
              {profile.skills.map((skill, index) => (
                <Badge key={index} label={skill} variant="info" size="medium" />
              ))}
            </View>
          </Card>
        )}

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons
                  name={item.icon}
                  size={24}
                  color={item.color || colors.workforce.text}
                />
                <Text style={[styles.menuItemText, item.color && { color: item.color }]}>
                  {item.title}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.workforce.textMuted}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* App Version */}
        <Text style={styles.appVersion}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.workforce.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.workforce.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.workforce.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.workforce.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.white,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.workforce.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.workforce.textLight,
    marginBottom: 8,
  },
  roleBadge: {
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.workforce.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.workforce.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.workforce.textLight,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.workforce.border,
  },
  infoCard: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.workforce.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.workforce.border,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.workforce.textLight,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: colors.workforce.text,
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingVertical: 12,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.workforce.primary,
  },
  occupationsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  occupationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.workforce.border,
  },
  occupationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.workforce.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  occupationContent: {
    flex: 1,
  },
  occupationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.workforce.text,
    marginBottom: 2,
  },
  occupationCategory: {
    fontSize: 14,
    color: colors.workforce.textLight,
  },
  skillsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  menuSection: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.workforce.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.workforce.text,
  },
  appVersion: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.workforce.textMuted,
    marginTop: 8,
  },
});

export default ProfileScreen;
