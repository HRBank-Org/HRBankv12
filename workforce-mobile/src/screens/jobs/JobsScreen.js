import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import jobsService from '../../../mobile-shared/services/jobs.service';
import usersService from '../../../mobile-shared/services/users.service';
import Card from '../../../mobile-shared/components/common/Card';
import Badge from '../../../mobile-shared/components/common/Badge';
import colors from '../../../mobile-shared/constants/colors';

const JobsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('matched'); // matched, offers, interviews
  const [matchedJobs, setMatchedJobs] = useState([]);
  const [jobOffers, setJobOffers] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [userCertifications, setUserCertifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [matchedResult, offersResult, interviewsResult, occupationsResult] = await Promise.all([
        jobsService.getMatchedJobs(),
        jobsService.getJobOffers(),
        jobsService.getInterviews(),
        usersService.getOccupationProfiles(),
      ]);

      if (matchedResult.success) {
        setMatchedJobs(matchedResult.data);
      }
      if (offersResult.success) {
        setJobOffers(offersResult.data);
      }
      if (interviewsResult.success) {
        setInterviews(interviewsResult.data);
      }
      if (occupationsResult.success) {
        // Extract all verified certifications from user's occupations
        const allCerts = [];
        occupationsResult.data.forEach(occupation => {
          const creds = occupation.credential_details || [];
          creds.forEach(cred => {
            if (cred.status === 'verified') {
              allCerts.push(cred.credential_name);
            }
          });
        });
        setUserCertifications(allCerts);
      }
    } catch (error) {
      console.error('Error fetching job data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleApplyToJob = async (jobId) => {
    // TODO: Implement apply to job
    console.log('Apply to job:', jobId);
  };

  const handleAcceptOffer = async (offerId) => {
    // TODO: Implement accept offer
    console.log('Accept offer:', offerId);
  };

  const handleDeclineOffer = async (offerId) => {
    // TODO: Implement decline offer
    console.log('Decline offer:', offerId);
  };

  const renderJobCard = ({ item }) => {
    const requiredCerts = item.required_certifications || [];
    const matchedCerts = requiredCerts.filter(cert => userCertifications.includes(cert));
    const missingCerts = requiredCerts.filter(cert => !userCertifications.includes(cert));

    return (
      <Card onPress={() => console.log('Job detail:', item.job_id)}>
        <View style={styles.jobHeader}>
          <View style={styles.jobHeaderLeft}>
            <Text style={styles.companyName}>{item.company_name}</Text>
            <Text style={styles.positionTitle}>{item.position_title}</Text>
          </View>
          <View style={styles.matchScore}>
            <Text style={styles.matchScoreText}>{item.match_score}%</Text>
            <Text style={styles.matchScoreLabel}>Match</Text>
          </View>
        </View>

        <View style={styles.jobDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color={colors.workforce.textLight} />
            <Text style={styles.detailText}>{item.distance} km away</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color={colors.workforce.textLight} />
            <Text style={styles.detailText}>${item.pay_per_hour}/hr</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color={colors.workforce.textLight} />
            <Text style={styles.detailText}>{item.shift_duration} hours</Text>
          </View>
        </View>

        {/* Required Certifications Section */}
        {requiredCerts.length > 0 && (
          <View style={styles.certificationsSection}>
            <View style={styles.certificationsSectionHeader}>
              <Ionicons name="medal-outline" size={16} color={colors.workforce.text} />
              <Text style={styles.certificationsSectionTitle}>Required Certifications</Text>
            </View>
            <View style={styles.certificationsContainer}>
              {requiredCerts.map((cert, index) => {
                const hasIt = userCertifications.includes(cert);
                return (
                  <View key={index} style={styles.certBadgeContainer}>
                    <Badge
                      label={cert}
                      size="small"
                      variant={hasIt ? "success" : "warning"}
                    />
                    {hasIt && (
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color={colors.success}
                        style={styles.certCheckIcon}
                      />
                    )}
                  </View>
                );
              })}
            </View>
            {missingCerts.length > 0 && (
              <Text style={styles.missingCertsNote}>
                ⚠️ You're missing {missingCerts.length} required certification{missingCerts.length > 1 ? 's' : ''}
              </Text>
            )}
          </View>
        )}

        {/* Required Skills Section */}
        {item.required_skills && item.required_skills.length > 0 && (
          <View style={styles.skillsSection}>
            <Text style={styles.skillsSectionTitle}>Required Skills</Text>
            <View style={styles.skillsContainer}>
              {item.required_skills.slice(0, 3).map((skill, index) => (
                <Badge key={index} label={skill} size="small" variant="info" />
              ))}
              {item.required_skills.length > 3 && (
                <Badge label={`+${item.required_skills.length - 3}`} size="small" />
              )}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.applyButton}
          onPress={() => handleApplyToJob(item.job_id)}
        >
          <Text style={styles.applyButtonText}>Apply Now</Text>
        </TouchableOpacity>
      </Card>
    );
  };

  const renderOfferCard = ({ item }) => (
    <Card>
      <View style={styles.offerHeader}>
        <Text style={styles.companyName}>{item.company_name}</Text>
        <Badge label="Offer" variant="success" />
      </View>
      <Text style={styles.positionTitle}>{item.position_title}</Text>

      <View style={styles.offerDetails}>
        <Text style={styles.offerLabel}>Pay Rate:</Text>
        <Text style={styles.offerValue}>${item.pay_rate}/hr</Text>
      </View>
      <View style={styles.offerDetails}>
        <Text style={styles.offerLabel}>Start Date:</Text>
        <Text style={styles.offerValue}>{item.start_date}</Text>
      </View>
      <View style={styles.offerDetails}>
        <Text style={styles.offerLabel}>Expires:</Text>
        <Text style={styles.offerExpiry}>{item.expires_in}</Text>
      </View>

      <View style={styles.offerActions}>
        <TouchableOpacity
          style={[styles.offerButton, styles.declineButton]}
          onPress={() => handleDeclineOffer(item.offer_id)}
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.offerButton, styles.acceptButton]}
          onPress={() => handleAcceptOffer(item.offer_id)}
        >
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  const handleJoinInterview = (interview) => {
    navigation.navigate('VideoCall', {
      interviewId: interview.interview_id,
      jobId: interview.job_id,
      workforceId: interview.workforce_id,
      companyName: interview.company_name,
      positionTitle: interview.position_title,
    });
  };

  const renderInterviewCard = ({ item }) => (
    <Card>
      <View style={styles.interviewHeader}>
        <Text style={styles.companyName}>{item.company_name}</Text>
        <Badge label="Interview" variant="info" />
      </View>
      <Text style={styles.positionTitle}>{item.position_title}</Text>

      <View style={styles.interviewDetails}>
        <Ionicons name="calendar-outline" size={20} color={colors.workforce.primary} />
        <Text style={styles.interviewDateTime}>{item.interview_date} at {item.interview_time}</Text>
      </View>

      {item.notes && (
        <Text style={styles.interviewNotes}>{item.notes}</Text>
      )}

      <TouchableOpacity
        style={styles.joinButton}
        onPress={() => handleJoinInterview(item)}
      >
        <Ionicons name="videocam-outline" size={20} color={colors.white} />
        <Text style={styles.joinButtonText}>Join Video Call</Text>
      </TouchableOpacity>
    </Card>
  );

  const renderEmptyState = () => {
    let icon, title, subtitle;

    switch (activeTab) {
      case 'matched':
        icon = 'briefcase-outline';
        title = 'No Matched Jobs';
        subtitle = 'Complete your profile to get matched with jobs';
        break;
      case 'offers':
        icon = 'mail-outline';
        title = 'No Job Offers';
        subtitle = 'Apply to jobs to receive offers';
        break;
      case 'interviews':
        icon = 'calendar-outline';
        title = 'No Interviews Scheduled';
        subtitle = 'You'll see interview invitations here';
        break;
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name={icon} size={64} color={colors.workforce.textMuted} />
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptySubtitle}>{subtitle}</Text>
      </View>
    );
  };

  const getActiveData = () => {
    switch (activeTab) {
      case 'matched':
        return matchedJobs;
      case 'offers':
        return jobOffers;
      case 'interviews':
        return interviews;
      default:
        return [];
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.workforce.primary} />
        </View>
      );
    }

    const data = getActiveData();

    return (
      <FlatList
        data={data}
        renderItem={
          activeTab === 'matched'
            ? renderJobCard
            : activeTab === 'offers'
            ? renderOfferCard
            : renderInterviewCard
        }
        keyExtractor={(item) =>
          item.job_id || item.offer_id || item.interview_id || Math.random().toString()
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find Jobs</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'matched' && styles.activeTab]}
          onPress={() => setActiveTab('matched')}
        >
          <Text style={[styles.tabText, activeTab === 'matched' && styles.activeTabText]}>
            Matched ({matchedJobs.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'offers' && styles.activeTab]}
          onPress={() => setActiveTab('offers')}
        >
          <Text style={[styles.tabText, activeTab === 'offers' && styles.activeTabText]}>
            Offers ({jobOffers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'interviews' && styles.activeTab]}
          onPress={() => setActiveTab('interviews')}
        >
          <Text style={[styles.tabText, activeTab === 'interviews' && styles.activeTabText]}>
            Interviews ({interviews.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {renderContent()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.workforce.background,
  },
  header: {
    padding: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.workforce.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.workforce.text,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.workforce.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.transparent,
  },
  activeTab: {
    borderBottomColor: colors.workforce.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.workforce.textLight,
  },
  activeTabText: {
    color: colors.workforce.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  jobHeaderLeft: {
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.workforce.text,
    marginBottom: 4,
  },
  positionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.workforce.primary,
  },
  matchScore: {
    alignItems: 'center',
    backgroundColor: colors.workforce.primary,
    borderRadius: 8,
    padding: 8,
    minWidth: 60,
  },
  matchScoreText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  matchScoreLabel: {
    fontSize: 10,
    color: colors.white,
  },
  jobDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    color: colors.workforce.textLight,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  applyButton: {
    backgroundColor: colors.workforce.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  offerDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  offerLabel: {
    fontSize: 14,
    color: colors.workforce.textLight,
  },
  offerValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.workforce.text,
  },
  offerExpiry: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
  offerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  offerButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.error,
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  interviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  interviewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 12,
  },
  interviewDateTime: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.workforce.text,
  },
  interviewNotes: {
    fontSize: 14,
    color: colors.workforce.textLight,
    marginBottom: 12,
  },
  joinButton: {
    flexDirection: 'row',
    backgroundColor: colors.info,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.workforce.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.workforce.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default JobsScreen;
