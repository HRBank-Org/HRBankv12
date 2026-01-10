/**
 * Push Notification Utility for HR Bank PWA
 * 
 * Handles service worker registration, push subscription,
 * and notification permission management.
 */

const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY || '';

/**
 * Check if push notifications are supported
 */
export const isPushSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

/**
 * Check current notification permission status
 */
export const getNotificationPermission = () => {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

/**
 * Request notification permission from user
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    return { success: false, error: 'Notifications not supported' };
  }

  try {
    const permission = await Notification.requestPermission();
    return { success: permission === 'granted', permission };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Register service worker
 */
export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    return { success: false, error: 'Service workers not supported' };
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });
    
    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;
    
    return { success: true, registration };
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Convert VAPID key from base64 to Uint8Array
 */
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Subscribe to push notifications
 */
export const subscribeToPush = async (registration) => {
  try {
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      return { success: true, subscription, isExisting: true };
    }

    // Subscribe to push
    if (!VAPID_PUBLIC_KEY) {
      console.warn('VAPID public key not configured');
      return { success: false, error: 'Push notifications not configured' };
    }

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    return { success: true, subscription, isExisting: false };
  } catch (error) {
    console.error('Push subscription failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPush = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      return { success: true };
    }
    
    return { success: true, message: 'No active subscription' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Send subscription to backend
 */
export const sendSubscriptionToServer = async (subscription, api) => {
  try {
    const response = await api.post('/api/notifications/push-subscription', {
      subscription: subscription.toJSON()
    });
    return response.data;
  } catch (error) {
    console.error('Failed to send subscription to server:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Full push notification setup flow
 */
export const setupPushNotifications = async (api) => {
  // Check support
  if (!isPushSupported()) {
    return { 
      success: false, 
      error: 'Push notifications are not supported in this browser' 
    };
  }

  // Request permission
  const permissionResult = await requestNotificationPermission();
  if (!permissionResult.success) {
    return { 
      success: false, 
      error: 'Notification permission denied',
      permission: permissionResult.permission 
    };
  }

  // Register service worker
  const swResult = await registerServiceWorker();
  if (!swResult.success) {
    return { success: false, error: swResult.error };
  }

  // Subscribe to push
  const subscribeResult = await subscribeToPush(swResult.registration);
  if (!subscribeResult.success) {
    return { success: false, error: subscribeResult.error };
  }

  // Send to server
  if (api) {
    await sendSubscriptionToServer(subscribeResult.subscription, api);
  }

  return { 
    success: true, 
    subscription: subscribeResult.subscription,
    isNew: !subscribeResult.isExisting
  };
};

/**
 * Show a local notification (for testing)
 */
export const showLocalNotification = async (title, options = {}) => {
  if (Notification.permission !== 'granted') {
    return { success: false, error: 'Notifications not permitted' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/icons/icon-workforce-192x192.png',
      badge: '/icons/icon-workforce-192x192.png',
      vibrate: [100, 50, 100],
      ...options
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export default {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
  setupPushNotifications,
  showLocalNotification
};
