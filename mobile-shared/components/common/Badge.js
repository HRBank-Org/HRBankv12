import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../constants/colors';

const Badge = ({
  label,
  variant = 'default', // default, success, error, warning, info, pending, verified, rejected
  size = 'medium', // small, medium, large
  style,
  textStyle,
}) => {
  const getBadgeStyle = () => {
    const baseStyle = [styles.badge, styles[`badge_${size}`]];
    
    switch (variant) {
      case 'success':
        baseStyle.push(styles.badge_success);
        break;
      case 'error':
        baseStyle.push(styles.badge_error);
        break;
      case 'warning':
        baseStyle.push(styles.badge_warning);
        break;
      case 'info':
        baseStyle.push(styles.badge_info);
        break;
      case 'pending':
        baseStyle.push(styles.badge_pending);
        break;
      case 'verified':
        baseStyle.push(styles.badge_verified);
        break;
      case 'rejected':
        baseStyle.push(styles.badge_rejected);
        break;
      case 'active':
        baseStyle.push(styles.badge_active);
        break;
      case 'inactive':
        baseStyle.push(styles.badge_inactive);
        break;
      default:
        baseStyle.push(styles.badge_default);
    }
    
    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.text, styles[`text_${size}`]];
    
    switch (variant) {
      case 'success':
        baseStyle.push(styles.text_success);
        break;
      case 'error':
        baseStyle.push(styles.text_error);
        break;
      case 'warning':
        baseStyle.push(styles.text_warning);
        break;
      case 'info':
        baseStyle.push(styles.text_info);
        break;
      case 'pending':
        baseStyle.push(styles.text_pending);
        break;
      case 'verified':
        baseStyle.push(styles.text_verified);
        break;
      case 'rejected':
        baseStyle.push(styles.text_rejected);
        break;
      case 'active':
        baseStyle.push(styles.text_active);
        break;
      case 'inactive':
        baseStyle.push(styles.text_inactive);
        break;
      default:
        baseStyle.push(styles.text_default);
    }
    
    return baseStyle;
  };

  return (
    <View style={[...getBadgeStyle(), style]}>
      <Text style={[...getTextStyle(), textStyle]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  
  // Sizes
  badge_small: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badge_medium: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badge_large: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  // Variants
  badge_default: {
    backgroundColor: colors.workforce.background,
  },
  badge_success: {
    backgroundColor: colors.successLight,
  },
  badge_error: {
    backgroundColor: colors.errorLight,
  },
  badge_warning: {
    backgroundColor: colors.warningLight,
  },
  badge_info: {
    backgroundColor: colors.infoLight,
  },
  badge_pending: {
    backgroundColor: colors.pendingBg,
  },
  badge_verified: {
    backgroundColor: colors.verifiedBg,
  },
  badge_rejected: {
    backgroundColor: colors.rejectedBg,
  },
  badge_active: {
    backgroundColor: colors.activeBg,
  },
  badge_inactive: {
    backgroundColor: colors.inactiveBg,
  },

  // Text styles
  text: {
    fontWeight: '600',
  },
  text_small: {
    fontSize: 11,
  },
  text_medium: {
    fontSize: 12,
  },
  text_large: {
    fontSize: 14,
  },
  text_default: {
    color: colors.workforce.text,
  },
  text_success: {
    color: colors.success,
  },
  text_error: {
    color: colors.error,
  },
  text_warning: {
    color: colors.warning,
  },
  text_info: {
    color: colors.info,
  },
  text_pending: {
    color: colors.pending,
  },
  text_verified: {
    color: colors.verified,
  },
  text_rejected: {
    color: colors.rejected,
  },
  text_active: {
    color: colors.active,
  },
  text_inactive: {
    color: colors.inactive,
  },
});

export default Badge;
