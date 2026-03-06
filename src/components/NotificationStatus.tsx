import { Bell, BellOff, Smartphone, Monitor, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Platform } from '@/lib/pushSubscription';

interface NotificationStatusProps {
  platform: Platform;
  hasPushSupport: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  notificationMessage: string;
  onRequestPermission?: () => void;
}

/**
 * Component to display notification status with graceful degradation messaging
 *
 * Shows different UI based on:
 * - Platform (iOS, Android, Desktop)
 * - Push notification support
 * - Current subscription state
 */
export function NotificationStatus({
  platform,
  hasPushSupport,
  isSubscribed,
  isLoading,
  error,
  notificationMessage,
  onRequestPermission,
}: NotificationStatusProps) {
  const getPlatformIcon = () => {
    switch (platform) {
      case 'ios':
      case 'android':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (): 'default' | 'destructive' => {
    if (error) return 'destructive';
    return 'default';
  };

  // iOS-specific messaging
  if (platform === 'ios') {
    return (
      <Alert className="bg-amber-50 border-amber-200">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <div className="flex items-center gap-2 mb-1">
            {getPlatformIcon()}
            <span className="font-medium">iOS Device Detected</span>
          </div>
          <p className="text-sm">
            {notificationMessage}
          </p>
          <p className="text-xs mt-2 text-amber-600">
            Tip: Keep this page open or check back periodically for updates.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <BellOff className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <span>{error}</span>
            {onRequestPermission && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRequestPermission}
                disabled={isLoading}
              >
                Try Again
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Alert>
        <Bell className="h-4 w-4 animate-pulse" />
        <AlertDescription>
          Setting up notifications...
        </AlertDescription>
      </Alert>
    );
  }

  // Subscribed state (Android/Desktop with push)
  if (isSubscribed && hasPushSupport) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <Bell className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <div className="flex items-center gap-2">
            {getPlatformIcon()}
            <span>{notificationMessage}</span>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Not subscribed - prompt to enable
  if (!isSubscribed && hasPushSupport && onRequestPermission) {
    return (
      <Alert>
        <BellOff className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <span>{notificationMessage}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={onRequestPermission}
              disabled={isLoading}
            >
              <Bell className="h-4 w-4 mr-2" />
              Enable
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Fallback - subscribed but no push (polling mode)
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        {notificationMessage}
      </AlertDescription>
    </Alert>
  );
}

export default NotificationStatus;
