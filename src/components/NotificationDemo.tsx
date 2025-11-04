import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, ShieldAlert, AlertTriangle, Clock, MapPin } from "lucide-react";
import { notificationService, NotificationType } from "@/lib/notifications";
import { useToast } from "@/hooks/use-toast";

const NotificationDemo = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const handleRequestPermission = async () => {
    const result = await notificationService.requestPermission();
    setPermission(result);
    
    if (result === 'granted') {
      await notificationService.initialize();
      setIsInitialized(true);
      toast({
        title: "Notifications Enabled",
        description: "You'll receive alerts about your ride",
      });
    } else {
      toast({
        title: "Notifications Blocked",
        description: "Enable notifications in your browser settings",
        variant: "destructive",
      });
    }
  };

  const testNotification = async (type: NotificationType, customBody?: string) => {
    if (permission !== 'granted') {
      toast({
        title: "Enable Notifications",
        description: "Please enable notifications first",
        variant: "destructive",
      });
      return;
    }

    await notificationService.showNotification(type, customBody);
    toast({
      title: "Notification Sent",
      description: `Test ${type} notification triggered`,
    });
  };

  const getPermissionBadge = () => {
    if (permission === 'granted') {
      return <Badge className="bg-success">Enabled</Badge>;
    } else if (permission === 'denied') {
      return <Badge variant="destructive">Blocked</Badge>;
    }
    return <Badge variant="secondary">Not Set</Badge>;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Push Notifications</CardTitle>
          {getPermissionBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {permission !== 'granted' ? (
          <div className="text-center py-6 space-y-4">
            <BellOff className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Enable notifications to receive real-time alerts about your ride
            </p>
            <Button onClick={handleRequestPermission}>
              <Bell className="h-4 w-4 mr-2" />
              Enable Notifications
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Test different notification types with custom sounds, images, and vibration patterns:
            </p>
            
            <Button
              onClick={() => testNotification('sos', 'EMERGENCY! SOS has been activated. Emergency services notified!')}
              variant="destructive"
              className="w-full justify-start"
            >
              <ShieldAlert className="h-4 w-4 mr-2" />
              🚨 SOS Emergency Alert
              <Badge className="ml-auto" variant="outline">Long Vibration</Badge>
            </Button>

            <Button
              onClick={() => testNotification('route-deviation', 'Your driver has deviated from the planned route.')}
              variant="outline"
              className="w-full justify-start border-warning text-warning hover:bg-warning/10"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              ⚠️ Route Deviation Warning
              <Badge className="ml-auto" variant="outline">Medium Vibration</Badge>
            </Button>

            <Button
              onClick={() => testNotification('delay', 'Your ride is delayed by 5 minutes due to traffic.')}
              variant="outline"
              className="w-full justify-start"
            >
              <Clock className="h-4 w-4 mr-2" />
              🕐 Delay Notice
              <Badge className="ml-auto" variant="outline">Short Vibration</Badge>
            </Button>

            <Button
              onClick={() => testNotification('arrival', 'Your driver will arrive in 2 minutes.')}
              variant="outline"
              className="w-full justify-start border-success text-success hover:bg-success/10"
            >
              <MapPin className="h-4 w-4 mr-2" />
              ✅ Arrival Notification
              <Badge className="ml-auto" variant="outline">Single Pulse</Badge>
            </Button>

            <Button
              onClick={() => testNotification('general', 'Your ride has been confirmed.')}
              variant="outline"
              className="w-full justify-start"
            >
              <Bell className="h-4 w-4 mr-2" />
              📱 General Update
              <Badge className="ml-auto" variant="outline">Standard</Badge>
            </Button>
          </div>
        )}

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="text-sm font-semibold mb-2">Notification Features:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>✓ Custom title and message for each alert type</li>
            <li>✓ Different icons and images per notification</li>
            <li>✓ Unique vibration patterns (SOS: 7 pulses, Warning: 3 pulses)</li>
            <li>✓ Custom sounds (emergency.mp3, warning.mp3, etc.)</li>
            <li>✓ Action buttons (View Location, Call Driver, Dismiss)</li>
            <li>✓ Priority levels (SOS requires interaction, others auto-dismiss)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationDemo;
