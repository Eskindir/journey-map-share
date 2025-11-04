import NotificationDemo from "@/components/NotificationDemo";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const NotificationsTest = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto py-8 space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Notification Testing</h1>
          <p className="text-muted-foreground">
            Test different notification types with custom sounds, vibrations, and visuals
          </p>
        </div>

        <NotificationDemo />

        <div className="mt-8 p-6 bg-muted/50 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold">How It Works</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              <strong className="text-foreground">🚨 SOS Emergency:</strong>
              <ul className="ml-6 mt-1 list-disc">
                <li>7 strong vibration pulses (urgent pattern)</li>
                <li>Red emergency icon with high priority</li>
                <li>Requires user interaction (won&apos;t auto-dismiss)</li>
                <li>Action buttons: "View Location" and "Call Driver"</li>
                <li>Custom emergency sound (when available)</li>
              </ul>
            </div>
            
            <div>
              <strong className="text-foreground">⚠️ Route Deviation:</strong>
              <ul className="ml-6 mt-1 list-disc">
                <li>3 medium vibration pulses</li>
                <li>Yellow warning icon</li>
                <li>Requires interaction to acknowledge</li>
                <li>Custom warning sound</li>
              </ul>
            </div>

            <div>
              <strong className="text-foreground">🕐 Delay / ✅ Arrival:</strong>
              <ul className="ml-6 mt-1 list-disc">
                <li>Short vibration pulses (non-urgent)</li>
                <li>Auto-dismiss after a few seconds</li>
                <li>Informational sounds</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> Notification appearance is controlled by your device&apos;s operating system. 
              Sounds may be limited by browser permissions. For best results, enable notifications and 
              ensure your device is not in silent mode.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsTest;
