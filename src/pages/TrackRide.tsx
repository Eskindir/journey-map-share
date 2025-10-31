import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Star, MapPin, Navigation, Clock, AlertTriangle } from "lucide-react";
import MapView from "@/components/MapView";
import AlertBanner from "@/components/AlertBanner";

const TrackRide = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [timeRemaining, setTimeRemaining] = useState(20);
  const [rideStatus, setRideStatus] = useState<"on-time" | "delayed" | "deviated" | "paused">("on-time");
  const [alerts, setAlerts] = useState<string[]>([]);

  const from = searchParams.get('from') || 'Current Location';
  const to = searchParams.get('to') || 'Destination';
  const eta = parseInt(searchParams.get('eta') || '20');

  useEffect(() => {
    setTimeRemaining(eta);
    
    // Simulate countdown
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          navigate('/ride-end');
          return 0;
        }
        return prev - 1;
      });
    }, 60000); // Update every minute

    // Simulate status changes for demo
    const statusTimeout = setTimeout(() => {
      const statuses: Array<"on-time" | "delayed" | "deviated" | "paused"> = ["on-time", "delayed", "deviated"];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      setRideStatus(randomStatus);
      
      if (randomStatus === "deviated") {
        setAlerts(["Route deviation detected"]);
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(statusTimeout);
    };
  }, [eta, navigate]);

  const getStatusColor = () => {
    switch (rideStatus) {
      case "on-time": return "bg-success text-success-foreground";
      case "delayed": return "bg-warning text-warning-foreground";
      case "deviated": return "bg-warning text-warning-foreground";
      case "paused": return "bg-danger text-danger-foreground";
      default: return "bg-muted";
    }
  };

  const getStatusText = () => {
    switch (rideStatus) {
      case "on-time": return "On Time";
      case "delayed": return "Delayed";
      case "deviated": return "Route Changed";
      case "paused": return "Stopped";
      default: return "Unknown";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Alert Banners */}
      {alerts.map((alert, index) => (
        <AlertBanner key={index} message={alert} variant="warning" />
      ))}

      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <h1 className="text-xl font-semibold text-center">Tracking Ride</h1>
      </header>

      {/* Map Area */}
      <div className="h-80 relative">
        <MapView />
      </div>

      {/* Info Card - Fixed at bottom */}
      <Card className="flex-1 rounded-t-2xl -mt-6 relative z-10 border-t">
        <CardContent className="p-6 space-y-4">
          {/* Driver Info */}
          <div className="flex items-start gap-4 pb-4 border-b border-border">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              <img 
                src="/placeholder.svg" 
                alt="Driver" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">John Driver</h3>
                  <p className="text-sm text-muted-foreground">ABC-1234</p>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-warning text-warning" />
                  <span className="font-medium">4.8</span>
                </div>
              </div>
            </div>
          </div>

          {/* ETA Countdown */}
          <div className="flex items-center justify-between py-3 px-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="font-medium">ETA</span>
            </div>
            <span className="text-xl font-bold">{timeRemaining} min</span>
          </div>

          {/* Ride Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <Badge className={getStatusColor()}>
              {getStatusText()}
            </Badge>
          </div>

          {/* Pickup & Drop-off */}
          <div className="space-y-3 pt-2">
            <div className="flex gap-3">
              <div className="mt-1">
                <Navigation className="h-4 w-4 text-success" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Pickup</p>
                <p className="text-sm font-medium line-clamp-1">{from}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="mt-1">
                <MapPin className="h-4 w-4 text-danger" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Drop-off</p>
                <p className="text-sm font-medium line-clamp-1">{to}</p>
              </div>
            </div>
          </div>

          {/* Alerts Badge */}
          {alerts.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium text-warning-foreground">{alerts[0]}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1">Report Issue</Button>
            <Button variant="destructive" className="flex-1">Emergency SOS</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrackRide;
