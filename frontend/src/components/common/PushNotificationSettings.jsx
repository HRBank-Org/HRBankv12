import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Smartphone, Check, AlertCircle, Loader2 } from 'lucide-react';
import { 
  isPushSupported, 
  getNotificationPermission, 
  setupPushNotifications,
  unsubscribeFromPush 
} from '../../utils/pushNotifications';
import api from '../../utils/api';

const PushNotificationSettings = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setIsSupported(isPushSupported());
    setPermission(getNotificationPermission());
    
    // Check if already subscribed
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (e) {
        console.error('Error checking subscription:', e);
      }
    }
  };

  const handleEnable = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await setupPushNotifications(api);
      
      if (result.success) {
        setIsSubscribed(true);
        setPermission('granted');
        setSuccess(result.isNew 
          ? 'Push notifications enabled! You\'ll receive updates about shifts, credentials, and more.'
          : 'Push notifications are already enabled.'
        );
      } else {
        setError(result.error || 'Failed to enable notifications');
        if (result.permission === 'denied') {
          setPermission('denied');
        }
      }
    } catch (e) {
      setError(e.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await unsubscribeFromPush();
      
      if (result.success) {
        setIsSubscribed(false);
        setSuccess('Push notifications disabled.');
        
        // Notify backend
        try {
          await api.delete('/api/notifications/push-subscription');
        } catch (e) {
          console.error('Failed to remove subscription from server:', e);
        }
      } else {
        setError(result.error || 'Failed to disable notifications');
      }
    } catch (e) {
      setError(e.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 border">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
            <BellOff className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Push Notifications</h3>
            <p className="text-gray-500 text-sm">
              Push notifications are not supported in this browser. 
              Try using Chrome, Firefox, or Safari for the best experience.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border shadow-sm">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isSubscribed ? 'bg-green-100' : 'bg-blue-100'
        }`}>
          {isSubscribed ? (
            <Bell className="w-6 h-6 text-green-600" />
          ) : (
            <Smartphone className="w-6 h-6 text-blue-600" />
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Push Notifications</h3>
            {isSubscribed && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                <Check className="w-3 h-3" />
                Enabled
              </span>
            )}
          </div>
          
          <p className="text-gray-500 text-sm mb-4">
            {isSubscribed 
              ? 'You\'ll receive notifications for new shifts, credential updates, and important alerts.'
              : 'Get instant updates about new shifts, credential verifications, and important alerts even when the app is closed.'
            }
          </p>

          {/* Permission denied warning */}
          {permission === 'denied' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-800 text-sm font-medium">Notifications Blocked</p>
                  <p className="text-amber-700 text-xs mt-1">
                    You've blocked notifications for this site. To enable them, click the lock icon 
                    in your browser's address bar and allow notifications.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <p className="text-green-800 text-sm">{success}</p>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            {isSubscribed ? (
              <button
                onClick={handleDisable}
                disabled={loading}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <BellOff className="w-4 h-4" />
                )}
                Disable Notifications
              </button>
            ) : (
              <button
                onClick={handleEnable}
                disabled={loading || permission === 'denied'}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
                Enable Notifications
              </button>
            )}
          </div>

          {/* What you'll receive */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-500 font-medium mb-2">You'll be notified about:</p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• New shift opportunities matching your profile</li>
              <li>• Credential verification updates</li>
              <li>• Shift reminders and schedule changes</li>
              <li>• Payment and earnings updates</li>
              <li>• Messages from employers</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PushNotificationSettings;
