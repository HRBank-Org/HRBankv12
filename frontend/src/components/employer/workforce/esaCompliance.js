// ESA Compliance Constants (Ontario Employment Standards Act)
export const ESA_LIMITS = {
  DAILY_MAX: 8,        // Max hours per day without agreement
  WEEKLY_OVERTIME: 44, // Overtime threshold (1.5x pay)
  WEEKLY_MAX: 48,      // Absolute max without written agreement
};

// Get availability status based on hours worked
export const getAvailabilityStatus = (weeklyHours, dailyHours = 0, hasExcessAgreement = false) => {
  const effectiveMax = hasExcessAgreement ? 60 : ESA_LIMITS.WEEKLY_MAX;
  
  if (weeklyHours >= effectiveMax) {
    return { status: 'unavailable', color: 'red', icon: '🚫', label: 'Unavailable', description: 'Weekly limit reached' };
  }
  if (weeklyHours >= ESA_LIMITS.WEEKLY_OVERTIME) {
    return { status: 'overtime', color: 'orange', icon: '🔶', label: 'Overtime', description: `${weeklyHours}h - 1.5x rate applies` };
  }
  if (weeklyHours >= 40) {
    return { status: 'approaching', color: 'amber', icon: '⚠️', label: 'Near Limit', description: `${weeklyHours}h - approaching overtime` };
  }
  if (dailyHours >= ESA_LIMITS.DAILY_MAX) {
    return { status: 'daily_limit', color: 'yellow', icon: '⏰', label: 'Daily Limit', description: 'Max daily hours reached' };
  }
  return { status: 'available', color: 'green', icon: '✅', label: 'Available', description: `${weeklyHours}h this week` };
};
