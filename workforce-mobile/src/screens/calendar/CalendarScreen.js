import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../../mobile-shared/components/common/Card';
import Badge from '../../../mobile-shared/components/common/Badge';
import Button from '../../../mobile-shared/components/common/Button';
import colors from '../../../mobile-shared/constants/colors';

const CalendarScreen = ({ navigation }) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [markedDates, setMarkedDates] = useState({});
  const [availability, setAvailability] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const fetchCalendarData = async () => {
    try {
      // TODO: Fetch availability and shifts from API
      // const availResult = await calendarService.getAvailability();
      // const shiftsResult = await calendarService.getMyShifts();
      
      // Mock data for now
      const mockAvailability = [
        { date: '2024-01-15', type: 'available', start_time: '09:00', end_time: '17:00' },
        { date: '2024-01-16', type: 'available', start_time: '09:00', end_time: '17:00' },
      ];
      
      const mockShifts = [
        { 
          date: '2024-01-17',
          company: 'ABC Restaurant',
          position: 'Line Cook',
          start_time: '14:00',
          end_time: '22:00',
          status: 'confirmed'
        },
      ];

      setAvailability(mockAvailability);
      setShifts(mockShifts);
      updateMarkedDates(mockAvailability, mockShifts);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateMarkedDates = (availabilityData, shiftsData) => {
    const marked = {};

    // Mark availability
    availabilityData.forEach((item) => {
      marked[item.date] = {
        marked: true,
        dotColor: colors.success,
        customStyles: {
          container: {
            backgroundColor: colors.successLight,
            borderRadius: 8,
          },
        },
      };
    });

    // Mark shifts (overrides availability if same date)
    shiftsData.forEach((item) => {
      marked[item.date] = {
        marked: true,
        dotColor: colors.info,
        customStyles: {
          container: {
            backgroundColor: colors.infoLight,
            borderRadius: 8,
          },
        },
      };
    });

    setMarkedDates(marked);
  };

  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
  };

  const handleAddAvailability = () => {
    Alert.alert('Coming Soon', 'Add availability feature is under development');
  };

  const getSelectedDateEvents = () => {
    const availEvents = availability.filter((a) => a.date === selectedDate);
    const shiftEvents = shifts.filter((s) => s.date === selectedDate);
    return { availEvents, shiftEvents };
  };

  const renderDayEvents = () => {
    if (!selectedDate) return null;

    const { availEvents, shiftEvents } = getSelectedDateEvents();

    if (availEvents.length === 0 && shiftEvents.length === 0) {
      return (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>No events for this date</Text>
          <Button
            title="Add Availability"
            onPress={handleAddAvailability}
            size="small"
            style={styles.addButton}
          />
        </Card>
      );
    }

    return (
      <View>
        {/* Availability Events */}
        {availEvents.map((event, index) => (
          <Card key={`avail-${index}`} style={styles.eventCard}>
            <View style={styles.eventHeader}>
              <View style={styles.eventHeaderLeft}>
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                <Text style={styles.eventTitle}>Available</Text>
              </View>
              <Badge label="Availability" variant="success" />
            </View>
            <View style={styles.eventTime}>
              <Ionicons name="time-outline" size={16} color={colors.workforce.textLight} />
              <Text style={styles.eventTimeText}>
                {event.start_time} - {event.end_time}
              </Text>
            </View>
          </Card>
        ))}

        {/* Shift Events */}
        {shiftEvents.map((shift, index) => (
          <Card key={`shift-${index}`} style={styles.eventCard}>
            <View style={styles.eventHeader}>
              <View style={styles.eventHeaderLeft}>
                <Ionicons name="briefcase" size={24} color={colors.info} />
                <View>
                  <Text style={styles.eventTitle}>{shift.position}</Text>
                  <Text style={styles.eventSubtitle}>{shift.company}</Text>
                </View>
              </View>
              <Badge
                label={shift.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                variant={shift.status === 'confirmed' ? 'success' : 'warning'}
              />
            </View>
            <View style={styles.eventTime}>
              <Ionicons name="time-outline" size={16} color={colors.workforce.textLight} />
              <Text style={styles.eventTimeText}>
                {shift.start_time} - {shift.end_time}
              </Text>
            </View>
            <TouchableOpacity style={styles.viewDetailsButton}>
              <Text style={styles.viewDetailsText}>View Details</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.workforce.primary} />
            </TouchableOpacity>
          </Card>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.workforce.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendar</Text>
        <TouchableOpacity onPress={handleAddAvailability}>
          <Ionicons name="add-circle-outline" size={28} color={colors.workforce.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.info }]} />
            <Text style={styles.legendText}>Shifts</Text>
          </View>
        </View>

        {/* Calendar */}
        <Calendar
          current={new Date().toISOString().split('T')[0]}
          markedDates={markedDates}
          onDayPress={handleDayPress}
          theme={{
            backgroundColor: colors.white,
            calendarBackground: colors.white,
            textSectionTitleColor: colors.workforce.textLight,
            selectedDayBackgroundColor: colors.workforce.primary,
            selectedDayTextColor: colors.white,
            todayTextColor: colors.workforce.primary,
            dayTextColor: colors.workforce.text,
            textDisabledColor: colors.workforce.textMuted,
            dotColor: colors.workforce.primary,
            selectedDotColor: colors.white,
            arrowColor: colors.workforce.primary,
            monthTextColor: colors.workforce.text,
            textMonthFontWeight: 'bold',
            textDayFontSize: 16,
            textMonthFontSize: 18,
          }}
          style={styles.calendar}
        />

        {/* Selected Date Events */}
        {selectedDate && (
          <View style={styles.eventsSection}>
            <Text style={styles.eventsTitle}>
              {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            {renderDayEvents()}
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{availability.length}</Text>
            <Text style={styles.statLabel}>Days Available</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{shifts.length}</Text>
            <Text style={styles.statLabel}>Upcoming Shifts</Text>
          </Card>
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  scrollContent: {
    padding: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    color: colors.workforce.text,
  },
  calendar: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  eventsSection: {
    marginBottom: 16,
  },
  eventsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.workforce.text,
    marginBottom: 12,
  },
  eventCard: {
    marginBottom: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.workforce.text,
  },
  eventSubtitle: {
    fontSize: 14,
    color: colors.workforce.textLight,
    marginTop: 2,
  },
  eventTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  eventTimeText: {
    fontSize: 14,
    color: colors.workforce.textLight,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.workforce.border,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.workforce.primary,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 16,
    color: colors.workforce.textLight,
    marginBottom: 16,
  },
  addButton: {
    minWidth: 150,
  },
  statsSection: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.workforce.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: colors.workforce.textLight,
  },
});

export default CalendarScreen;
